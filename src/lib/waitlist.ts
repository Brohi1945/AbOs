// ============================================================
//  Waitlist business logic
// ============================================================
import {
  fetchWaitlist,
  insertWaitlistEntry,
  updateWaitlistRow,
  fetchExpiredReservations,
  updateProductRow,
} from "../supabaseClient";
import { notifyWaitlistAvailable } from "./notify";

const RESERVE_HOURS = 48;

export interface Product {
  id: string;
  name: string;
  stock: number;
  reserved_stock?: number;
  threshold: number;
}

export function availableStock(product: Product): number {
  return Math.max(0, (product.stock || 0) - (product.reserved_stock || 0));
}

export async function joinWaitlist({
  product,
  customerName,
  phone,
  qty = 1,
}: {
  product: Product;
  customerName: string;
  phone: string;
  qty?: number;
}): Promise<{ position: number } | null> {
  const existing = await fetchWaitlist(product.id);
  const position = existing.filter((w: any) => w.status === "waiting").length + 1;
  const entry = await insertWaitlistEntry({
    product_id: product.id,
    customer_name: customerName,
    phone,
    qty,
    status: "waiting",
  });
  if (!entry) return null;
  return { position };
}

export async function checkAndNotifyWaitlist(
  product: Product,
  onProductUpdate?: (id: string, fields: Partial<Product>) => void
): Promise<void> {
  const spare = availableStock(product);
  if (spare <= 0) return;

  const waiting = (await fetchWaitlist(product.id)).filter((w: any) => w.status === "waiting");
  if (!waiting.length) return;

  let remaining = spare;
  let reservedNow = 0;

  for (const entry of waiting) {
    if (remaining <= 0) break;
    const offerQty = Math.min(entry.qty, remaining);
    remaining -= offerQty;
    reservedNow += offerQty;

    const reserveExpiresAt = new Date(Date.now() + RESERVE_HOURS * 3600 * 1000).toISOString();
    await updateWaitlistRow(entry.id, {
      status: "notified",
      notified_at: new Date().toISOString(),
      reserve_expires_at: reserveExpiresAt,
    });
    notifyWaitlistAvailable(product, entry.phone, entry.customer_name);
  }

  if (reservedNow > 0) {
    const newReserved = (product.reserved_stock || 0) + reservedNow;
    await updateProductRow(product.id, { reserved_stock: newReserved });
    onProductUpdate?.(product.id, { reserved_stock: newReserved });
  }
}

export async function expireStaleReservations(
  products: Product[],
  onProductUpdate?: (id: string, fields: Partial<Product>) => void
): Promise<void> {
  const stale = await fetchExpiredReservations();
  if (!stale.length) return;

  const releasedByProduct: Record<string, number> = {};
  for (const entry of stale) {
    await updateWaitlistRow(entry.id, { status: "expired" });
    releasedByProduct[entry.product_id] = (releasedByProduct[entry.product_id] || 0) + entry.qty;
  }

  for (const productId of Object.keys(releasedByProduct)) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    const newReserved = Math.max(0, (product.reserved_stock || 0) - releasedByProduct[productId]);
    await updateProductRow(productId, { reserved_stock: newReserved });
    onProductUpdate?.(productId, { reserved_stock: newReserved });
    await checkAndNotifyWaitlist({ ...product, reserved_stock: newReserved }, onProductUpdate);
  }
}

export async function convertWaitlistIfMatched(
  product: Product,
  phone: string,
  orderId: string,
  onProductUpdate?: (id: string, fields: Partial<Product>) => void
): Promise<void> {
  if (!phone) return;
  const entries = await fetchWaitlist(product.id);
  const match = entries.find((w: any) => w.status === "notified" && w.phone === phone);
  if (!match) return;

  await updateWaitlistRow(match.id, { status: "converted", order_id: orderId });
  const newReserved = Math.max(0, (product.reserved_stock || 0) - match.qty);
  await updateProductRow(product.id, { reserved_stock: newReserved });
  onProductUpdate?.(product.id, { reserved_stock: newReserved });
}

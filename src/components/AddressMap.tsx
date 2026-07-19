import React from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { mapsEmbedUrl, mapsSearchUrl } from "../lib/utils";

interface AddressMapProps {
  address: string;
  height?: number;
}

/**
 * Embeds a Google Map for a given address. Uses the key-less
 * `google.com/maps?...&output=embed` URL (no Google Maps API key
 * required), so it works out of the box on any deployment.
 */
export function AddressMap({ address, height = 160 }: AddressMapProps) {
  if (!address || !address.trim()) return null;

  return (
    <div className="rounded-xl overflow-hidden border">
      <iframe
        title={`Map — ${address}`}
        src={mapsEmbedUrl(address)}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={mapsSearchUrl(address)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-brand bg-app"
      >
        <MapPin size={12} />
        {address}
        <ExternalLink size={11} className="ml-auto" />
      </a>
    </div>
  );
}

export default AddressMap;

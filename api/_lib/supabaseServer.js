// ============================================================
//  Server-side Supabase client — for api/*.js serverless functions only.
//  These files run as plain Node (not Vite-bundled), so they read env
//  vars via process.env, not import.meta.env like the frontend does.
//  Reuses the same VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY vars —
//  Vercel exposes them to serverless functions too, no new vars needed.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

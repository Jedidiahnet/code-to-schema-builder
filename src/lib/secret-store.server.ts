// Server-only helper that reads secrets from the admin_secrets table first,
// falling back to process.env. Lets admins manage API keys from the UI.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const cache = new Map<string, { value: string; ts: number }>();
const TTL_MS = 30_000;

export async function getSecret(key: string): Promise<string | undefined> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL_MS && hit.value) return hit.value;

  const { data } = await supabaseAdmin
    .from("admin_secrets")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const dbVal = data?.value?.trim();
  if (dbVal) {
    cache.set(key, { value: dbVal, ts: now });
    return dbVal;
  }
  const envVal = process.env[key];
  if (envVal) {
    cache.set(key, { value: envVal, ts: now });
    return envVal;
  }
  return undefined;
}

export async function requireSecret(key: string): Promise<string> {
  const v = await getSecret(key);
  if (!v) throw new Error(`Missing secret: ${key}. Add it via Admin → Secrets.`);
  return v;
}

export function invalidateSecretCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

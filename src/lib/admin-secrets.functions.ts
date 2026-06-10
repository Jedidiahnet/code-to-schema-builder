import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Admin access required");
}

// List all secrets (admin only) — never returns the raw value, only a masked preview.
export const listAdminSecrets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_secrets")
      .select("key,value,description,updated_at,updated_by")
      .order("key");
    if (error) throw new Error(error.message);
    return {
      secrets: (data ?? []).map((s) => ({
        key: s.key,
        description: s.description,
        configured: !!s.value && s.value.length > 0,
        preview: s.value ? maskSecret(s.value) : "",
        updated_at: s.updated_at,
        updated_by: s.updated_by,
      })),
    };
  });

function maskSecret(v: string): string {
  if (v.length <= 6) return "•".repeat(v.length);
  return `${v.slice(0, 3)}${"•".repeat(Math.max(4, v.length - 6))}${v.slice(-3)}`;
}

// Upsert / update a secret value (admin only). Logs to audit_logs.
export const upsertAdminSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        key: z.string().min(1).max(120).regex(/^[A-Z][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE"),
        value: z.string().max(8192),
        description: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { invalidateSecretCache } = await import("./secret-store.server");

    const { error } = await supabaseAdmin.from("admin_secrets").upsert(
      {
        key: data.key,
        value: data.value,
        description: data.description ?? null,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);

    invalidateSecretCache(data.key);

    await supabaseAdmin.rpc("log_audit", {
      _actor_id: context.userId,
      _actor_email: (context.claims?.email as string | undefined) ?? "",
      _action: "secret.upsert",
      _target_type: "admin_secret",
      _target_id: data.key,
      _details: { configured: data.value.length > 0 },
    });

    return { ok: true };
  });

export const deleteAdminSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { invalidateSecretCache } = await import("./secret-store.server");
    const { error } = await supabaseAdmin.from("admin_secrets").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    invalidateSecretCache(data.key);
    await supabaseAdmin.rpc("log_audit", {
      _actor_id: context.userId,
      _actor_email: (context.claims?.email as string | undefined) ?? "",
      _action: "secret.delete",
      _target_type: "admin_secret",
      _target_id: data.key,
      _details: {},
    });
    return { ok: true };
  });

// Recent audit log (admin only)
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id,actor_email,action,target_type,target_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return { logs: rows ?? [] };
  });

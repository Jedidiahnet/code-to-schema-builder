import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PageHeader, Section } from "@/components/PageShell";
import { Bot } from "lucide-react";

const adminListAllBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin only");
    const { data: bots } = await supabaseAdmin
      .from("user_bots")
      .select("id,user_id,bot_username,bot_name,price_amount,price_currency,billing_period,is_active,platform_fee_pct,created_at")
      .order("created_at", { ascending: false });
    const ids = (bots ?? []).map((b) => b.id);
    const { data: subs } = ids.length
      ? await supabaseAdmin.from("user_bot_subscribers")
          .select("bot_id,status,amount_paid_cents,currency")
          .in("bot_id", ids)
      : { data: [] as Array<{ bot_id: string; status: string; amount_paid_cents: number; currency: string }> };
    const userIds = [...new Set((bots ?? []).map((b) => b.user_id))];
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id,email,display_name").in("id", userIds)
      : { data: [] as Array<{ id: string; email: string; display_name: string }> };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const byBot: Record<string, { subs: number; active: number; grossCents: number }> = {};
    for (const s of subs ?? []) {
      const k = (s as { bot_id: string }).bot_id;
      const row = byBot[k] ?? (byBot[k] = { subs: 0, active: 0, grossCents: 0 });
      row.subs += 1;
      if (s.status === "active") row.active += 1;
      row.grossCents += s.amount_paid_cents ?? 0;
    }
    return (bots ?? []).map((b) => ({
      ...b,
      owner: pmap.get(b.user_id) ?? null,
      stats: byBot[b.id] ?? { subs: 0, active: 0, grossCents: 0 },
    }));
  });

export const Route = createFileRoute("/_authenticated/admin/automation/bots")({
  component: AdminBotsPage,
  head: () => ({ meta: [{ title: "Connected Bots · Admin" }] }),
});

function AdminBotsPage() {
  const fn = useServerFn(adminListAllBots);
  const q = useQuery({ queryKey: ["admin-all-bots"], queryFn: () => fn() });

  return (
    <>
      <PageHeader title="Connected Telegram Bots" subtitle="Every bot users have linked to the platform, with live revenue and subscriber stats." />
      <div className="space-y-4 p-4 lg:p-8">
        <Section title={`All bots${q.data ? ` · ${q.data.length}` : ""}`}>
          {q.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {q.data?.length === 0 && (
            <div className="rounded-xl border border-border bg-card/40 p-8 text-center">
              <Bot className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">No user-connected bots yet.</p>
            </div>
          )}
          {(q.data ?? []).length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[800px] text-xs">
                <thead className="bg-background/40 text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Bot</th>
                    <th className="p-2 text-left">Owner</th>
                    <th className="p-2 text-left">Price</th>
                    <th className="p-2 text-left">Fee</th>
                    <th className="p-2 text-left">Subs</th>
                    <th className="p-2 text-left">Active</th>
                    <th className="p-2 text-left">Gross</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {q.data?.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-2"><div className="font-mono text-foreground">@{b.bot_username}</div><div className="text-muted-foreground">{b.bot_name}</div></td>
                      <td className="p-2"><div className="text-foreground">{b.owner?.display_name ?? "—"}</div><div className="text-muted-foreground">{b.owner?.email ?? "—"}</div></td>
                      <td className="p-2">{b.price_amount} {b.price_currency} <span className="text-muted-foreground">/{b.billing_period}</span></td>
                      <td className="p-2">{b.platform_fee_pct}%</td>
                      <td className="p-2">{b.stats.subs}</td>
                      <td className="p-2 text-emerald-300">{b.stats.active}</td>
                      <td className="p-2 font-mono">${(b.stats.grossCents / 100).toFixed(2)}</td>
                      <td className="p-2">{b.is_active ? <span className="text-emerald-300">active</span> : <span className="text-muted-foreground">paused</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

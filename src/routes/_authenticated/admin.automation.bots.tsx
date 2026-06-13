import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
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

    const botsRes = await supabaseAdmin
      .from("user_bots")
      .select("id,owner_id,bot_username,display_name,price_cents,currency,period_days,enabled,revshare_pct,created_at")
      .order("created_at", { ascending: false });
    const bots = botsRes.data ?? [];
    const ids = bots.map((b) => b.id);
    const subsRes = ids.length
      ? await supabaseAdmin.from("user_bot_subscribers").select("bot_id,status,paid_cents").in("bot_id", ids)
      : { data: [] };
    const subs = (subsRes.data ?? []) as Array<{ bot_id: string; status: string; paid_cents: number }>;

    const ownerIds = [...new Set(bots.map((b) => b.owner_id))];
    const profilesRes = ownerIds.length
      ? await supabaseAdmin.from("profiles").select("id,email,display_name").in("id", ownerIds)
      : { data: [] };
    const profiles = (profilesRes.data ?? []) as Array<{ id: string; email: string; display_name: string }>;
    const pmap = new Map(profiles.map((p) => [p.id, p]));

    const byBot: Record<string, { subs: number; active: number; grossCents: number }> = {};
    for (const s of subs) {
      const row = byBot[s.bot_id] ?? (byBot[s.bot_id] = { subs: 0, active: 0, grossCents: 0 });
      row.subs += 1;
      if (s.status === "active") row.active += 1;
      row.grossCents += s.paid_cents ?? 0;
    }

    return bots.map((b) => ({
      id: b.id,
      bot_username: b.bot_username,
      display_name: b.display_name,
      price_cents: b.price_cents,
      currency: b.currency,
      period_days: b.period_days,
      enabled: b.enabled,
      revshare_pct: b.revshare_pct,
      owner: pmap.get(b.owner_id) ?? null,
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
                      <td className="p-2"><div className="font-mono text-foreground">@{b.bot_username ?? "—"}</div><div className="text-muted-foreground">{b.display_name ?? "—"}</div></td>
                      <td className="p-2"><div className="text-foreground">{b.owner?.display_name ?? "—"}</div><div className="text-muted-foreground">{b.owner?.email ?? "—"}</div></td>
                      <td className="p-2">${(b.price_cents / 100).toFixed(2)} {b.currency} <span className="text-muted-foreground">/{b.period_days}d</span></td>
                      <td className="p-2">{b.revshare_pct}%</td>
                      <td className="p-2">{b.stats.subs}</td>
                      <td className="p-2 text-emerald-300">{b.stats.active}</td>
                      <td className="p-2 font-mono">${(b.stats.grossCents / 100).toFixed(2)}</td>
                      <td className="p-2">{b.enabled ? <span className="text-emerald-300">active</span> : <span className="text-muted-foreground">paused</span>}</td>
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

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { adminAssistantChat } from "@/lib/admin-ai.functions";
import { TiingoHealthMonitor } from "@/components/TiingoHealthMonitor";

// --- Server fns (admin-only) ---
const requireAdmin = async (userId: string) => {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Admin access required");
};

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,display_name,suspended,created_at,public_code")
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id,plan,status,current_period_end")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]));
    return (profiles ?? []).map((p) => ({ ...p, subscription: subMap.get(p.id) ?? null }));
  });

export const adminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const [{ count: usersCount }, { data: subs }, { data: pays }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("subscriptions").select("plan,status"),
      supabaseAdmin.from("payments").select("amount_cents,paid_at,status"),
    ]);
    const activeSubs = (subs ?? []).filter((s) => ["active", "trialing"].includes(s.status));
    const byPlan = { basic: 0, pro: 0, elite: 0, quantum: 0 } as Record<string, number>;
    activeSubs.forEach((s) => { byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1; });
    const monthAgo = Date.now() - 30 * 86400 * 1000;
    const revenueCents = (pays ?? [])
      .filter((p) => p.status === "success" && p.paid_at && new Date(p.paid_at).getTime() > monthAgo)
      .reduce((s, p) => s + p.amount_cents, 0);
    return { usersCount: usersCount ?? 0, activeSubs: activeSubs.length, byPlan, revenue30dCents: revenueCents };
  });

const setSuspendInput = z.object({ userId: z.string().uuid(), suspended: z.boolean() });
export const adminSetSuspend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setSuspendInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ suspended: data.suspended }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const setPlanInput = z.object({
  userId: z.string().uuid(),
  plan: z.enum(["basic", "pro", "elite", "quantum"]).nullable(),
});
export const adminSetPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setPlanInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    if (data.plan === null) {
      await supabaseAdmin.from("subscriptions").update({ status: "canceled" }).eq("user_id", data.userId);
    } else {
      const periodEnd = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
      await supabaseAdmin.from("subscriptions").upsert(
        { user_id: data.userId, plan: data.plan, status: "active", current_period_end: periodEnd },
        { onConflict: "user_id" },
      );
    }
    return { ok: true };
  });

// --- Page ---
export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin · Genius AI" }] }),
});

function AdminPage() {
  const usersFn = useServerFn(adminListUsers);
  const metricsFn = useServerFn(adminMetrics);
  const suspendFn = useServerFn(adminSetSuspend);
  const planFn = useServerFn(adminSetPlan);
  const qc = useQueryClient();

  const usersQ = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });
  const metricsQ = useQuery({ queryKey: ["admin-metrics"], queryFn: () => metricsFn() });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
  };

  const suspendM = useMutation({
    mutationFn: (vars: { userId: string; suspended: boolean }) => suspendFn({ data: vars }),
    onSuccess: refetch,
  });
  const planM = useMutation({
    mutationFn: (vars: { userId: string; plan: "basic" | "pro" | "elite" | "quantum" | null }) => planFn({ data: vars }),
    onSuccess: refetch,
  });

  if (usersQ.error) {
    return <main className="mx-auto max-w-4xl px-6 py-8 text-bear">Access denied.</main>;
  }

  const m = metricsQ.data;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-3xl text-glow">Admin</h1>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric label="Users" value={m?.usersCount ?? "—"} />
        <Metric label="Active subs" value={m?.activeSubs ?? "—"} />
        <Metric label="Revenue (30d)" value={m ? `$${(m.revenue30dCents / 100).toFixed(2)}` : "—"} />
        <Metric label="By plan" value={m ? `B${m.byPlan.basic ?? 0} · P${m.byPlan.pro ?? 0} · E${m.byPlan.elite ?? 0} · Q${m.byPlan.quantum ?? 0}` : "—"} />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4">
        <h2 className="px-2 font-display text-lg">Email sender domain</h2>
        <div className="mt-2 space-y-2 px-2 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Right now:</span> verification, password-reset and OTP emails go out from the default Lovable Cloud sender. They work without any domain setup — users can sign up and confirm immediately.
          </p>
          <p>
            <span className="text-foreground">When you buy your own domain</span> (e.g. <span className="font-mono">tradegenius.com</span>), open the AI chat from Lovable and say:{" "}
            <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-foreground">“Set up branded emails for tradegenius.com”</span>. The assistant will provision the sender, add DNS records, and switch auth emails to <span className="font-mono">noreply@yourdomain</span> — no code change on your side.
          </p>
          <p className="text-xs">
            You can also manage it any time under <span className="text-foreground">Lovable Cloud → Emails → Manage Domains</span>.
          </p>
        </div>
      </div>

      <TiingoHealthMonitor />

      <AdminAssistantPanel />

      <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4">
        <h2 className="px-2 font-display text-lg">Users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Plan</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(usersQ.data ?? []).map((u) => (
                <UserRow key={u.id} user={u} onSetPlan={(plan) => planM.mutate({ userId: u.id, plan })} onToggleSuspend={() => suspendM.mutate({ userId: u.id, suspended: !u.suspended })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string; actions?: { tool: string; args: string; result: string }[] };

function AdminAssistantPanel() {
  const chatFn = useServerFn(adminAssistantChat);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: ChatMessage[] = [...history, { role: "user", content: text }];
    setHistory(next);
    setBusy(true);
    try {
      const payload = next.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatFn({ data: { messages: payload } });
      setHistory((h) => [...h, { role: "assistant", content: res.reply, actions: res.actions }]);
    } catch (e) {
      setHistory((h) => [...h, { role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "Request failed"}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-primary/40 bg-card/60 p-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="font-display text-lg text-glow">⚡ Admin AI Assistant</h2>
        <span className="text-xs text-muted-foreground">Natural-language control over your platform</span>
      </div>
      <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-background/40 p-3 text-sm">
        {history.length === 0 && (
          <div className="space-y-1 text-muted-foreground">
            <p>Try commands like:</p>
            <ul className="list-disc pl-5 text-xs">
              <li>"Give TG-A8F3K2 the quantum plan for 90 days"</li>
              <li>"Suspend the user with email john@example.com"</li>
              <li>"Show me open support tickets"</li>
              <li>"Make TG-XXXXXX an admin"</li>
              <li>"How many active subscribers do we have?"</li>
            </ul>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}>
            <div className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 ${m.role === "user" ? "bg-primary/20" : "bg-muted/40"}`}>
              {m.content}
            </div>
            {m.actions && m.actions.length > 0 && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">{m.actions.length} action(s) executed</summary>
                <ul className="mt-1 space-y-1">
                  {m.actions.map((a, j) => (
                    <li key={j} className="rounded bg-background/50 p-2 font-mono">
                      <div className="text-primary">{a.tool}({a.args})</div>
                      <div className="text-muted-foreground">→ {a.result.slice(0, 200)}</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground">Thinking…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Tell the assistant what to do…"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>Send</Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  suspended: boolean;
  created_at: string;
  public_code: string | null;
  subscription: { plan: string; status: string; current_period_end: string | null } | null;
};

function UserRow({ user, onSetPlan, onToggleSuspend }: {
  user: AdminUser;
  onSetPlan: (plan: "basic" | "pro" | "elite" | "quantum" | null) => void;
  onToggleSuspend: () => void;
}) {
  const [val, setVal] = useState<string>(user.subscription?.plan ?? "none");
  return (
    <tr className="border-t border-border">
      <td className="p-2 font-mono text-xs text-primary">{user.public_code ?? "—"}</td>
      <td className="p-2">{user.email}</td>
      <td className="p-2 capitalize">{user.subscription?.plan ?? "—"}</td>
      <td className="p-2">{user.suspended ? <span className="text-bear">suspended</span> : (user.subscription?.status ?? "—")}</td>
      <td className="p-2 text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
      <td className="p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={val} onValueChange={(v) => { setVal(v); onSetPlan(v === "none" ? null : v as "basic" | "pro" | "elite" | "quantum"); }}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">none</SelectItem>
              <SelectItem value="basic">basic</SelectItem>
              <SelectItem value="pro">pro</SelectItem>
              <SelectItem value="elite">elite</SelectItem>
              <SelectItem value="quantum">quantum</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onToggleSuspend}>
            {user.suspended ? "Unsuspend" : "Suspend"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

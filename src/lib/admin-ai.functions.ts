import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Admin guard (shared with admin route) ----
async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  if (!data?.some((r) => r.role === "admin")) throw new Error("Admin access required");
}

// ---------- Tool implementations (server-side) ----------
async function tool_lookup_user(args: { query: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const q = args.query.trim();
  let row;
  if (q.toUpperCase().startsWith("TG-")) {
    const r = await supabaseAdmin.from("profiles").select("id,email,display_name,public_code,suspended,created_at").eq("public_code", q.toUpperCase()).maybeSingle();
    row = r.data;
  } else if (q.includes("@")) {
    const r = await supabaseAdmin.from("profiles").select("id,email,display_name,public_code,suspended,created_at").ilike("email", q).maybeSingle();
    row = r.data;
  } else {
    const r = await supabaseAdmin.from("profiles").select("id,email,display_name,public_code,suspended,created_at").or(`email.ilike.%${q}%,display_name.ilike.%${q}%`).limit(5);
    return { matches: r.data ?? [] };
  }
  if (!row) return { found: false };
  const [{ data: sub }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("plan,status,current_period_end").eq("user_id", row.id).maybeSingle(),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", row.id),
  ]);
  return { found: true, user: row, subscription: sub, roles: roles?.map((r) => r.role) ?? [] };
}

async function tool_suspend_user(args: { user_id: string; suspended: boolean }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("profiles").update({ suspended: args.suspended }).eq("id", args.user_id);
  if (error) throw new Error(error.message);
  return { ok: true, suspended: args.suspended };
}

async function tool_grant_plan(args: { user_id: string; plan: "basic" | "pro" | "elite" | "quantum" | null; days?: number }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (args.plan === null) {
    await supabaseAdmin.from("subscriptions").update({ status: "canceled" }).eq("user_id", args.user_id);
    return { ok: true, action: "canceled" };
  }
  const days = args.days ?? 30;
  const periodEnd = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    { user_id: args.user_id, plan: args.plan, status: "active", current_period_end: periodEnd },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true, plan: args.plan, until: periodEnd };
}

async function tool_set_role(args: { user_id: string; role: "admin" | "user"; grant: boolean }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (args.grant) {
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: args.user_id, role: args.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true, granted: args.role };
  }
  const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", args.user_id).eq("role", args.role);
  if (error) throw new Error(error.message);
  return { ok: true, revoked: args.role };
}

async function tool_list_tickets(args: { status?: "new" | "open" | "closed" }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin.from("support_messages").select("id,name,email,subject,message,status,created_at").order("created_at", { ascending: false }).limit(20);
  if (args.status) q = q.eq("status", args.status);
  const { data } = await q;
  return { tickets: data ?? [] };
}

async function tool_update_ticket(args: { ticket_id: string; status: "new" | "open" | "closed" }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("support_messages").update({ status: args.status }).eq("id", args.ticket_id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function tool_metrics() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ count: users }, { data: subs }, { data: tickets }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("subscriptions").select("plan,status"),
    supabaseAdmin.from("support_messages").select("status"),
  ]);
  const active = (subs ?? []).filter((s) => ["active", "trialing"].includes(s.status));
  return {
    users: users ?? 0,
    active_subs: active.length,
    open_tickets: (tickets ?? []).filter((t) => t.status !== "closed").length,
  };
}

const TOOLS = [
  { type: "function", function: { name: "lookup_user", description: "Find a user by email, public code (TG-XXXXXX), or name fragment.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "suspend_user", description: "Suspend or unsuspend a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, suspended: { type: "boolean" } }, required: ["user_id", "suspended"] } } },
  { type: "function", function: { name: "grant_plan", description: "Grant or cancel a subscription plan for a user (no payment required).", parameters: { type: "object", properties: { user_id: { type: "string" }, plan: { type: ["string", "null"], enum: ["basic", "pro", "elite", "quantum", null] }, days: { type: "number" } }, required: ["user_id", "plan"] } } },
  { type: "function", function: { name: "set_role", description: "Grant or revoke an admin/user role.", parameters: { type: "object", properties: { user_id: { type: "string" }, role: { type: "string", enum: ["admin", "user"] }, grant: { type: "boolean" } }, required: ["user_id", "role", "grant"] } } },
  { type: "function", function: { name: "list_tickets", description: "List recent support tickets, optionally filtered by status.", parameters: { type: "object", properties: { status: { type: "string", enum: ["new", "open", "closed"] } } } } },
  { type: "function", function: { name: "update_ticket", description: "Change a support ticket status.", parameters: { type: "object", properties: { ticket_id: { type: "string" }, status: { type: "string", enum: ["new", "open", "closed"] } }, required: ["ticket_id", "status"] } } },
  { type: "function", function: { name: "metrics", description: "Get high-level platform metrics.", parameters: { type: "object", properties: {} } } },
];

async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "lookup_user": return tool_lookup_user(args as { query: string });
    case "suspend_user": return tool_suspend_user(args as { user_id: string; suspended: boolean });
    case "grant_plan": return tool_grant_plan(args as { user_id: string; plan: "basic" | "pro" | "elite" | "quantum" | null; days?: number });
    case "set_role": return tool_set_role(args as { user_id: string; role: "admin" | "user"; grant: boolean });
    case "list_tickets": return tool_list_tickets(args as { status?: "new" | "open" | "closed" });
    case "update_ticket": return tool_update_ticket(args as { ticket_id: string; status: "new" | "open" | "closed" });
    case "metrics": return tool_metrics();
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- Server fn: chat with admin assistant ----------
type ChatMsg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string };

const chatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.union([z.string(), z.null()]).optional(),
    tool_calls: z.any().optional(),
    tool_call_id: z.string().optional(),
    name: z.string().optional(),
  })).min(1).max(40),
});

export const adminAssistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are the Trade Genius Admin Assistant. You help the founder manage their AI Forex SaaS platform.
You can lookup users, suspend/unsuspend them, grant any plan for free, change roles, manage support tickets, and read metrics.
ALWAYS confirm destructive actions in your reply with concrete details (which user, which plan).
When the user asks about "a user" without specifics, call lookup_user first.
Keep responses concise and action-oriented. Use markdown.`;

    const msgs: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...data.messages.map((m) => ({ ...m, content: m.content ?? null })),
    ];

    const actions: { tool: string; args: string; result: string }[] = [];

    // Up to 6 tool-calling rounds
    for (let round = 0; round < 6; round++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: msgs,
          tools: TOOLS,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      const choice = json.choices?.[0];
      const message = choice?.message;
      if (!message) throw new Error("No message in AI response");

      msgs.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { reply: message.content ?? "(no response)", actions };
      }

      for (const call of message.tool_calls) {
        const name = call.function?.name;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.function?.arguments ?? "{}"); } catch { /* noop */ }
        let result: unknown;
        try {
          result = await runTool(name, args);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        actions.push({ tool: name, args: JSON.stringify(args), result: JSON.stringify(result) });
        msgs.push({ role: "tool", tool_call_id: call.id, name, content: JSON.stringify(result) });
      }
    }
    return { reply: "(stopped after 6 tool rounds)", actions };
  });

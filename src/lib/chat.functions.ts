import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Ensure the calling user has a thread; return it.
export const getOrCreateMyThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("support_chat_threads")
      .select("id,status,last_message_at,unread_user")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return existing;
    const { data, error } = await supabaseAdmin
      .from("support_chat_threads")
      .insert({ user_id: userId })
      .select("id,status,last_message_at,unread_user")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

const sendInput = z.object({ thread_id: z.string().uuid(), body: z.string().trim().min(1).max(4000) });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Determine sender role and authorize via thread ownership / admin role.
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    const { data: thread } = await supabaseAdmin
      .from("support_chat_threads")
      .select("id,user_id")
      .eq("id", data.thread_id)
      .single();
    if (!thread) throw new Error("Thread not found");
    const isOwner = thread.user_id === userId;
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const sender_role = isAdmin && !isOwner ? "admin" : (isAdmin ? "admin" : "user");

    const { error: msgErr } = await supabaseAdmin.from("support_chat_messages").insert({
      thread_id: data.thread_id,
      sender_id: userId,
      sender_role,
      body: data.body,
    });
    if (msgErr) throw new Error(msgErr.message);

    // Bump thread metadata.
    const patch: { last_message_at: string; unread_admin?: number; unread_user?: number } = {
      last_message_at: new Date().toISOString(),
    };
    if (sender_role === "user") patch.unread_admin = ((thread as { unread_admin?: number }).unread_admin ?? 0) + 1;
    else patch.unread_user = ((thread as { unread_user?: number }).unread_user ?? 0) + 1;
    await supabaseAdmin.from("support_chat_threads").update(patch).eq("id", data.thread_id);

    return { ok: true };
  });

export const listMyMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { thread_id: string }) => z.object({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = !!roles?.some((r) => r.role === "admin");
    const { data: thread } = await supabaseAdmin
      .from("support_chat_threads")
      .select("user_id")
      .eq("id", data.thread_id)
      .single();
    if (!thread) throw new Error("Thread not found");
    if (!isAdmin && thread.user_id !== userId) throw new Error("Forbidden");

    const { data: msgs, error } = await supabaseAdmin
      .from("support_chat_messages")
      .select("id,sender_role,body,created_at")
      .eq("thread_id", data.thread_id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    // Mark read.
    const patch: { unread_admin?: number; unread_user?: number } = {};
    if (isAdmin) patch.unread_admin = 0;
    else patch.unread_user = 0;
    await supabaseAdmin.from("support_chat_threads").update(patch).eq("id", data.thread_id);

    return msgs ?? [];
  });

// Admin-only: list all threads with the latest message.
export const adminListThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin only");
    const { data: threads } = await supabaseAdmin
      .from("support_chat_threads")
      .select("id,user_id,status,last_message_at,unread_admin")
      .order("last_message_at", { ascending: false })
      .limit(100);
    const userIds = (threads ?? []).map((t) => t.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,display_name,public_code")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (threads ?? []).map((t) => ({ ...t, profile: pmap.get(t.user_id) ?? null }));
  });

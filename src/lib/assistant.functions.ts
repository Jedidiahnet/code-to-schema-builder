import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("assistant_conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("assistant_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: msgs ?? [] };
  });

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("assistant_conversations")
      .insert({ user_id: userId, title: "New conversation" })
      .select("id,title,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { conversation: data };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assistant_conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversation_id: z.string().uuid(), content: z.string().min(1).max(8000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Insert user message
    const { error: e1 } = await supabase.from("assistant_messages").insert({
      conversation_id: data.conversation_id,
      user_id: userId,
      role: "user",
      content: data.content,
    });
    if (e1) throw new Error(e1.message);

    // Load full history
    const { data: history } = await supabase
      .from("assistant_messages")
      .select("role,content")
      .eq("conversation_id", data.conversation_id)
      .order("created_at", { ascending: true })
      .limit(50);

    // Update title from first user message if still default
    const { data: conv } = await supabase
      .from("assistant_conversations")
      .select("title")
      .eq("id", data.conversation_id)
      .maybeSingle();
    if (conv?.title === "New conversation") {
      await supabase
        .from("assistant_conversations")
        .update({ title: data.content.slice(0, 60), updated_at: new Date().toISOString() })
        .eq("id", data.conversation_id);
    } else {
      await supabase.from("assistant_conversations").update({ updated_at: new Date().toISOString() }).eq("id", data.conversation_id);
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    let replyText = "Assistant unavailable (LOVABLE_API_KEY missing).";
    if (apiKey) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are TradSig's senior trading copilot. Reference prior conversation context. Be concise and factual. Format with markdown when helpful." },
              ...((history ?? []).map((m) => ({ role: m.role as string, content: m.content as string }))),
            ],
          }),
        });
        const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
        replyText = j.choices?.[0]?.message?.content ?? "(no response)";
      } catch (e) {
        replyText = e instanceof Error ? e.message : "Assistant error";
      }
    }

    const { data: saved, error: e2 } = await supabase
      .from("assistant_messages")
      .insert({ conversation_id: data.conversation_id, user_id: userId, role: "assistant", content: replyText })
      .select("id,role,content,created_at")
      .single();
    if (e2) throw new Error(e2.message);
    return { reply: saved };
  });

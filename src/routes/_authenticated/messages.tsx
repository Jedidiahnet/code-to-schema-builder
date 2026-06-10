import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateMyThread, listMyMessages, sendChatMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
  head: () => ({ meta: [{ title: "Messages · Genius AI" }] }),
});

type Msg = { id: string; sender_role: "user" | "admin"; body: string; created_at: string };

function MessagesPage() {
  const ensureThread = useServerFn(getOrCreateMyThread);
  const listFn = useServerFn(listMyMessages);
  const sendFn = useServerFn(sendChatMessage);
  const qc = useQueryClient();

  const threadQ = useQuery({ queryKey: ["my-thread"], queryFn: () => ensureThread() });
  const threadId = threadQ.data?.id;

  const msgsQ = useQuery({
    queryKey: ["chat-msgs", threadId],
    queryFn: () => listFn({ data: { thread_id: threadId! } }),
    enabled: !!threadId,
  });

  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Realtime: refetch on new messages for this thread.
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["chat-msgs", threadId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, qc]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [msgsQ.data]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { thread_id: threadId!, body: text.trim() } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat-msgs", threadId] });
    },
  });

  const messages: Msg[] = Array.isArray(msgsQ.data) ? (msgsQ.data as Msg[]) : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-3xl text-glow">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live chat with the Genius AI support team. Replies arrive in real time.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card/60">
        <div ref={scrollerRef} className="max-h-[60vh] min-h-[320px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">No messages yet. Say hello — a human will reply.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.sender_role === "user" ? "bg-primary/20 text-foreground" : "bg-muted/40 text-foreground"
              }`}>
                {m.sender_role === "admin" && <div className="text-[10px] uppercase tracking-wider text-primary mb-0.5">Support</div>}
                {m.body}
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim() && threadId) send.mutate(); } }}
            placeholder="Type a message…"
            rows={2}
            className="resize-none"
          />
          <Button onClick={() => send.mutate()} disabled={!text.trim() || !threadId || send.isPending}>
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </main>
  );
}

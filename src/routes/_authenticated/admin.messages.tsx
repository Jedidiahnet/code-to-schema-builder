import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminListThreads, listMyMessages, sendChatMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: AdminMessagesPage,
  head: () => ({ meta: [{ title: "Inbox · Admin" }] }),
});

type Thread = {
  id: string; user_id: string; status: string; last_message_at: string; unread_admin: number;
  profile: { id: string; email: string | null; display_name: string | null; public_code: string | null } | null;
};
type Msg = { id: string; sender_role: "user" | "admin"; body: string; created_at: string };

function AdminMessagesPage() {
  const listThreads = useServerFn(adminListThreads);
  const listMsgs = useServerFn(listMyMessages);
  const sendFn = useServerFn(sendChatMessage);
  const qc = useQueryClient();

  const threadsQ = useQuery({ queryKey: ["admin-threads"], queryFn: () => listThreads(), refetchInterval: 15000 });
  const [activeId, setActiveId] = useState<string | null>(null);
  const threads = (threadsQ.data ?? []) as Thread[];

  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const msgsQ = useQuery({
    queryKey: ["admin-msgs", activeId],
    queryFn: () => listMsgs({ data: { thread_id: activeId! } }),
    enabled: !!activeId,
  });
  const messages: Msg[] = Array.isArray(msgsQ.data) ? (msgsQ.data as Msg[]) : [];

  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`admin-chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `thread_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["admin-msgs", activeId] }),
      )
      .subscribe();
    const allCh = supabase
      .channel("admin-threads-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_chat_threads" }, () =>
        qc.invalidateQueries({ queryKey: ["admin-threads"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(allCh); };
  }, [activeId, qc]);

  useEffect(() => { scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight }); }, [messages]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { thread_id: activeId!, body: text.trim() } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["admin-msgs", activeId] }); },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-display text-3xl text-glow">Support inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live conversations with users. <Link className="text-primary underline" to="/admin">Back to admin</Link></p>

      <div className="mt-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border bg-card/60 p-2 max-h-[70vh] overflow-y-auto">
          {threads.length === 0 && <p className="p-4 text-xs text-muted-foreground">No threads yet.</p>}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left rounded-lg p-2 text-xs hover:bg-muted/40 ${activeId === t.id ? "bg-muted/60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-primary">{t.profile?.public_code ?? "—"}</span>
                {t.unread_admin > 0 && <span className="rounded bg-bear/30 px-1.5 text-[10px]">{t.unread_admin}</span>}
              </div>
              <div className="truncate text-foreground">{t.profile?.email ?? t.user_id.slice(0, 8)}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</div>
            </button>
          ))}
        </aside>

        <section className="rounded-2xl border border-border bg-card/60 flex flex-col">
          <div ref={scrollerRef} className="flex-1 max-h-[60vh] overflow-y-auto p-4 space-y-3">
            {!activeId && <p className="text-xs text-muted-foreground">Pick a conversation.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.sender_role === "admin" ? "bg-primary/20" : "bg-muted/40"
                }`}>
                  {m.body}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
          {activeId && (
            <div className="border-t border-border p-3 flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) send.mutate(); } }}
                placeholder="Reply as support…"
                rows={2}
                className="resize-none"
              />
              <Button onClick={() => send.mutate()} disabled={!text.trim() || send.isPending}>
                {send.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

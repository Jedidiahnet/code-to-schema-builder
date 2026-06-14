import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MessageSquare, Send } from "lucide-react";
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  sendAssistantMessage,
} from "@/lib/assistant.functions";

export const Route = createFileRoute("/_authenticated/dashboard/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant · TradSig" }] }),
});

function AssistantPage() {
  const list = useServerFn(listConversations);
  const get = useServerFn(getConversation);
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);
  const send = useServerFn(sendAssistantMessage);
  const qc = useQueryClient();

  const convosQ = useQuery({ queryKey: ["assistant-convos"], queryFn: () => list() });
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && convosQ.data?.conversations.length) {
      setActiveId(convosQ.data.conversations[0].id);
    }
  }, [convosQ.data, activeId]);

  const msgsQ = useQuery({
    queryKey: ["assistant-msgs", activeId],
    queryFn: () => get({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  const createM = useMutation({
    mutationFn: () => create(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["assistant-convos"] });
      setActiveId(r.conversation.id);
    },
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["assistant-convos"] });
      if (activeId === id) setActiveId(null);
    },
  });
  const sendM = useMutation({
    mutationFn: (content: string) => send({ data: { conversation_id: activeId!, content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assistant-msgs", activeId] });
      qc.invalidateQueries({ queryKey: ["assistant-convos"] });
    },
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [msgsQ.data, sendM.isPending]);

  async function submit() {
    const text = input.trim();
    if (!text || !activeId || sendM.isPending) return;
    setInput("");
    sendM.mutate(text);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="border-b border-border bg-card/40 p-3 lg:w-72 lg:border-b-0 lg:border-r">
        <Button size="sm" className="w-full" onClick={() => createM.mutate()} disabled={createM.isPending}>
          <Plus className="h-3 w-3" /> New chat
        </Button>
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto lg:max-h-none">
          {convosQ.data?.conversations.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs ${c.id === activeId ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-background/50"}`}>
              <button onClick={() => setActiveId(c.id)} className="flex flex-1 items-center gap-2 truncate text-left">
                <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </button>
              <button onClick={() => deleteM.mutate(c.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Delete">
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">Conversations are saved to your account — sign back in and they're still here.</p>
      </aside>
      <main className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!activeId ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <h1 className="font-display text-2xl text-glow">AI Assistant</h1>
              <p className="mt-2 text-xs text-muted-foreground">Create a new chat to begin.</p>
            </div>
          ) : (
            <ul className="mx-auto max-w-3xl space-y-3">
              {msgsQ.data?.messages.map((m) => (
                <li key={m.id} className={`rounded-xl border px-3 py-2 text-sm ${m.role === "user" ? "ml-auto max-w-[85%] border-primary/40 bg-primary/10" : "max-w-[90%] border-border bg-card/60"}`}>
                  <div className="mb-1 text-[10px] uppercase text-muted-foreground">{m.role}</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{m.content}</pre>
                </li>
              ))}
              {sendM.isPending && <li className="text-xs text-muted-foreground">Thinking…</li>}
            </ul>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="border-t border-border bg-background/60 p-3 lg:p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the assistant…" disabled={sendM.isPending || !activeId} />
            <Button type="submit" size="sm" disabled={sendM.isPending || !activeId || !input.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </form>
      </main>
    </div>
  );
}

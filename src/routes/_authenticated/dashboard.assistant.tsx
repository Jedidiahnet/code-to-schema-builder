import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MessageSquare, Send } from "lucide-react";

type Msg = { role: "user" | "assistant" | "system"; content: string; ts: number };
type Conversation = { id: string; title: string; updatedAt: number; messages: Msg[] };

const STORAGE_KEY = "tradsig.assistant.conversations.v1";
const ACTIVE_KEY = "tradsig.assistant.active.v1";

const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ messages: z.array(z.object({ role: z.enum(["user","assistant","system"]), content: z.string().min(1).max(8000) })).min(1).max(50) }).parse(d)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { text: "Assistant unavailable: LOVABLE_API_KEY missing.", error: true };
    const systemPrompt = "You are TradSig's senior trading copilot. Be concise, factual, and reference forex/markets terminology accurately. Refuse to fabricate live prices — tell the user to check the Live Terminal instead. Format with markdown when helpful.";
    const body = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, ...data.messages],
    };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { text: `Assistant error: HTTP ${res.status}`, error: true };
      const j = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      return { text: j.choices?.[0]?.message?.content ?? "(no response)", error: false };
    } catch (e) {
      return { text: e instanceof Error ? e.message : "Assistant request failed", error: true };
    }
  });

export const Route = createFileRoute("/_authenticated/dashboard/assistant")({
  component: AssistantPage,
  head: () => ({ meta: [{ title: "AI Assistant · TradSig" }] }),
});

function loadConvos(): Conversation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveConvos(c: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c.slice(0, 50))); } catch {}
}

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Bootstrap from localStorage exactly once.
  useEffect(() => {
    const stored = loadConvos();
    if (stored.length === 0) {
      const first: Conversation = { id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [] };
      setConvos([first]); setActiveId(first.id); saveConvos([first]);
      try { localStorage.setItem(ACTIVE_KEY, first.id); } catch {}
    } else {
      setConvos(stored);
      const saved = (typeof window !== "undefined" && localStorage.getItem(ACTIVE_KEY)) || stored[0].id;
      setActiveId(stored.some((c) => c.id === saved) ? saved : stored[0].id);
    }
  }, []);

  useEffect(() => { if (activeId) try { localStorage.setItem(ACTIVE_KEY, activeId); } catch {} }, [activeId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [activeId, convos]);
  useEffect(() => { inputRef.current?.focus(); }, [activeId, busy]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  function newConvo() {
    const c: Conversation = { id: crypto.randomUUID(), title: "New conversation", updatedAt: Date.now(), messages: [] };
    const next = [c, ...convos];
    setConvos(next); setActiveId(c.id); saveConvos(next);
  }
  function deleteConvo(id: string) {
    const next = convos.filter((c) => c.id !== id);
    setConvos(next); saveConvos(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  async function send() {
    const text = input.trim();
    if (!text || !active || busy) return;
    setBusy(true); setInput("");
    const userMsg: Msg = { role: "user", content: text, ts: Date.now() };
    const updated: Conversation = {
      ...active,
      title: active.messages.length === 0 ? text.slice(0, 40) : active.title,
      messages: [...active.messages, userMsg],
      updatedAt: Date.now(),
    };
    let next = convos.map((c) => (c.id === active.id ? updated : c));
    setConvos(next); saveConvos(next);
    try {
      const res = await ask({ data: { messages: updated.messages.map(({ role, content }) => ({ role, content })) } });
      const assistant: Msg = { role: "assistant", content: res.text, ts: Date.now() };
      const finalConv = { ...updated, messages: [...updated.messages, assistant], updatedAt: Date.now() };
      next = next.map((c) => (c.id === active.id ? finalConv : c));
      setConvos(next); saveConvos(next);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="border-b border-border bg-card/40 p-3 lg:w-72 lg:border-b-0 lg:border-r">
        <Button size="sm" className="w-full" onClick={newConvo}><Plus className="h-3 w-3" /> New chat</Button>
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto lg:max-h-none">
          {convos.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs ${c.id === activeId ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-background/50"}`}>
              <button onClick={() => setActiveId(c.id)} className="flex flex-1 items-center gap-2 truncate text-left">
                <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
              </button>
              <button onClick={() => deleteConvo(c.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Delete">
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">Conversations are saved in this browser and persist across refreshes.</p>
      </aside>
      <main className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!active || active.messages.length === 0 ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <h1 className="font-display text-2xl text-glow">AI Assistant</h1>
              <p className="mt-2 text-xs text-muted-foreground">Ask anything about strategies, signals, indicators, risk management, or your account.</p>
            </div>
          ) : (
            <ul className="mx-auto max-w-3xl space-y-3">
              {active.messages.map((m, i) => (
                <li key={i} className={`rounded-xl border px-3 py-2 text-sm ${m.role === "user" ? "ml-auto max-w-[85%] border-primary/40 bg-primary/10" : "max-w-[90%] border-border bg-card/60"}`}>
                  <div className="mb-1 text-[10px] uppercase text-muted-foreground">{m.role}</div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{m.content}</pre>
                </li>
              ))}
              {busy && <li className="text-xs text-muted-foreground">Thinking…</li>}
            </ul>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="border-t border-border bg-background/60 p-3 lg:p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the assistant…" disabled={busy || !active} />
            <Button type="submit" size="sm" disabled={busy || !active || !input.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </form>
      </main>
    </div>
  );
}

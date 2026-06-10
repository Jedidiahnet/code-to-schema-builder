import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({ meta: [{ title: "Support · Genius AI" }, { name: "description", content: "Contact Genius AI customer support for account, billing, and trading dashboard help." }] }),
});

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(2000),
});

function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert(parsed.data);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg("Message sent. Support will get back to you as soon as possible.");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen gradient-radial px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm font-display tracking-widest text-muted-foreground hover:text-foreground">GENIUS AI</Link>
        <div className="mt-10 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
          <div className="flex items-center gap-3"><MessageCircle className="h-6 w-6 text-primary" /><h1 className="font-display text-3xl text-glow">Customer support</h1></div>
          <p className="mt-3 text-sm text-muted-foreground">Send account, billing, Telegram, or dashboard questions here. Do not send payment card details or passwords.</p>
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <Textarea placeholder="How can we help?" rows={7} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            {err && <p className="text-xs text-bear">{err}</p>}
            {msg && <p className="text-xs text-bull">{msg}</p>}
            <Button disabled={busy} className="w-full">{busy ? "Sending…" : "Send message"}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({ meta: [{ title: "Sign up · Genius AI" }] }),
});

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg("Account created. Check your email for the verification code/link before signing in.");
  };

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/pricing" });
    if (res.error) { setErr(res.error.message); setBusy(false); }
  };

  return (
    <div className="min-h-screen gradient-radial flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 backdrop-blur">
        <Link to="/" className="text-sm font-display tracking-widest text-muted-foreground hover:text-foreground">GENIUS AI</Link>
        <h1 className="mt-6 font-display text-2xl text-glow">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a plan after signup to start trading.</p>

        <Button variant="outline" disabled={busy} onClick={onGoogle} className="mt-6 w-full">Continue with Google</Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="text-xs text-bear">{err}</p>}
          {msg && <p className="text-xs text-bull">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

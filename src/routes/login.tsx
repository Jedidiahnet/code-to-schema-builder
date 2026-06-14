import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: normalizeRedirect(typeof s.redirect === "string" ? s.redirect : undefined),
  }),
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in · Genius AI" }] }),
});

const schema = z.object({ email: z.string().email(), password: z.string().min(6).max(128) });

function normalizeRedirect(value?: string) {
  if (!value) return "/dashboard";
  try {
    const url = new URL(value, "https://app.local");
    return url.pathname + url.search + url.hash;
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }
}

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message.includes("Email not confirmed") ? "Please verify your email before signing in." : error.message);
      return;
    }
    navigate({ to: search.redirect || "/dashboard" });
  };

  const resendVerification = async () => {
    setErr(null); setMsg(null);
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) { setErr("Enter your email first."); return; }
    setResendBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendBusy(false);
    if (error) setErr(error.message);
    else setMsg("Verification email sent. Check your inbox for the confirmation code/link.");
  };

  const onGoogle = async () => {
    setBusy(true);
    setErr(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) { setErr(res.error.message); setBusy(false); }
  };

  return (
    <div className="min-h-screen gradient-radial flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 backdrop-blur">
        <Link to="/" className="text-sm font-display tracking-widest text-muted-foreground hover:text-foreground">GENIUS AI</Link>
        <h1 className="mt-6 font-display text-2xl text-glow">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to access your trading dashboard.</p>

        <Button variant="outline" disabled={busy} onClick={onGoogle} className="mt-6 w-full">Continue with Google</Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="text-xs text-bear">{err}</p>}
          {msg && <p className="text-xs text-bull">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <Button type="button" variant="ghost" className="mt-2 w-full text-xs" disabled={resendBusy} onClick={resendVerification}>
          {resendBusy ? "Sending…" : "Resend verification email"}
        </Button>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <Link to="/reset-password" className="hover:text-foreground">Forgot password?</Link>
          <Link to="/signup" className="hover:text-foreground">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

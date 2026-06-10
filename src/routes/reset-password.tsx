import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPage,
  head: () => ({ meta: [{ title: "Reset password · Genius AI" }] }),
});

function ResetPage() {
  // Detect whether this is a recovery callback (set new password) or just request a reset email.
  const [mode, setMode] = useState<"request" | "set">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("set");
  }, []);

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for a reset link.");
  };

  const setNew = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Password updated. You can now sign in.");
  };

  return (
    <div className="min-h-screen gradient-radial flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-8 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> GENIUS AI</Link>
        <h1 className="mt-6 font-display text-2xl text-glow">{mode === "request" ? "Forgot password" : "Set new password"}</h1>
        {mode === "request" ? (
          <form onSubmit={requestReset} className="mt-4 space-y-3">
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          </form>
        ) : (
          <form onSubmit={setNew} className="mt-4 space-y-3">
            <Input type="password" placeholder="New password (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
          </form>
        )}
        {msg && <p className="mt-3 text-xs text-bull">{msg}</p>}
        {err && <p className="mt-3 text-xs text-bear">{err}</p>}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-primary">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

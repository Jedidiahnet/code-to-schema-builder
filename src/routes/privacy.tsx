import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Privacy Policy · Genius AI" }, { name: "description", content: "Genius AI privacy policy for visitors and customers." }] }),
});

function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={[
    ["Information we collect", "We collect account details, support messages, billing status, usage activity, and trading preferences needed to operate the platform."],
    ["How we use data", "We use data to provide sign-in, subscriptions, trading analysis, Telegram delivery, support, security checks, and service improvements."],
    ["Trading data", "Signals, indicators, market pairs, and timeframes may be stored to show history and improve the product. Signals are not guaranteed financial outcomes."],
    ["Payments", "Payments are processed by Paystack. Do not send card details through support messages."],
    ["Your choices", "You can contact support to request help with account data, billing, or access questions."],
  ]} />;
}

function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <div className="min-h-screen gradient-radial px-4 py-8">
      <main className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> GENIUS AI</Link>
        <h1 className="mt-8 font-display text-3xl text-glow">{title}</h1>
        <div className="mt-6 space-y-5 text-sm text-muted-foreground">{sections.map(([h, body]) => <section key={h}><h2 className="font-display text-lg text-foreground">{h}</h2><p className="mt-2">{body}</p></section>)}</div>
      </main>
    </div>
  );
}
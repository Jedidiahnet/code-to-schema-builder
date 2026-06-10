import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({ meta: [{ title: "Terms of Service · Genius AI" }, { name: "description", content: "Genius AI terms of service and risk disclaimer." }] }),
});

function TermsPage() {
  const sections: [string, string][] = [
    ["No guaranteed signals", "Genius AI provides analytical signals and education only. BUY/SELL outputs, confidence scores, and trade timing prompts are not guaranteed and are not financial advice."],
    ["Trading risk", "Forex, crypto, commodities, and options trading can cause substantial losses. You are responsible for every trade you place."],
    ["Platform use", "Use the platform lawfully, keep your login details secure, and do not attempt to abuse support, billing, Telegram, or analysis systems."],
    ["Subscriptions", "Paid plan access depends on successful payment confirmation. Plan limits may apply to agents, analysis runs, and delivery channels."],
    ["Support", "Support can help with product, billing, and account issues, but cannot guarantee trading results or provide personal investment advice."],
  ];
  return (
    <div className="min-h-screen gradient-radial px-4 py-8">
      <main className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" /> GENIUS AI</Link>
        <h1 className="mt-8 font-display text-3xl text-glow">Terms of Service</h1>
        <div className="mt-6 space-y-5 text-sm text-muted-foreground">{sections.map(([h, body]) => <section key={h}><h2 className="font-display text-lg text-foreground">{h}</h2><p className="mt-2">{body}</p></section>)}</div>
      </main>
    </div>
  );
}
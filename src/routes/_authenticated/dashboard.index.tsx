import { createFileRoute } from "@tanstack/react-router";
import { TradingDashboard } from "@/components/TradingDashboard";
import { LiveForexTicker } from "@/components/LiveForexTicker";
import { MarketNewsTerminal } from "@/components/MarketNewsTerminal";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardIndex,
  head: () => ({
    meta: [
      { title: "Dashboard · Genius AI" },
      { name: "description", content: "Multi-agent AI trading analysis dashboard." },
    ],
  }),
});

function DashboardIndex() {
  return (
    <div>
      <TradingDashboard />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:px-6 lg:grid-cols-2">
        <LiveForexTicker />
        <MarketNewsTerminal />
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { HeroLanding } from "@/components/HeroLanding";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Genius AI — Multi-Agent Trading Analysis" },
      { name: "description", content: "5 specialized AI agents analyze Pocket Option markets and vote on high-probability BUY/SELL signals with 75–99% confidence." },
    ],
  }),
});

function Index() {
  return <HeroLanding />;
}

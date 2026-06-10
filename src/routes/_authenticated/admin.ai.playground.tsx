import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/ai/playground")({
  component: Playground,
  head: () => ({ meta: [{ title: "Model Playground · Admin" }] }),
});

function Playground() {
  const [prompt, setPrompt] = useState("You are the Risk Agent. Bias conservatively when VIX > 22.");
  const [temp, setTemp] = useState([0.6]);
  const [topP, setTopP] = useState([0.9]);

  return (
    <>
      <PageHeader title="Model Playground" subtitle="Edit prompts, tune hyperparameters, replay synthetic feeds." />
      <div className="grid gap-4 p-4 lg:grid-cols-3 lg:p-8">
        <Section title="System prompt">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={10} className="font-mono text-xs" />
          <div className="mt-3 space-y-3 text-xs">
            <div>
              <div className="flex justify-between"><span>Temperature</span><span className="font-mono">{temp[0]}</span></div>
              <Slider value={temp} onValueChange={setTemp} min={0} max={2} step={0.05} />
            </div>
            <div>
              <div className="flex justify-between"><span>Top-P</span><span className="font-mono">{topP[0]}</span></div>
              <Slider value={topP} onValueChange={setTopP} min={0} max={1} step={0.05} />
            </div>
          </div>
          <Button className="mt-3 w-full" size="sm">Run on sandbox feed</Button>
        </Section>
        <Section title="Production output">
          <pre className="h-72 overflow-auto rounded-md bg-background/60 p-3 text-[11px]">{`BUY EUR/USD\nConfidence: 78%\nReason: Bullish MA cross + risk-on sentiment.`}</pre>
        </Section>
        <Section title="Sandbox output">
          <pre className="h-72 overflow-auto rounded-md bg-background/60 p-3 text-[11px]">{`NEUTRAL EUR/USD\nConfidence: 54%\nReason: Conservative — VIX above threshold.`}</pre>
        </Section>
      </div>
    </>
  );
}

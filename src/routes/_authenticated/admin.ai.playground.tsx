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
  const [prompt, setPrompt] = useState("");
  const [temp, setTemp] = useState([0.6]);
  const [topP, setTopP] = useState([0.9]);

  return (
    <>
      <PageHeader title="Model Playground" subtitle="Draft prompts and hyperparameters before pushing them to the council." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="System prompt">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={10} placeholder="Write your system prompt…" className="font-mono text-xs" />
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
          <Button className="mt-3 w-full" size="sm" disabled>Run on sandbox (coming soon)</Button>
        </Section>
        <Section title="Output">
          <div className="grid h-72 place-items-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground">
            Sandbox runner not yet wired. Save prompts directly in Genius AI source for now.
          </div>
        </Section>
      </div>
    </>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-4 py-5 lg:px-8">
      <div>
        <h1 className="font-display text-2xl text-glow">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur", className)}>{children}</div>
  );
}

export function Stat({ label, value, delta, tone = "primary" }: {
  label: string; value: ReactNode; delta?: string; tone?: "primary" | "bull" | "bear" | "warn" | "accent";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    bull: "text-bull",
    bear: "text-bear",
    warn: "text-warn",
    accent: "text-accent",
  };
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-2xl", tones[tone])}>{value}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </Card>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

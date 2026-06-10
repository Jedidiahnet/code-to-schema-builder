import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { to: string; label: string; icon: ReactNode };
export type NavSection = { label: string; items: NavItem[] };

export function AppSidebar({
  brand,
  sections,
  footer,
}: {
  brand: ReactNode;
  sections: NavSection[];
  footer?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur lg:flex lg:flex-col">
      <div className="border-b border-border/60 px-4 py-4">{brand}</div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 text-sm">
        {sections.map((sec) => (
          <div key={sec.label}>
            <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              {sec.label}
            </div>
            <ul className="mt-2 space-y-0.5">
              {sec.items.map((it) => {
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                        active && "bg-primary/15 text-primary card-glow",
                      )}
                    >
                      <span className="grid h-5 w-5 place-items-center text-primary/80">{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-border/60 p-3">{footer}</div>}
    </aside>
  );
}

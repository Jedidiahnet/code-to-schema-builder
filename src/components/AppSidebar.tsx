import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  const NavBody = (
    <>
      <div className="border-b border-border/60 px-4 py-4 flex items-center justify-between">
        <div className="min-w-0">{brand}</div>
        <button
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
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
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                        active && "bg-primary/15 text-primary card-glow",
                      )}
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center text-primary/80">{it.icon}</span>
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <button
        className="fixed left-3 top-2.5 z-40 grid h-9 w-9 place-items-center rounded-md border border-border bg-card/80 text-foreground backdrop-blur lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border/60 bg-sidebar shadow-2xl">
            {NavBody}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur lg:flex lg:flex-col">
        {NavBody}
      </aside>
    </>
  );
}

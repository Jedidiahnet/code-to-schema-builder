import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getMyPlan } from "@/lib/subscription.functions";
import { planLabel } from "@/lib/plans";
import { AppSidebar } from "@/components/AppSidebar";
import { adminNav, userNav } from "@/components/nav-config";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.pathname || "/dashboard" } });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const fetchPlan = useServerFn(getMyPlan);
  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => fetchPlan(), enabled: !!user });

  const plan = planQ.data?.plan ?? null;
  const isAdmin = planQ.data?.isAdmin ?? false;
  const sections = isAdmin ? adminNav : userNav;

  const tone =
    plan === "quantum" ? "border-primary/80 text-primary card-glow" :
    plan === "elite" ? "border-accent/70 text-accent" :
    plan === "pro" ? "border-bull/50 text-bull" :
    plan === "basic" ? "border-warn/50 text-warn" :
    "border-border text-muted-foreground";

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        brand={
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 font-display text-xs text-primary">TS</span>
            <div>
              <div className="font-display text-sm text-glow">TRADSIG</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {isAdmin ? "Admin Console" : "Trader Terminal"}
              </div>
            </div>
          </Link>
        }
        sections={sections}
        footer={
          <div className="flex items-center justify-between text-xs">
            <span className="truncate text-muted-foreground">{user?.email}</span>
            <button onClick={async () => { await signOut(); router.navigate({ to: "/" }); }} className="text-muted-foreground hover:text-foreground" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 py-2.5 pl-16 backdrop-blur lg:pl-6 lg:px-6">
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="font-display text-xs text-glow lg:hidden">TRADSIG</Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden text-muted-foreground sm:inline">{isAdmin ? "Admin" : "Trader"}</span>
            {!isAdmin && (
              <Link to="/pricing" className={`rounded-md border px-2 py-1 font-mono text-[11px] ${tone}`}>
                {planLabel(plan).toUpperCase()}
              </Link>
            )}
            {isAdmin && (
              <Link to="/dashboard" className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">View as user</Link>
            )}
          </div>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

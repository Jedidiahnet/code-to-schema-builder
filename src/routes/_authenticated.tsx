import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, User as UserIcon, CreditCard, ShieldCheck, LayoutDashboard, MessageCircle, MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getMyPlan } from "@/lib/subscription.functions";
import { planLabel } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname || "/dashboard" },
      });
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
  const tone =
    plan === "quantum" ? "border-primary/80 text-primary shadow-[0_0_20px_-8px_hsl(var(--primary))]" :
    plan === "elite" ? "border-primary/60 text-primary" :
    plan === "pro" ? "border-bull/40 text-bull" :
    plan === "basic" ? "border-yellow-500/40 text-yellow-300" :
    "border-border text-muted-foreground";

  return (
    <div className="min-h-screen gradient-radial">
      <header className="border-b border-border/40 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link to={isAdmin ? "/admin" : "/dashboard"} className="font-display tracking-widest text-glow text-sm">
            GENIUS AI {isAdmin && <span className="ml-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">ADMIN</span>}
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {isAdmin ? (
              <>
                <NavLink to="/admin" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Admin</NavLink>
                <NavLink to="/admin/messages" icon={<MessagesSquare className="h-3.5 w-3.5" />}>Inbox</NavLink>
                <NavLink to="/admin/settings" icon={<CreditCard className="h-3.5 w-3.5" />}>Settings</NavLink>
                <NavLink to="/profile" icon={<UserIcon className="h-3.5 w-3.5" />}>Profile</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/dashboard" icon={<LayoutDashboard className="h-3.5 w-3.5" />}>Dashboard</NavLink>
                <NavLink to="/billing" icon={<CreditCard className="h-3.5 w-3.5" />}>Billing</NavLink>
                <NavLink to="/messages" icon={<MessagesSquare className="h-3.5 w-3.5" />}>Messages</NavLink>
                <NavLink to="/profile" icon={<UserIcon className="h-3.5 w-3.5" />}>Profile</NavLink>
                <NavLink to="/support" icon={<MessageCircle className="h-3.5 w-3.5" />}>Support</NavLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Link to="/pricing" className={`rounded-md border px-2 py-1 font-mono text-[11px] ${tone}`}>
                {planLabel(plan).toUpperCase()}
              </Link>
            )}
            <button
              onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
              className="flex items-center gap-1 rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavLink({ to, children, icon }: { to: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-card/60 hover:text-foreground"
      activeProps={{ className: "flex items-center gap-1.5 rounded-md bg-card/80 px-3 py-1.5 text-xs text-foreground" }}
    >
      {icon}
      {children}
    </Link>
  );
}

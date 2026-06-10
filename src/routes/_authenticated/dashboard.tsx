import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabase } from "@/integrations/supabase/client";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TradingDashboard } from "@/components/TradingDashboard";
import { LiveForexTicker } from "@/components/LiveForexTicker";
import { MarketNewsTerminal } from "@/components/MarketNewsTerminal";

// Server fn used only as a fallback safety net; the layout-level admin check above already redirects.
const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    return { isAdmin: !!data?.some((r) => r.role === "admin") };
  });

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    // Admins are never allowed on the user dashboard — auto-redirect to /admin.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    try {
      const res = await checkIsAdmin();
      if (res.isAdmin) throw redirect({ to: "/admin" });
    } catch (e) {
      // If the check itself threw a redirect, propagate; otherwise let the page render.
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · Genius AI" },
      { name: "description", content: "Multi-agent AI trading analysis dashboard." },
    ],
  }),
});

function DashboardPage() {
  return (
    <div>
      <TradingDashboard />
      <div className="mx-auto grid max-w-6xl gap-4 px-6 pb-12 lg:grid-cols-2">
        <LiveForexTicker />
        <MarketNewsTerminal />
      </div>
    </div>
  );
}

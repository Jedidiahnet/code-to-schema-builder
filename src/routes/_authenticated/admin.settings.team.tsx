import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PageHeader, Card, Section } from "@/components/PageShell";

export const adminListStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) throw new Error("Admin required");
    const { data: staff } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["admin"]);
    if (!staff?.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,display_name")
      .in("id", staff.map((s) => s.user_id));
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return staff.map((s) => ({ ...s, email: pmap.get(s.user_id)?.email ?? null, display_name: pmap.get(s.user_id)?.display_name ?? null }));
  });

export const Route = createFileRoute("/_authenticated/admin/settings/team")({
  component: Team,
  head: () => ({ meta: [{ title: "Staff · Admin" }] }),
});

function Team() {
  const fn = useServerFn(adminListStaff);
  const q = useQuery({ queryKey: ["admin-staff"], queryFn: () => fn() });
  const rows = q.data ?? [];

  return (
    <>
      <PageHeader title="Staff (RBAC)" subtitle="Users with admin role on this workspace." />
      <div className="p-4 lg:p-8">
        <Section title="Current admins">
          {rows.length === 0 ? (
            <Card className="bg-background/40 text-xs text-muted-foreground">
              {q.isLoading ? "Loading…" : "No admins yet. Use the Admin AI Assistant to grant the admin role to a user."}
            </Card>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Email</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Role</th></tr></thead>
              <tbody>{rows.map((s) => (
                <tr key={s.user_id} className="border-t border-border/40"><td className="p-2">{s.email}</td><td className="p-2">{s.display_name ?? "—"}</td><td className="p-2 capitalize">{s.role}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Section>
      </div>
    </>
  );
}

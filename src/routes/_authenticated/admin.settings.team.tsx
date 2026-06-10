import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/settings/team")({
  component: Team,
  head: () => ({ meta: [{ title: "Staff · Admin" }] }),
});

const STAFF = [
  { email: "mimmico112@gmail.com", role: "owner", last: "now" },
  { email: "support@trad.sig", role: "support", last: "2h ago" },
];

function Team() {
  return (
    <>
      <PageHeader title="Staff (RBAC)" subtitle="Invite teammates and set fine-grained permissions." />
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-8">
        <Section title="Roster">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-2 text-left">Email</th><th className="p-2">Role</th><th className="p-2">Last login</th></tr></thead>
            <tbody>{STAFF.map(s => (
              <tr key={s.email} className="border-t border-border/40"><td className="p-2">{s.email}</td><td className="p-2 text-center capitalize">{s.role}</td><td className="p-2 text-center text-xs text-muted-foreground">{s.last}</td></tr>
            ))}</tbody>
          </table>
        </Section>
        <Section title="Invite teammate">
          <div className="flex gap-2"><Input placeholder="email@company.com" /><Button>Send invite</Button></div>
          <h3 className="mt-4 text-xs uppercase text-muted-foreground">Role permissions</h3>
          <table className="mt-2 w-full text-xs">
            <thead><tr><th></th>{["Owner","Admin","Support"].map(r => <th key={r} className="p-1 text-center">{r}</th>)}</tr></thead>
            <tbody>{["View secrets","Issue comp days","Refund","Edit prompts"].map(p => (
              <tr key={p} className="border-t border-border/40"><td className="p-1">{p}</td>{[true,true,p === "Issue comp days"].map((on, i) => (
                <td key={i} className="p-1 text-center">{on ? "✓" : "—"}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </Section>
      </div>
    </>
  );
}

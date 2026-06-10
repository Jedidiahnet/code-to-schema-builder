import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Card } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { adminListUsers, adminSetSuspend, adminSetPlan } from "./admin.index";

export const Route = createFileRoute("/_authenticated/admin/users/all")({
  component: UsersDirectory,
  head: () => ({ meta: [{ title: "Users · Admin" }] }),
});

function UsersDirectory() {
  const usersFn = useServerFn(adminListUsers);
  const susp = useServerFn(adminSetSuspend);
  const planFn = useServerFn(adminSetPlan);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => usersFn() });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const suspM = useMutation({ mutationFn: (v: { userId: string; suspended: boolean }) => susp({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }) });
  const planM = useMutation({ mutationFn: (v: { userId: string; plan: "basic"|"pro"|"elite"|"quantum"|null }) => planFn({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }) });

  const rows = (q.data ?? []).filter(u => {
    if (search && !((u.email ?? "").includes(search) || (u.public_code ?? "").includes(search))) return false;
    if (filter === "suspended" && !u.suspended) return false;
    if (filter === "paid" && !u.subscription) return false;
    return true;
  });

  return (
    <>
      <PageHeader title="User Directory" subtitle="Searchable profile of every user — plan, status, sessions, impersonate." />
      <div className="space-y-4 p-4 lg:p-8">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search by email or TG code…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3 text-left">Code</th><th className="p-3 text-left">Email</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="p-3 font-mono text-xs text-primary">{u.public_code ?? "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 text-center text-xs capitalize">{u.subscription?.plan ?? "—"}</td>
                  <td className="p-3 text-center">{u.suspended ? <span className="text-bear">suspended</span> : <span className="text-bull">active</span>}</td>
                  <td className="p-3 text-center text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Select defaultValue={u.subscription?.plan ?? "none"} onValueChange={(v) => planM.mutate({ userId: u.id, plan: v === "none" ? null : v as "basic"|"pro"|"elite"|"quantum" })}>
                        <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">none</SelectItem>
                          <SelectItem value="basic">basic</SelectItem>
                          <SelectItem value="pro">pro</SelectItem>
                          <SelectItem value="elite">elite</SelectItem>
                          <SelectItem value="quantum">quantum</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => suspM.mutate({ userId: u.id, suspended: !u.suspended })}>
                        {u.suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

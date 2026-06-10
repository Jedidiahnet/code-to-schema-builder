import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Save, Trash2, Plus } from "lucide-react";
import {
  listAdminSecrets,
  upsertAdminSecret,
  deleteAdminSecret,
  listAuditLogs,
} from "@/lib/admin-secrets.functions";

export const Route = createFileRoute("/_authenticated/admin/secrets")({
  head: () => ({ meta: [{ title: "Admin · API Keys & Secrets" }] }),
  component: AdminSecretsPage,
});

function AdminSecretsPage() {
  const qc = useQueryClient();
  const fetchSecrets = useServerFn(listAdminSecrets);
  const fetchLogs = useServerFn(listAuditLogs);
  const upsertFn = useServerFn(upsertAdminSecret);
  const deleteFn = useServerFn(deleteAdminSecret);

  const secretsQ = useQuery({ queryKey: ["admin-secrets"], queryFn: () => fetchSecrets() });
  const logsQ = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetchLogs({ data: { limit: 25 } }) });

  const upsertMut = useMutation({
    mutationFn: (vars: { key: string; value: string; description?: string }) =>
      upsertFn({ data: vars }),
    onSuccess: () => {
      toast.success("Secret saved");
      qc.invalidateQueries({ queryKey: ["admin-secrets"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (key: string) => deleteFn({ data: { key } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-secrets"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="size-6" /> API Keys & Secrets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add or update third-party API keys (Paystack, Tiingo, Telegram, Stripe…). Values are stored in the
          encrypted database, hidden from non-admins, and read by server functions at runtime. Every change is audited.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="size-4" /> Add new secret</CardTitle>
          <CardDescription>Use UPPER_SNAKE_CASE (e.g. <code>STRIPE_SECRET_KEY</code>)</CardDescription>
        </CardHeader>
        <CardContent>
          <NewSecretForm onSubmit={(v) => upsertMut.mutate(v)} busy={upsertMut.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured secrets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {secretsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {secretsQ.data?.secrets.map((s) => (
            <SecretRow
              key={s.key}
              secret={s}
              onSave={(value, description) =>
                upsertMut.mutate({ key: s.key, value, description })
              }
              onDelete={() => {
                if (confirm(`Delete secret ${s.key}?`)) deleteMut.mutate(s.key);
              }}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent admin actions</CardTitle>
          <CardDescription>Audit trail (last 25 events)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {logsQ.data?.logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between border-b pb-2">
                <div>
                  <div className="font-mono text-xs">{log.action}</div>
                  <div className="text-muted-foreground text-xs">
                    {log.actor_email || "system"} → {log.target_type}/{log.target_id}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {!logsQ.data?.logs.length && (
              <p className="text-muted-foreground">No actions logged yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewSecretForm({
  onSubmit,
  busy,
}: {
  onSubmit: (v: { key: string; value: string; description?: string }) => void;
  busy: boolean;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!key.trim() || !value.trim()) return;
        onSubmit({ key: key.trim().toUpperCase(), value: value.trim(), description: description.trim() || undefined });
        setKey(""); setValue(""); setDescription("");
      }}
    >
      <Input placeholder="MY_API_KEY" value={key} onChange={(e) => setKey(e.target.value)} />
      <Input placeholder="value (will be hidden after save)" type="password" value={value} onChange={(e) => setValue(e.target.value)} />
      <Textarea
        className="sm:col-span-2"
        placeholder="Optional description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button type="submit" disabled={busy} className="sm:col-span-2">
        <Plus className="size-4" /> Add secret
      </Button>
    </form>
  );
}

type SecretRowData = {
  key: string;
  description: string | null;
  configured: boolean;
  preview: string;
  updated_at: string;
};

function SecretRow({
  secret,
  onSave,
  onDelete,
}: {
  secret: SecretRowData;
  onSave: (value: string, description?: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [description, setDescription] = useState(secret.description ?? "");

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono font-semibold">{secret.key}</code>
            {secret.configured ? (
              <Badge variant="default">Configured</Badge>
            ) : (
              <Badge variant="outline">Empty</Badge>
            )}
            {secret.configured && (
              <code className="text-xs text-muted-foreground">{secret.preview}</code>
            )}
          </div>
          {secret.description && (
            <p className="text-xs text-muted-foreground mt-1">{secret.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-3 grid gap-2">
          <Input
            type="password"
            placeholder="New value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Textarea
            rows={2}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!value.trim()) return;
              onSave(value.trim(), description.trim() || undefined);
              setValue("");
              setEditing(false);
            }}
          >
            <Save className="size-4" /> Save
          </Button>
        </div>
      )}
    </div>
  );
}

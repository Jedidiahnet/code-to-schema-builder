import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyProfile, updateMyProfile, getMyPlan } from "@/lib/subscription.functions";
import { sendTelegramTest } from "@/lib/telegram.functions";
import { planLabel } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile · Genius AI" }] }),
});

function ProfilePage() {
  const fetchProfile = useServerFn(getMyProfile);
  const fetchPlan = useServerFn(getMyPlan);
  const updateFn = useServerFn(updateMyProfile);
  const testTgFn = useServerFn(sendTelegramTest);
  const qc = useQueryClient();

  const profileQ = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });
  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => fetchPlan() });

  const [displayName, setDisplayName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [telegramName, setTelegramName] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [tgMsg, setTgMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const testTg = useMutation({
    mutationFn: () => testTgFn(),
    onSuccess: (r) => setTgMsg(r.ok ? { ok: true, text: "Test message sent — check Telegram." } : { ok: false, text: r.error }),
    onError: (e) => setTgMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" }),
  });

  useEffect(() => {
    if (profileQ.data) {
      setDisplayName(profileQ.data.display_name ?? "");
      setTelegram(profileQ.data.telegram_chat_id ?? "");
      setTelegramName((profileQ.data as { telegram_display_name?: string | null }).telegram_display_name ?? "");
    }
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({ data: {
        display_name: displayName,
        telegram_chat_id: telegram || null,
        telegram_display_name: telegramName || null,
      } }),
    onSuccess: () => {
      setSavedMsg("Saved.");
      setSaveErr(null);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setTimeout(() => setSavedMsg(null), 2500);
    },
    onError: (e) => {
      setSaveErr(e instanceof Error ? e.message : "Could not save");
      setSavedMsg(null);
    },
  });

  const plan = planQ.data?.plan ?? null;
  const telegramAllowed = plan === "pro" || plan === "elite" || plan === "quantum";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-3xl text-glow">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{profileQ.data?.email}</p>
      {profileQ.data?.public_code && (
        <p className="mt-1 text-xs text-muted-foreground">Your tracking ID: <span className="font-mono text-primary">{profileQ.data.public_code}</span></p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-6">
        <div className="grid gap-4">
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label>Telegram display name {telegramAllowed ? "" : <span className="text-xs text-muted-foreground">(Pro / Elite only)</span>}</Label>
            <Input
              value={telegramName}
              onChange={(e) => setTelegramName(e.target.value)}
              placeholder="e.g. @yourhandle or Your Name"
              disabled={!telegramAllowed}
              maxLength={80}
            />
          </div>
          <div>
            <Label>Telegram chat ID {telegramAllowed ? "" : <span className="text-xs text-muted-foreground">(Pro / Elite only)</span>}</Label>
            <Input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="e.g. 123456789"
              disabled={!telegramAllowed}
              maxLength={64}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              1. Open Telegram and message <a className="text-primary underline" href="https://t.me/userinfobot" target="_blank" rel="noreferrer">@userinfobot</a> to get your numeric ID. 2. Start a chat with our bot so it can DM you. 3. Paste the ID, save, then hit "Send test".
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button type="button" variant="outline" size="sm"
                onClick={() => testTg.mutate()}
                disabled={!telegramAllowed || testTg.isPending || !telegram}>
                {testTg.isPending ? "Sending…" : "Send test"}
              </Button>
              {tgMsg && <span className={`text-xs ${tgMsg.ok ? "text-bull" : "text-bear"}`}>{tgMsg.text}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Current plan: <span className="text-foreground">{planLabel(plan)}</span></div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
          {savedMsg && <p className="text-xs text-bull">{savedMsg}</p>}
          {saveErr && <p className="text-xs text-bear">{saveErr}</p>}
        </div>
      </div>
    </main>
  );
}

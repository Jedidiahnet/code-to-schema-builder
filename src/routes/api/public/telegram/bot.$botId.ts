import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/telegram/bot/$botId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { handleTelegramUpdate } = await import("@/lib/telegram-flow.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getSecret } = await import("@/lib/secret-store.server");

        const botId = String(params.botId);
        const headerSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";

        let token: string | undefined;
        if (botId === "admin") {
          // Platform admin bot — token from secrets store
          token = await getSecret("TELEGRAM_BOT_TOKEN");
          const expected = await getSecret("TELEGRAM_WEBHOOK_SECRET");
          if (expected && headerSecret !== expected) {
            return new Response("unauthorized", { status: 401 });
          }
        } else {
          const { data } = await supabaseAdmin
            .from("user_bots")
            .select("bot_token,webhook_secret,enabled")
            .eq("id", botId)
            .maybeSingle();
          if (!data || !data.enabled) return new Response("not found", { status: 404 });
          if (data.webhook_secret && data.webhook_secret !== headerSecret) {
            return new Response("unauthorized", { status: 401 });
          }
          token = data.bot_token as string | undefined;
        }

        if (!token) return new Response("no token", { status: 500 });

        const update = await request.json().catch(() => null);
        if (!update) return new Response("bad request", { status: 400 });

        // Always 200 to Telegram quickly; process asynchronously where possible.
        try {
          await handleTelegramUpdate(botId, token, update);
        } catch (e) {
          console.error("telegram handler error", e);
        }
        return new Response("ok");
      },
    },
  },
});

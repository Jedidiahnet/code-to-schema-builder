import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTelegramMessage } from "./telegram.server";

export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("telegram_chat_id,display_name")
      .eq("id", userId)
      .maybeSingle();
    const chatId = profile?.telegram_chat_id?.trim();
    if (!chatId) {
      return { ok: false as const, error: "Save your Telegram chat ID first." };
    }
    const res = await sendTelegramMessage(
      chatId,
      `✅ <b>Genius AI</b> connected\nHi ${profile?.display_name ?? "trader"} — your Telegram is wired up. You'll receive live signals here.`,
    );
    return res;
  });

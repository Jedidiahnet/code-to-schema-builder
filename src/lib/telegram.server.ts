// Server-only Telegram helper. Sends messages through the Lovable connector
// gateway so the bot token never lives in the database or in client code.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<SendResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey) return { ok: false, error: "LOVABLE_API_KEY not configured" };
  if (!tgKey) return { ok: false, error: "Telegram connector not linked" };
  if (!chatId) return { ok: false, error: "Missing chat_id" };

  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, error: `Telegram ${res.status}: ${body.slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

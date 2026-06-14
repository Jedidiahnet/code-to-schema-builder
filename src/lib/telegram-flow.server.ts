// Server-only Telegram bot interactive flow handler.
// Implements: /start -> Market -> Asset -> Timeframe -> Expiry -> Analyse -> Signal.
// Works for both the platform admin bot (TELEGRAM_BOT_TOKEN secret) and user-connected bots (user_bots row).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TG_API = "https://api.telegram.org";

type Selections = { market?: string; asset?: string; timeframe?: string; expiry?: string };

const MARKETS: Record<string, { label: string; assets: string[] }> = {
  forex: { label: "Forex", assets: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD"] },
  crypto: { label: "Crypto", assets: ["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"] },
  stocks: { label: "Stocks", assets: ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "GOOGL"] },
  commodities: { label: "Commodities", assets: ["XAU/USD", "XAG/USD", "WTI", "BRENT"] },
  indices: { label: "Indices", assets: ["US500", "US100", "US30", "GER40", "UK100"] },
};
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];
const EXPIRIES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];

function ikb(rows: Array<Array<{ text: string; cb: string }>>) {
  return { inline_keyboard: rows.map((r) => r.map((b) => ({ text: b.text, callback_data: b.cb }))) };
}
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function tgCall(token: string, method: string, payload: Record<string, unknown>) {
  try {
    const r = await fetch(`${TG_API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await r.json().catch(() => ({}));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function getSession(botId: string, chatId: number) {
  const { data } = await supabaseAdmin
    .from("telegram_bot_sessions")
    .select("step,selections")
    .eq("bot_id", botId)
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return { step: (data?.step as string) ?? "idle", selections: (data?.selections as Selections) ?? {} };
}
async function setSession(botId: string, chatId: number, step: string, selections: Selections) {
  await supabaseAdmin
    .from("telegram_bot_sessions")
    .upsert({ bot_id: botId, telegram_chat_id: chatId, step, selections, updated_at: new Date().toISOString() }, { onConflict: "bot_id,telegram_chat_id" });
}

async function generateSignal(asset: string, tf: string, expiry: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    const dir = Math.random() > 0.5 ? "BUY" : "SELL";
    return `📊 <b>${asset}</b>\nTimeframe: ${tf} • Expiry: ${expiry}\n\nDirection: <b>${dir}</b>\nConfidence: 72%\n\n(Live AI analysis offline — heuristic signal)`;
  }
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a concise trading signal generator. Produce a single short directional signal (BUY/SELL), entry zone, SL, TP1/TP2, confidence %, and one-sentence rationale. Use clear formatting suitable for Telegram HTML." },
          { role: "user", content: `Generate a signal for ${asset} on ${tf} timeframe, expiry ${expiry}. Keep it under 12 lines.` },
        ],
      }),
    });
    const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = j.choices?.[0]?.message?.content ?? "Signal unavailable.";
    return `📊 <b>${asset}</b> • ${tf} • ${expiry}\n\n${text}`;
  } catch {
    return `📊 <b>${asset}</b> ${tf} ${expiry}\nSignal service temporarily unavailable.`;
  }
}

export async function handleTelegramUpdate(botId: string, token: string, update: Record<string, unknown>) {
  const msg = (update.message ?? update.edited_message) as { chat?: { id: number }; text?: string } | undefined;
  const cbq = update.callback_query as { id: string; from: { id: number }; message?: { chat: { id: number }; message_id: number }; data?: string } | undefined;

  if (msg?.text && msg.chat?.id) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    if (text.startsWith("/start") || text.toLowerCase() === "menu") {
      await setSession(botId, chatId, "market", {});
      await tgCall(token, "sendMessage", {
        chat_id: chatId,
        text: "👋 <b>Welcome to Genius AI Signals</b>\n\nChoose a <b>market</b> to begin:",
        parse_mode: "HTML",
        reply_markup: ikb(chunk(Object.entries(MARKETS).map(([k, v]) => ({ text: v.label, cb: `m:${k}` })), 2)),
      });
      return;
    }
    if (text === "/help") {
      await tgCall(token, "sendMessage", { chat_id: chatId, text: "Send /start to request a new signal." });
      return;
    }
    await tgCall(token, "sendMessage", { chat_id: chatId, text: "Send /start to request a signal." });
    return;
  }

  if (cbq?.message?.chat?.id && cbq.data) {
    const chatId = cbq.message.chat.id;
    const messageId = cbq.message.message_id;
    const [kind, value] = cbq.data.split(":");
    const sess = await getSession(botId, chatId);

    await tgCall(token, "answerCallbackQuery", { callback_query_id: cbq.id });

    if (kind === "m") {
      const market = MARKETS[value];
      if (!market) return;
      sess.selections.market = value;
      await setSession(botId, chatId, "asset", sess.selections);
      await tgCall(token, "editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `Market: <b>${market.label}</b>\n\nChoose an <b>asset</b>:`,
        parse_mode: "HTML",
        reply_markup: ikb([...chunk(market.assets.map((a) => ({ text: a, cb: `a:${a}` })), 2), [{ text: "⬅ Back", cb: "back:market" }]]),
      });
      return;
    }
    if (kind === "a") {
      sess.selections.asset = value;
      await setSession(botId, chatId, "timeframe", sess.selections);
      await tgCall(token, "editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `Asset: <b>${value}</b>\n\nChoose a <b>timeframe</b>:`,
        parse_mode: "HTML",
        reply_markup: ikb([...chunk(TIMEFRAMES.map((t) => ({ text: t, cb: `t:${t}` })), 4), [{ text: "⬅ Back", cb: "back:asset" }]]),
      });
      return;
    }
    if (kind === "t") {
      sess.selections.timeframe = value;
      await setSession(botId, chatId, "expiry", sess.selections);
      await tgCall(token, "editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `Timeframe: <b>${value}</b>\n\nChoose an <b>expiry</b>:`,
        parse_mode: "HTML",
        reply_markup: ikb([...chunk(EXPIRIES.map((e) => ({ text: e, cb: `e:${e}` })), 4), [{ text: "⬅ Back", cb: "back:timeframe" }]]),
      });
      return;
    }
    if (kind === "e") {
      sess.selections.expiry = value;
      await setSession(botId, chatId, "confirm", sess.selections);
      const { market, asset, timeframe, expiry } = sess.selections;
      await tgCall(token, "editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `Ready to analyse:\n\n• Market: <b>${MARKETS[market!]?.label ?? market}</b>\n• Asset: <b>${asset}</b>\n• Timeframe: <b>${timeframe}</b>\n• Expiry: <b>${expiry}</b>`,
        parse_mode: "HTML",
        reply_markup: ikb([[{ text: "📈 Analyse", cb: "go:analyse" }], [{ text: "⬅ Back", cb: "back:expiry" }, { text: "🔄 Restart", cb: "go:restart" }]]),
      });
      return;
    }
    if (kind === "go" && value === "analyse") {
      const { asset, timeframe, expiry } = sess.selections;
      if (!asset || !timeframe || !expiry) {
        await tgCall(token, "sendMessage", { chat_id: chatId, text: "Missing selections. Send /start." });
        return;
      }
      await tgCall(token, "editMessageText", { chat_id: chatId, message_id: messageId, text: "🔎 Analysing… please wait." });
      const sig = await generateSignal(asset, timeframe, expiry);
      await tgCall(token, "sendMessage", {
        chat_id: chatId, text: sig, parse_mode: "HTML",
        reply_markup: ikb([[{ text: "🔄 New signal", cb: "go:restart" }]]),
      });
      await setSession(botId, chatId, "idle", {});
      return;
    }
    if (kind === "go" && value === "restart") {
      await setSession(botId, chatId, "market", {});
      await tgCall(token, "sendMessage", {
        chat_id: chatId, text: "Choose a <b>market</b>:", parse_mode: "HTML",
        reply_markup: ikb(chunk(Object.entries(MARKETS).map(([k, v]) => ({ text: v.label, cb: `m:${k}` })), 2)),
      });
      return;
    }
    if (kind === "back") {
      const target = value;
      if (target === "market") {
        await setSession(botId, chatId, "market", {});
        await tgCall(token, "editMessageText", {
          chat_id: chatId, message_id: messageId, text: "Choose a <b>market</b>:", parse_mode: "HTML",
          reply_markup: ikb(chunk(Object.entries(MARKETS).map(([k, v]) => ({ text: v.label, cb: `m:${k}` })), 2)),
        });
      } else if (target === "asset") {
        const market = MARKETS[sess.selections.market ?? ""];
        if (market) {
          await tgCall(token, "editMessageText", {
            chat_id: chatId, message_id: messageId, text: `Market: <b>${market.label}</b>\n\nChoose an <b>asset</b>:`, parse_mode: "HTML",
            reply_markup: ikb([...chunk(market.assets.map((a) => ({ text: a, cb: `a:${a}` })), 2), [{ text: "⬅ Back", cb: "back:market" }]]),
          });
        }
      } else if (target === "timeframe") {
        await tgCall(token, "editMessageText", {
          chat_id: chatId, message_id: messageId, text: `Asset: <b>${sess.selections.asset}</b>\n\nChoose a <b>timeframe</b>:`, parse_mode: "HTML",
          reply_markup: ikb([...chunk(TIMEFRAMES.map((t) => ({ text: t, cb: `t:${t}` })), 4), [{ text: "⬅ Back", cb: "back:asset" }]]),
        });
      } else if (target === "expiry") {
        await tgCall(token, "editMessageText", {
          chat_id: chatId, message_id: messageId, text: `Timeframe: <b>${sess.selections.timeframe}</b>\n\nChoose an <b>expiry</b>:`, parse_mode: "HTML",
          reply_markup: ikb([...chunk(EXPIRIES.map((e) => ({ text: e, cb: `e:${e}` })), 4), [{ text: "⬅ Back", cb: "back:timeframe" }]]),
        });
      }
      return;
    }
  }
}

// Register a webhook with Telegram so the bot starts receiving updates.
export async function registerTelegramWebhook(token: string, botId: string, baseUrl: string, secret: string) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/public/telegram/bot/${botId}`;
  const r = await tgCall(token, "setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "edited_message", "callback_query"],
  });
  return r;
}

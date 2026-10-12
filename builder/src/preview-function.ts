import { cleanHandle, cleanName, isStore, isTheme, themes, type StoreKey, type ThemeKey } from './persona.ts';

// POST /api/preview: a visitor opened their shop, from the start page or from a
// ready-made link. This tells whoever runs the demo, on Telegram. The bot's token
// and the chat it writes to are Pages variables, so neither is ever in a page.
// Without them this answers and does nothing.

// The shops' names for themselves, from builder/data, put in by build.mjs.
declare const STORE_LABELS: Record<StoreKey, string>;

interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

interface Context {
  request: Request;
  env: Env;
  waitUntil(promise: Promise<unknown>): void;
}

interface Opened {
  name: string;
  handle: string;
  store: StoreKey;
  theme: ThemeKey;
  via: 'form' | 'link';
}

const tenMinutes = 10 * 60 * 1000;
const perAddress = 10;
const byAddress = new Map<string, number[]>();
const lately = new Map<string, number>();

function answer(status: number): Response {
  return new Response(null, { status, headers: { 'cache-control': 'no-store' } });
}

// The same rules the shop holds a name and an ID to, so the message says what
// the shop said.
function openedOf(fields: unknown): Opened | null {
  if (fields === null || typeof fields !== 'object') return null;
  const { name, handle, store, theme, via } = fields as Record<string, unknown>;
  const cleanedName = cleanName(name);
  const cleanedHandle = cleanHandle(handle);
  if (cleanedName === null || cleanedHandle === null || !isStore(store) || !isTheme(theme)) return null;
  return { name: cleanedName, handle: cleanedHandle, store, theme, via: via === 'link' ? 'link' : 'form' };
}

// Anyone can post here, so there is a brake: the same details once in ten
// minutes, and ten messages in ten minutes from one address. Each copy of this
// function keeps its own count, so it slows a flood rather than stopping one.
function admitted(address: string, details: string, now: number): 'yes' | 'repeat' | 'too-many' {
  for (const [key, at] of lately) if (now - at >= tenMinutes) lately.delete(key);
  if (lately.has(details)) return 'repeat';
  const times = (byAddress.get(address) ?? []).filter((at) => now - at < tenMinutes);
  if (times.length >= perAddress) {
    byAddress.set(address, times);
    return 'too-many';
  }
  if (byAddress.size >= 5000) byAddress.clear();
  byAddress.set(address, [...times, now]);
  lately.set(details, now);
  return 'yes';
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The name is set as code so that Telegram never turns one into a link, and the
// Instagram ID is a link to the profile, since an ID like priya.studio would
// otherwise be taken for a website.
function messageOf(opened: Opened, origin: string): Record<string, unknown> {
  const { name, handle, store, theme, via } = opened;
  const shop = new URL(`/${store}/`, origin);
  shop.search = new URLSearchParams({ name, ig: handle, theme, quiet: '1' }).toString();
  return {
    parse_mode: 'HTML',
    text: [
      via === 'link' ? '👀 <b>A ready-made demo was opened</b>' : '🛍️ <b>Someone opened a demo shop</b>',
      `<code>${escapeHtml(name)}</code> · <a href="https://www.instagram.com/${handle}/">@${handle}</a>`,
      `${STORE_LABELS[store]} shop, ${themes[theme].label} theme`,
    ].join('\n'),
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[
        { text: 'Open their shop', url: shop.href },
        { text: 'DM on Instagram', url: `https://ig.me/m/${handle}` },
      ]],
    },
  };
}

async function send(token: string, chat: string, message: Record<string, unknown>): Promise<void> {
  const post = () => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, ...message }),
  });
  try {
    let response = await post();
    if (response.status === 429) {
      const said = await response.json().catch(() => null) as { parameters?: { retry_after?: unknown } } | null;
      const wait = Number(said?.parameters?.retry_after ?? 0);
      if (wait > 0 && wait <= 20) {
        await new Promise((resolve) => { setTimeout(resolve, wait * 1000); });
        response = await post();
      }
    }
    // Shown in the project's real-time logs: a wrong token says Unauthorized, a
    // wrong chat says chat not found. Telegram's answer never holds the token.
    if (!response.ok) console.error(`Telegram did not take the message: ${response.status} ${await response.text()}`);
  } catch (error) {
    console.error(`Telegram could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function onRequestPost(context: Context): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // Only the demo's own pages post here; a page elsewhere cannot make a
  // visitor's browser do it for them.
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin !== null && origin !== url.origin) || (site !== null && site !== 'same-origin')) return answer(403);

  if (Number(request.headers.get('content-length') ?? 0) > 2048) return answer(413);
  const body = await request.text();
  if (body.length > 2048) return answer(413);
  let fields: unknown = null;
  try {
    fields = JSON.parse(body);
  } catch {
    return answer(400);
  }
  const opened = openedOf(fields);
  if (opened === null) return answer(400);

  // Neither ever has a space in it, but one copied off a wrapped line can, and
  // Telegram then answers Not Found to everything.
  const token = (env.TELEGRAM_BOT_TOKEN ?? '').replace(/\s+/g, '');
  const chat = (env.TELEGRAM_CHAT_ID ?? '').replace(/\s+/g, '');
  if (token === '' || chat === '') return answer(204);

  const address = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const verdict = admitted(address, JSON.stringify([opened.store, opened.theme, opened.name, opened.handle]), Date.now());
  if (verdict === 'too-many') return answer(429);
  if (verdict === 'repeat') return answer(204);

  // Answered straight away; the message goes on its way after.
  context.waitUntil(send(token, chat, messageOf(opened, url.origin)));
  return answer(202);
}

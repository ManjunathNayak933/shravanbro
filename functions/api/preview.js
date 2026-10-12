// Made by builder/build.mjs from builder/src/preview-function.ts. Change that, then build again.

// <define:STORE_LABELS>
var define_STORE_LABELS_default = { health: "Health", fashion: "Fashion", beauty: "Beauty", footwear: "Footwear" };

// src/persona.ts
var themes = {
  sunshine: { label: "Sunshine", accent: "#ffc400", surface: "white" },
  rose: { label: "Rose", accent: "#d6336c", surface: "tinted" },
  ocean: { label: "Ocean", accent: "#0b6bcb", surface: "white" },
  forest: { label: "Forest", accent: "#1f7a55", surface: "tinted" },
  saffron: { label: "Saffron", accent: "#e8590c", surface: "warm" },
  grape: { label: "Grape", accent: "#7048e8", surface: "bold" },
  midnight: { label: "Midnight", accent: "#ff7a59", surface: "dark" },
  mono: { label: "Mono", accent: "#111111", surface: "white" }
};
var storeKeys = ["health", "fashion", "beauty", "footwear"];
function isTheme(value) {
  return typeof value === "string" && Object.hasOwn(themes, value);
}
function isStore(value) {
  return typeof value === "string" && storeKeys.includes(value);
}
function cleanName(value) {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").replace(/[\p{Cc}\p{Cf}<>{}]/gu, "").replace(/\s+/g, " ").trim();
  if (!/\p{L}/u.test(name) || [...name].length > 40) return null;
  return name.split(" ").map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(" ");
}
function cleanHandle(value) {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@+/, "").replace(/[/?#].*$/, "").toLowerCase();
  return /^(?!\.)(?!.*\.\.)[a-z0-9._]{1,30}$/.test(handle) && !handle.endsWith(".") ? handle : null;
}

// src/preview-function.ts
var tenMinutes = 10 * 60 * 1e3;
var perAddress = 10;
var byAddress = /* @__PURE__ */ new Map();
var lately = /* @__PURE__ */ new Map();
function answer(status) {
  return new Response(null, { status, headers: { "cache-control": "no-store" } });
}
function openedOf(fields) {
  if (fields === null || typeof fields !== "object") return null;
  const { name, handle, store, theme, via } = fields;
  const cleanedName = cleanName(name);
  const cleanedHandle = cleanHandle(handle);
  if (cleanedName === null || cleanedHandle === null || !isStore(store) || !isTheme(theme)) return null;
  return { name: cleanedName, handle: cleanedHandle, store, theme, via: via === "link" ? "link" : "form" };
}
function admitted(address, details, now) {
  for (const [key, at] of lately) if (now - at >= tenMinutes) lately.delete(key);
  if (lately.has(details)) return "repeat";
  const times = (byAddress.get(address) ?? []).filter((at) => now - at < tenMinutes);
  if (times.length >= perAddress) {
    byAddress.set(address, times);
    return "too-many";
  }
  if (byAddress.size >= 5e3) byAddress.clear();
  byAddress.set(address, [...times, now]);
  lately.set(details, now);
  return "yes";
}
var escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function messageOf(opened, origin) {
  const { name, handle, store, theme, via } = opened;
  const shop = new URL(`/${store}/`, origin);
  shop.search = new URLSearchParams({ name, ig: handle, theme, quiet: "1" }).toString();
  return {
    parse_mode: "HTML",
    text: [
      via === "link" ? "\u{1F440} <b>A ready-made demo was opened</b>" : "\u{1F6CD}\uFE0F <b>Someone opened a demo shop</b>",
      `<code>${escapeHtml(name)}</code> \xB7 <a href="https://www.instagram.com/${handle}/">@${handle}</a>`,
      `${define_STORE_LABELS_default[store]} shop, ${themes[theme].label} theme`
    ].join("\n"),
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [[
        { text: "Open their shop", url: shop.href },
        { text: "DM on Instagram", url: `https://ig.me/m/${handle}` }
      ]]
    }
  };
}
async function send(token, chat, message) {
  const post = () => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, ...message })
  });
  try {
    let response = await post();
    if (response.status === 429) {
      const said = await response.json().catch(() => null);
      const wait = Number(said?.parameters?.retry_after ?? 0);
      if (wait > 0 && wait <= 20) {
        await new Promise((resolve) => {
          setTimeout(resolve, wait * 1e3);
        });
        response = await post();
      }
    }
    if (!response.ok) console.error(`Telegram did not take the message: ${response.status} ${await response.text()}`);
  } catch (error) {
    console.error(`Telegram could not be reached: ${error instanceof Error ? error.message : String(error)}`);
  }
}
async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (origin !== null && origin !== url.origin || site !== null && site !== "same-origin") return answer(403);
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return answer(413);
  const body = await request.text();
  if (body.length > 2048) return answer(413);
  let fields = null;
  try {
    fields = JSON.parse(body);
  } catch {
    return answer(400);
  }
  const opened = openedOf(fields);
  if (opened === null) return answer(400);
  const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chat = env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (token === "" || chat === "") return answer(204);
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const verdict = admitted(address, JSON.stringify([opened.store, opened.theme, opened.name, opened.handle]), Date.now());
  if (verdict === "too-many") return answer(429);
  if (verdict === "repeat") return answer(204);
  context.waitUntil(send(token, chat, messageOf(opened, url.origin)));
  return answer(202);
}
export {
  onRequestPost
};

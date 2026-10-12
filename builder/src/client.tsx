import { createRoot } from 'react-dom/client';
import { shopTree } from './app.tsx';
import { tellOwner } from './notify.ts';
import type { PageInput } from './pages.tsx';
import {
  cleanHandle, cleanName, isStore, isTheme, linkParams, profileFromLink, readProfile, saveProfile,
} from './persona.ts';

// The bag, the wishlist and checkouts are kept per shop here, since the four
// demo shops share one address and a bag from one would be counted in another.
function keepPerShop(store: string): void {
  const own = new Set(['kubal.bag', 'kubal.saved', 'kubal.checkouts', 'kubal.signin-prompt']);
  const scoped = (key: string) => (own.has(key) ? `${key}.${store}` : key);
  const { getItem, setItem, removeItem } = Storage.prototype;
  Storage.prototype.getItem = function getScoped(key: string) { return getItem.call(this, scoped(key)); };
  Storage.prototype.setItem = function setScoped(key: string, value: string) { setItem.call(this, scoped(key), value); };
  Storage.prototype.removeItem = function removeScoped(key: string) { removeItem.call(this, scoped(key)); };
}

// Nothing here can check out or look up an order. The two addresses the shop
// posts to answer the way a live shop's would when it cannot go on.
function answerLocally(sellers: Map<string, string>): void {
  const send = window.fetch.bind(window);
  const answer = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  window.fetch = async (resource, init) => {
    const address = typeof resource === 'string' ? resource : resource instanceof URL ? resource.href : resource.url;
    const path = new URL(address, window.location.href).pathname;
    if (path === '/handoff') {
      const body = init?.body;
      const fields = new URLSearchParams(typeof body === 'string' || body instanceof URLSearchParams ? body : '');
      const seller = sellers.get(fields.get('brandId') ?? '') ?? 'the seller';
      return answer({
        error: `Checkout is off in this preview. In a live Kubal shop, this opens ${seller}'s own checkout.`,
      });
    }
    if (path === '/orders/lookup') return answer({ orders: [] });
    return send(resource, init);
  };
}

function sellersOf(page: PageInput): Map<string, string> {
  const rows: { brand_id: string; seller_name: string }[] = 'products' in page
    ? page.products
    : page.kind === 'product' ? [page.product] : [];
  return new Map(rows.map((row) => [row.brand_id, row.seller_name]));
}

// Framed by the start page, the shop is drawn for whoever is filling it in and
// redrawn as they type. Nothing here leaves the frame or is kept: a link or a
// button does nothing, and the details are only kept once they open the shop.
function preview(page: PageInput, url: URL): void {
  const root = document.getElementById('root');
  if (root === null) return;
  const shop = createRoot(root);
  const draw = (fields: Record<string, unknown>) => {
    const name = cleanName(fields.name);
    if (name === null) return;
    const handle = cleanHandle(fields.handle) ?? '';
    const theme = isTheme(fields.theme) ? fields.theme : 'sunshine';
    shop.render(shopTree(page, { name, handle, theme }, '', false).tree);
  };
  const hold = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.type === 'submit' || target?.closest('a[href], button, select, label') !== null) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener('click', hold, true);
  document.addEventListener('submit', hold, true);
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const data = event.data as { kind?: unknown; profile?: unknown } | null;
    if (data?.kind === 'kubal-demo-profile' && data.profile !== null && typeof data.profile === 'object') {
      draw(data.profile as Record<string, unknown>);
    }
  });
  keepPerShop(page.store);
  draw({ name: url.searchParams.get('name'), handle: url.searchParams.get('ig'), theme: url.searchParams.get('theme') });
  window.parent.postMessage({ kind: 'kubal-demo-ready' }, window.location.origin);
}

function start(page: PageInput): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get('preview') === '1' && window.parent !== window) {
    preview(page, url);
    return;
  }
  const store = isStore(page.store) ? page.store : 'health';
  const saved = readProfile();
  // A ready-made link names someone, and its opening is news to whoever sent it,
  // except when they open it themselves from their own message (quiet).
  const sent = url.searchParams.has('name') && url.searchParams.has('ig');
  const quiet = url.searchParams.has('quiet');
  const linked = profileFromLink(url.searchParams, store, saved);
  if (linked !== null) saveProfile(linked);
  if (linked !== null && sent && !quiet) tellOwner(linked, 'link');
  if (linked !== null || quiet) {
    for (const param of [...linkParams, 'quiet']) url.searchParams.delete(param);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  const profile = linked ?? saved;
  if (profile === null) {
    window.location.replace(`/?store=${store}&next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
    return;
  }

  // Filters lived on a shop's front page before it had pages of its own, and a
  // live shop sends those addresses on to every product; so does this one.
  if (page.kind === 'home' && url.search !== '') {
    window.location.replace(`${page.base}/all${url.search}`);
    return;
  }

  keepPerShop(store);
  answerLocally(sellersOf(page));
  for (const stale of document.head.querySelectorAll('link[rel="icon"]')) stale.remove();

  const root = document.getElementById('root');
  if (root === null) return;
  createRoot(root).render(shopTree(page, profile, url.search).tree);
}

const input = JSON.parse(document.getElementById('kubal-page')?.textContent ?? 'null') as PageInput | null;
if (input !== null) start(input);

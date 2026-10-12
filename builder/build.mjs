import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const kubal = resolve(process.env.KUBAL ?? join(here, '..', '..', 'Geetige-main'));
const storefront = join(kubal, 'apps', 'storefront');

if (!existsSync(join(storefront, 'src', 'routes', 'shop.tsx'))) {
  console.error(`No Kubal storefront at ${kubal}. Set KUBAL to the Geetige repository.`);
  process.exit(1);
}

// The storefront's own components, with react-router replaced by plain links.
const kubalPaths = {
  name: 'kubal-paths',
  setup(builder) {
    builder.onResolve({ filter: /^@kubal\// }, (args) => ({ path: join(storefront, 'src', args.path.slice(7)) }));
    builder.onResolve({ filter: /^@commerce\// }, (args) => ({
      path: join(kubal, 'packages', 'commerce', 'src', args.path.slice(10)),
    }));
    builder.onResolve({ filter: /^react-router$/ }, () => ({ path: join(here, 'src', 'router-shim.tsx') }));
  },
};

const shared = {
  bundle: true,
  jsx: 'automatic',
  nodePaths: [join(here, 'node_modules')],
  plugins: [kubalPaths],
  logLevel: 'warning',
  legalComments: 'eof',
  define: { 'process.env.NODE_ENV': '"production"' },
};

const stores = ['health', 'fashion', 'beauty', 'footwear']
  .filter((key) => existsSync(join(here, 'data', `${key}.json`)))
  .map((key) => JSON.parse(readFileSync(join(here, 'data', `${key}.json`), 'utf8')));

await build({
  ...shared,
  entryPoints: [join(here, 'src', 'client.tsx')],
  outfile: join(site, 'assets', 'client.js'),
  format: 'iife',
  target: 'es2020',
  minify: true,
});

await build({
  ...shared,
  entryPoints: [join(here, 'src', 'start.ts')],
  outfile: join(site, 'assets', 'start.js'),
  format: 'iife',
  target: 'es2020',
  minify: true,
});

const renderer = join(here, '.tmp', 'render.mjs');
await build({
  ...shared,
  entryPoints: [join(here, 'src', 'render.tsx')],
  outfile: renderer,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['react', 'react/*', 'react-dom', 'react-dom/*'],
});
const render = await import(`${pathToFileURL(renderer).href}?at=${Date.now()}`);

writeFileSync(
  join(site, 'assets', 'app.css'),
  `${readFileSync(join(storefront, 'src', 'app.css'), 'utf8').trimEnd()}\n\n${readFileSync(join(here, 'src', 'demo.css'), 'utf8')}`,
);
mkdirSync(join(site, 'fonts'), { recursive: true });
for (const font of readdirSync(join(storefront, 'public', 'fonts'))) {
  cpSync(join(storefront, 'public', 'fonts', font), join(site, 'fonts', font));
}
const panelsFonts = join(kubal, 'apps', 'panels', 'public', 'fonts');
for (const font of readdirSync(panelsFonts)) cpSync(join(panelsFonts, font), join(site, 'fonts', font));

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (mark) => `\\u${mark.charCodeAt(0).toString(16)}`);

const papers = render.papers();

// Before anything is drawn: a visitor with no details goes to the start, and
// one with them sees their own page colour while their shop is put together.
function prepaint(store) {
  return `(function(){var d=document.documentElement,k='kubal.demo.profile',p=null,s=location.search;`
    + `try{p=JSON.parse(localStorage.getItem(k))}catch(e){}`
    + `if(!p){try{p=JSON.parse(sessionStorage.getItem(k))}catch(e){}}`
    + `var q=new URLSearchParams(s),v=q.get('preview')==='1'&&window.parent!==window;`
    + `if(!v&&!(p&&p.name)&&!(q.get('name')&&q.get('ig'))){d.className+=' kd-wait';`
    + `location.replace('/?store=${store}&next='+encodeURIComponent(location.pathname+s));return}`
    + `var t=${json(papers)}[q.get('theme')||(p&&p.theme)];`
    + `if(t){d.style.background=t.paper;if(t.dark)d.style.colorScheme='dark'}`
    + `d.className+=' kd-wait';setTimeout(function(){d.classList.remove('kd-wait')},4000)})();`;
}

function documentOf({ store, head, body, page }) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"/>'
    + `<title>${escape(head.title)}</title>`
    + `<meta name="description" content="${escape(head.description)}"/>`
    + `<meta property="og:title" content="${escape(head.title)}"/>`
    + `<meta property="og:description" content="${escape(head.description)}"/>`
    + `<meta property="og:type" content="website"/>`
    + (head.image ? `<meta property="og:image" content="${escape(head.image)}"/>` : '')
    + '<meta name="robots" content="noindex, nofollow"/>'
    + '<link rel="icon" href="/favicon.svg"/>'
    + '<link rel="stylesheet" href="/assets/app.css"/>'
    + '<style>html.kd-wait #root{visibility:hidden}</style>'
    + `<script>${prepaint(store)}</script>`
    + '<script src="/assets/client.js" defer></script>'
    + `</head><body><div id="root">${body}</div>`
    + `<script id="kubal-page" type="application/json">${json(page)}</script></body></html>`;
}

function write(path, html) {
  const file = join(site, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const gridVariant = ({ product_id, title, option_values, is_buyable }) => ({ product_id, title, option_values, is_buyable });
const railRow = ({ product_id, title, images, brand_id, seller_name, price_from, mrp, discount_pct }) =>
  ({ product_id, title, images, brand_id, seller_name, price_from, mrp, discount_pct });
const byOrder = (a, b) => a.sort_order - b.sort_order || a.product_id.localeCompare(b.product_id);

function pagesOf(data) {
  const store = data.key;
  const base = `/${store}`;
  const shop = data.shop;
  const products = [...data.products].sort(byOrder);
  const variants = data.variants.map(gridVariant);
  const common = { store, base, shop };
  const name = data.meta.title;
  const pages = [];
  const add = (file, page, head) => pages.push({ file: `${store}/${file}`, page: { ...common, ...page }, head });
  const departments = [...new Set(products.map((product) => product.category))];
  const brands = [...new Map(products.map((product) => [product.brand_id, product.seller_name]))];

  add('index.html', { kind: 'home', path: '/', products, variants, collections: data.collections },
    { title: `${name} · a Kubal demo shop`, description: data.meta.description });
  add('all.html', { kind: 'grid', path: '/all', products, variants },
    { title: `All products · ${name}`, description: data.meta.description });
  add('brands.html', { kind: 'brands', path: '/brands', products },
    { title: `Brands · ${name}`, description: data.meta.description });
  add('bag.html', { kind: 'bag', path: '/bag', products, variants: data.variants },
    { title: `Bag · ${name}`, description: data.meta.description });
  add('wishlist.html', { kind: 'wishlist', path: '/wishlist', products },
    { title: `Wishlist · ${name}`, description: data.meta.description });
  add('404.html', { kind: 'missing', path: '/404' },
    { title: `Not in this preview · ${name}`, description: data.meta.description });
  for (const category of departments) {
    add(`c/${category}.html`, { kind: 'grid', path: `/c/${category}`, products, variants, category },
      { title: `${category[0].toUpperCase()}${category.slice(1)} · ${name}`, description: data.meta.description });
  }
  for (const [brandId, seller] of brands) {
    add(`brand/${brandId}.html`, { kind: 'grid', path: `/brand/${brandId}`, products, variants, brandId },
      { title: `${seller} · ${name}`, description: data.meta.description });
  }
  for (const collection of data.collections) {
    add(`collections/${collection.slug}.html`,
      { kind: 'grid', path: `/collections/${collection.slug}`, products, variants, collection },
      { title: `${name} · a Kubal demo shop`, description: data.meta.description });
  }
  for (const product of products) {
    const detail = data.details[product.product_id];
    const own = data.variants.filter((variant) => variant.product_id === product.product_id)
      .map(({ variant_id, title, price, option_values, is_buyable }) => ({ variant_id, title, price, option_values, is_buyable }));
    add(`p/${product.product_id}.html`, {
      kind: 'product',
      path: `/p/${product.product_id}`,
      product: {
        product_id: product.product_id,
        brand_id: product.brand_id,
        title: product.title,
        images: product.images,
        seller_name: product.seller_name,
        price_from: product.price_from,
        mrp: product.mrp,
        discount_pct: product.discount_pct,
        category: product.category,
        description: null, video_url: null, materials: null, care_instructions: null, specifications: null,
        size_chart_url: null, creator_note: null, coupon_code: null,
        ...detail.product,
      },
      variants: own,
      seller: detail.seller,
      rules: { legal_name: detail.seller.legal_name, lm_mrp: product.mrp ?? product.price_from, ...detail.rules },
      sameBrand: products.filter((row) => row.brand_id === product.brand_id && row.product_id !== product.product_id)
        .slice(0, 12).map(railRow),
      sameDepartment: products.filter((row) => row.category === product.category && row.brand_id !== product.brand_id)
        .slice(0, 12).map(railRow),
    }, {
      title: `${product.title} · ${name}`,
      description: `${product.title} by ${product.seller_name}, in a Kubal demo shop.`,
      image: product.images[0],
    });
  }
  return pages;
}

for (const folder of ['health', 'fashion', 'beauty', 'footwear', 'p', 'c', 'brand', 'collections']) {
  rmSync(join(site, folder), { recursive: true, force: true });
}
for (const file of ['all.html', 'brands.html']) rmSync(join(site, file), { force: true });

let written = 0;
for (const data of stores) {
  for (const { file, page, head } of pagesOf(data)) {
    write(file, documentOf({ store: data.key, head, body: render.shopBody(page), page }));
    written += 1;
  }
}

const suggested = { health: 'sunshine', fashion: 'mono', beauty: 'rose', footwear: 'midnight' };
const shops = stores.map((data) => ({
  key: data.key,
  label: data.meta.label,
  blurb: data.meta.blurb,
  template: data.shop.store_name,
  theme: suggested[data.key] ?? 'sunshine',
  cover: data.meta.cover ?? data.products[0].images[0],
}));

const faces = [
  ['Bricolage Grotesque', 'bricolage-grotesque-latin.woff2', '200 800'],
  ['DM Sans', 'dm-sans-latin.woff2', '100 1000'],
  ['Bebas Neue', 'bebas-neue-latin.woff2', '400'],
  ['Instrument Serif', 'instrument-serif-latin.woff2', '400'],
  ['Nunito', 'nunito-latin-800.woff2', '800'],
  ['Syne', 'syne-latin-700.woff2', '700'],
].map(([family, file, weight]) => `@font-face {\n  font-family: "${family}";\n  src: url("/fonts/${file}") format("woff2");\n  font-weight: ${weight};\n  font-display: swap;\n}`).join('\n\n');
writeFileSync(join(site, 'assets', 'start.css'),
  `${faces}\n\n${render.themeCss()}\n\n${readFileSync(join(here, 'src', 'start.css'), 'utf8')}`);

const themeKeys = Object.keys(papers);
// The theme is on the page before it is drawn: a saved one, one a link names, or
// the one the shop picked by the link suggests.
const startPrepaint = `(function(){var d=document.documentElement,k=${json(themeKeys)},s=${json(suggested)},`
  + `q=new URLSearchParams(location.search),t=null,p=null;`
  + `try{p=JSON.parse(localStorage.getItem('kubal.demo.profile'))}catch(e){}`
  + `if(!p){try{p=JSON.parse(sessionStorage.getItem('kubal.demo.profile'))}catch(e){}}`
  + `t=q.get('theme')||(p&&p.theme)||s[q.get('edit')||q.get('store')||(p&&p.store)]||'sunshine';`
  + `d.setAttribute('data-theme',k.indexOf(t)<0?'sunshine':t)})();`;

const startHead = (title, description) => '<!DOCTYPE html><html lang="en" data-theme="sunshine"><head><meta charset="utf-8"/>'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>'
  + `<title>${escape(title)}</title>`
  + `<meta name="description" content="${escape(description)}"/>`
  + `<meta property="og:title" content="${escape(title)}"/>`
  + `<meta property="og:description" content="${escape(description)}"/>`
  + '<meta property="og:type" content="website"/>'
  + '<meta name="robots" content="noindex, nofollow"/>'
  + '<meta name="theme-color" content="#ffffff"/>'
  + '<link rel="icon" href="/favicon.svg"/>'
  + '<link rel="preload" href="/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin="anonymous"/>'
  + '<link rel="stylesheet" href="/assets/start.css"/>'
  + `<script>${startPrepaint}</script>`;

write('index.html', startHead('See your shop · Kubal', 'Add your name and Instagram, pick a kind of shop and a theme, and see your own shop made with Kubal.')
  + '<script src="/assets/start.js" defer></script></head><body>'
  + render.startBody(shops)
  + `<script id="kd-config" type="application/json">${json(render.startConfig(shops))}</script></body></html>`);

write('404.html', startHead('Not in the demo · Kubal', 'This page is not part of the Kubal demo.')
  + '</head><body><div class="kd-page"><header class="kd-top"><a class="kd-brand" href="/">'
  + '<svg class="kd-k" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14"></rect><path d="M23 18v28M41 18L25 32l17 14"></path></svg>'
  + '<span>Kubal</span></a></header><main class="kd-main kd-missing"><div class="kd-intro"><h1>This page is not in the demo.</h1>'
  + '<p>The demo has four shops. Start again to pick yours.</p></div>'
  + '<p><a class="kd-go kd-go-link" href="/">Start again</a></p></main></div></body></html>');

console.log(`${written} shop pages for ${stores.map((data) => data.key).join(', ')}, and the start page`);

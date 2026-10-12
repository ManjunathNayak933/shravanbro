import { renderToStaticMarkup } from 'react-dom/server';
import { palette, readableInk } from '@commerce/contrast.ts';
import { themes, type StoreKey, type ThemeKey } from './persona.ts';
import type { StartConfig } from './start.ts';

export interface StartShop {
  key: StoreKey;
  label: string;
  blurb: string;
  template: string;
  theme: ThemeKey;
  cover: string;
}

function Mark() {
  return (
    <svg className="kd-k" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" />
      <path d="M23 18v28M41 18L25 32l17 14" />
    </svg>
  );
}

function Start({ shops }: { shops: StartShop[] }) {
  return (
    <div className="kd-page">
      <header className="kd-top">
        <a className="kd-brand" href="/">
          <Mark />
          <span>Kubal</span>
        </a>
      </header>

      <main className="kd-main">
        <div className="kd-intro">
          <h1>See your shop before you open it.</h1>
          <p>
            Add your name and Instagram, then pick a kind of shop and a theme. We&apos;ll open a
            preview made with Kubal, stocked with real products from Indian brands.
          </p>
        </div>

        <form id="kd-form" className="kd-form" noValidate>
          <div className="kd-field">
            <label htmlFor="kd-name">Your name</label>
            <input
              id="kd-name"
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              maxLength={40}
              placeholder="Priya Sharma"
              aria-describedby="kd-name-hint kd-name-problem"
            />
            <p className="kd-hint" id="kd-name-hint">It goes on your shop, the way shoppers will see it.</p>
            <p className="kd-problem" id="kd-name-problem" hidden />
          </div>

          <div className="kd-field">
            <label htmlFor="kd-ig">Instagram ID</label>
            <div className="kd-handle">
              <span aria-hidden="true">@</span>
              <input
                id="kd-ig"
                name="ig"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={80}
                placeholder="yourhandle"
                aria-describedby="kd-ig-hint kd-ig-problem"
              />
            </div>
            <p className="kd-hint" id="kd-ig-hint">Your shop links to it.</p>
            <p className="kd-problem" id="kd-ig-problem" hidden />
          </div>

          <fieldset className="kd-group">
            <legend>Kind of shop</legend>
            <div className="kd-shops">
              {shops.map((shop) => (
                <label key={shop.key} className="kd-shop">
                  <input type="radio" name="store" value={shop.key} />
                  <span className="kd-tick" aria-hidden="true" />
                  <span className="kd-shop-media">
                    <img src={shop.cover} alt="" width={480} height={480} loading="lazy" decoding="async" />
                  </span>
                  <span className="kd-shop-text">
                    <span className="kd-shop-kind">{shop.label}</span>
                    <span className={`kd-shop-name kd-face-${shop.key}`} data-template={shop.template}>
                      {shop.template.replace("{first's}", 'Your')}
                    </span>
                    <span className="kd-shop-blurb">{shop.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="kd-problem" id="kd-store-problem" hidden>Pick a kind of shop.</p>
          </fieldset>

          <fieldset className="kd-group">
            <legend>Theme</legend>
            <p className="kd-hint">Your shop&apos;s colour and page. This page changes with it.</p>
            <div className="kd-themes">
              {Object.entries(themes).map(([key, theme]) => (
                <label key={key} className="kd-theme">
                  <input type="radio" name="theme" value={key} />
                  <span className="kd-swatch" data-swatch={key} aria-hidden="true">
                    <span className="kd-swatch-dot" />
                    <span className="kd-swatch-line" />
                    <span className="kd-swatch-line kd-swatch-short" />
                  </span>
                  <span className="kd-theme-name">{theme.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="kd-dock">
            <div className="kd-sign">
              <span className="kd-sign-mark" id="kd-sign-mark" aria-hidden="true">Y</span>
              <span className="kd-sign-text">
                <span className="kd-sign-name kd-face-health" id="kd-sign-name">Your Fit World</span>
                <span className="kd-sign-kind" id="kd-sign-kind">Health shop in Sunshine</span>
              </span>
            </div>
            <button type="submit" className="kd-go">Open my shop</button>
          </div>
        </form>

        <aside className="kd-preview" id="kd-preview" data-state="empty" aria-label="Your shop, as shoppers see it">
          <div className="kd-phone">
            <iframe id="kd-frame" title="Your shop" tabIndex={-1} />
            <p className="kd-preview-empty">Type your name and your shop appears here.</p>
          </div>
          <p className="kd-preview-note">
            This is the shop itself, drawn by Kubal&apos;s own shop pages. Open it to browse every page.
          </p>
        </aside>
      </main>

      <footer className="kd-foot">
        <p>
          What you type stays in this browser. Products, prices and photos come from each brand&apos;s own
          store, as of October 2026, and no brand has endorsed these previews.
        </p>
      </footer>
    </div>
  );
}

export function startBody(shops: StartShop[]): string {
  return renderToStaticMarkup(<Start shops={shops} />);
}

export function startConfig(shops: StartShop[]): StartConfig {
  return {
    stores: shops.map(({ key, label, template, theme }) => ({ key, label, template, theme })),
    papers: Object.fromEntries(Object.entries(themes).map(([key, theme]) => [key, palette(theme.accent, theme.surface).paper])),
  };
}

// Each theme as the start page draws it: the shop's own page colours, worked out
// the way the shop works them out, so the page is the shop's colour throughout.
export function themeCss(): string {
  return Object.entries(themes).map(([key, theme]) => {
    const page = palette(theme.accent, theme.surface);
    const tokens = {
      '--paper': page.paper, '--surface': page.surface, '--sunk': page.sunk, '--sunk-2': page.sunk2,
      '--ink': page.ink, '--ink-2': page.ink2, '--ink-3': page.ink3, '--line': page.line, '--line-2': page.line2,
      '--danger': page.danger, '--accent': theme.accent, '--accent-ink': readableInk(theme.accent),
      '--accent-text': page.accentText,
    };
    const vars = Object.entries(tokens).map(([name, value]) => `${name}: ${value};`).join(' ');
    const swatch = `--sw-paper: ${page.paper}; --sw-ink: ${page.ink}; --sw-line: ${page.line2}; --sw-accent: ${theme.accent};`;
    return `[data-theme="${key}"] { ${vars}${page.dark ? ' color-scheme: dark;' : ''} }\n`
      + `[data-swatch="${key}"] { ${swatch} }`;
  }).join('\n');
}

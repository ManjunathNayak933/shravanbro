import type { Surface } from '@commerce/contrast.ts';

// The colour and page each theme gives a shop. Both are Shop design settings a
// creator has in Kubal: the shop's colour, and the page it sits on.
export const themes = {
  sunshine: { label: 'Sunshine', accent: '#ffc400', surface: 'white' },
  rose: { label: 'Rose', accent: '#d6336c', surface: 'tinted' },
  ocean: { label: 'Ocean', accent: '#0b6bcb', surface: 'white' },
  forest: { label: 'Forest', accent: '#1f7a55', surface: 'tinted' },
  saffron: { label: 'Saffron', accent: '#e8590c', surface: 'warm' },
  grape: { label: 'Grape', accent: '#7048e8', surface: 'bold' },
  midnight: { label: 'Midnight', accent: '#ff7a59', surface: 'dark' },
  mono: { label: 'Mono', accent: '#111111', surface: 'white' },
} as const satisfies Record<string, { label: string; accent: string; surface: Surface }>;

export type ThemeKey = keyof typeof themes;

export const storeKeys = ['health', 'fashion', 'beauty', 'footwear'] as const;
export type StoreKey = (typeof storeKeys)[number];

export interface Profile {
  name: string;
  handle: string;
  theme: ThemeKey;
  store: StoreKey;
}

const profileKey = 'kubal.demo.profile';

export function isTheme(value: unknown): value is ThemeKey {
  return typeof value === 'string' && Object.hasOwn(themes, value);
}

export function isStore(value: unknown): value is StoreKey {
  return typeof value === 'string' && (storeKeys as readonly string[]).includes(value);
}

// Braces are taken out so a name can never be read as one of the placeholders
// below, and angle brackets because nothing here needs them.
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').replace(/[\p{Cc}\p{Cf}<>{}]/gu, '').replace(/\s+/g, ' ').trim();
  if (!/\p{L}/u.test(name) || [...name].length > 40) return null;
  return name.split(' ').map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1)).join(' ');
}

// Instagram's own rules: letters, numbers, dots and underscores, up to 30, no
// dot at either end and never two in a row. A pasted profile address is fine.
export function cleanHandle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const handle = value.trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase();
  return /^(?!\.)(?!.*\.\.)[a-z0-9._]{1,30}$/.test(handle) && !handle.endsWith('.') ? handle : null;
}

export function profileOf(value: unknown): Profile | null {
  if (value === null || typeof value !== 'object') return null;
  const fields = value as Record<string, unknown>;
  const name = cleanName(fields.name);
  const handle = cleanHandle(fields.handle);
  if (name === null || handle === null || !isTheme(fields.theme) || !isStore(fields.store)) return null;
  return { name, handle, theme: fields.theme, store: fields.store };
}

function stores(): Storage[] {
  const found: Storage[] = [];
  try { found.push(window.localStorage); } catch { /* storage refused */ }
  try { found.push(window.sessionStorage); } catch { /* storage refused */ }
  return found;
}

export function readProfile(): Profile | null {
  for (const store of stores()) {
    try {
      const profile = profileOf(JSON.parse(store.getItem(profileKey) ?? 'null'));
      if (profile !== null) return profile;
    } catch {
      // A value that is not JSON is no profile.
    }
  }
  return null;
}

export function saveProfile(profile: Profile): void {
  for (const store of stores()) {
    try {
      store.setItem(profileKey, JSON.stringify(profile));
      return;
    } catch {
      // Full or refused; the next one may take it.
    }
  }
}

// A link can carry a profile, so a demo can be sent ready-made:
// /fashion/?name=Priya&ig=priya.styles&theme=rose
export const linkParams = ['name', 'ig', 'theme'] as const;

export function profileFromLink(params: URLSearchParams, store: StoreKey, saved: Profile | null): Profile | null {
  if (!linkParams.some((param) => params.has(param))) return null;
  return profileOf({
    name: params.get('name') ?? saved?.name,
    handle: params.get('ig') ?? saved?.handle,
    theme: params.get('theme') ?? saved?.theme ?? 'sunshine',
    store,
  });
}

export function firstName(name: string): string {
  const first = name.split(' ')[0] ?? name;
  return [...first].slice(0, 20).join('');
}

export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

export function tokensOf(profile: Pick<Profile, 'name' | 'handle'>): Record<string, string> {
  const first = firstName(profile.name);
  return {
    '{first}': first,
    "{first's}": possessive(first),
    '{name}': profile.name,
    "{name's}": possessive(profile.name),
    '{handle}': profile.handle,
    '{instagram}': profile.handle === '' ? '' : `https://www.instagram.com/${profile.handle}/`,
  };
}

const placeholder = /\{(?:first|name)(?:'s)?\}|\{handle\}|\{instagram\}/g;

export function fill(text: string, tokens: Record<string, string>): string {
  return text.replace(placeholder, (found) => tokens[found] ?? found);
}

function filled<T>(value: T, tokens: Record<string, string>): T {
  if (typeof value === 'string') return fill(value, tokens) as T;
  if (Array.isArray(value)) return value.map((item) => filled(item, tokens)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, filled(item, tokens)])) as T;
  }
  return value;
}

type WithShop = { shop: Record<string, unknown> & { social_links?: unknown; contact_social?: unknown } };

// The page as this visitor's shop: their name wherever the shop says one, their
// Instagram where it links one, and their theme's colour and page.
export function personalize<T extends WithShop>(input: T, profile: Pick<Profile, 'name' | 'handle' | 'theme'>): T {
  const page = filled(input, tokensOf(profile));
  const theme = themes[profile.theme];
  const links = Array.isArray(page.shop.social_links)
    ? page.shop.social_links.filter((link) => typeof link === 'string' && link !== '')
    : [];
  page.shop = {
    ...page.shop,
    theme_color: theme.accent,
    surface: theme.surface,
    social_links: links,
    contact_social: page.shop.contact_social === '' ? null : page.shop.contact_social ?? null,
  };
  return page;
}

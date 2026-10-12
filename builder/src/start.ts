import {
  cleanHandle, cleanName, fill, isStore, isTheme, readProfile, saveProfile, themes, tokensOf,
  type StoreKey, type ThemeKey,
} from './persona.ts';

export interface StartStore {
  key: StoreKey;
  label: string;
  template: string;
  theme: ThemeKey;
}

export interface StartConfig {
  stores: StartStore[];
  papers: Record<string, string>;
}

const config = JSON.parse(document.getElementById('kd-config')?.textContent ?? '{}') as StartConfig;
const form = document.getElementById('kd-form') as HTMLFormElement;
const nameInput = document.getElementById('kd-name') as HTMLInputElement;
const igInput = document.getElementById('kd-ig') as HTMLInputElement;
const storeInputs = [...form.querySelectorAll<HTMLInputElement>('input[name="store"]')];
const themeInputs = [...form.querySelectorAll<HTMLInputElement>('input[name="theme"]')];
const sign = {
  mark: document.getElementById('kd-sign-mark') as HTMLElement,
  name: document.getElementById('kd-sign-name') as HTMLElement,
  kind: document.getElementById('kd-sign-kind') as HTMLElement,
};
const preview = document.getElementById('kd-preview') as HTMLElement;
const frame = document.getElementById('kd-frame') as HTMLIFrameElement;
const themeColour = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const params = new URLSearchParams(window.location.search);

let themeChosen = false;

function shopName(template: string, typed: string): string {
  const name = cleanName(typed);
  return name === null ? template.replace("{first's}", 'Your') : fill(template, tokensOf({ name, handle: '' }));
}

function chosen<T extends string>(inputs: HTMLInputElement[], valid: (value: unknown) => value is T): T | null {
  const value = inputs.find((input) => input.checked)?.value;
  return valid(value) ? value : null;
}

function choose(inputs: HTMLInputElement[], value: string): void {
  for (const input of inputs) input.checked = input.value === value;
}

function storeOf(key: StoreKey | null): StartStore {
  return config.stores.find((store) => store.key === key) ?? config.stores[0] as StartStore;
}

// The frame shows the shop itself, only on a screen wide enough to sit beside
// the form, and only once there is a name to put on it.
const wide = window.matchMedia('(min-width: 64rem)');
let framed: StoreKey | null = null;
let ready = false;

function showShop(): void {
  const name = cleanName(nameInput.value);
  const store = chosen(storeInputs, isStore);
  preview.dataset.state = name === null ? 'empty' : 'shop';
  if (!wide.matches || name === null || store === null) return;
  const profile = { name, handle: cleanHandle(igInput.value) ?? '', theme: chosen(themeInputs, isTheme) ?? 'sunshine' };
  if (framed !== store) {
    framed = store;
    ready = false;
    frame.src = `/${store}/?${new URLSearchParams({ preview: '1', name, ig: profile.handle, theme: profile.theme })}`;
    return;
  }
  if (ready) frame.contentWindow?.postMessage({ kind: 'kubal-demo-profile', profile }, window.location.origin);
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { kind?: unknown } | null;
  if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
  if (data?.kind === 'kubal-demo-ready') {
    ready = true;
    showShop();
  }
});
wide.addEventListener('change', showShop);

function paint(): void {
  const store = storeOf(chosen(storeInputs, isStore));
  const theme = chosen(themeInputs, isTheme) ?? store.theme;
  for (const label of form.querySelectorAll<HTMLElement>('[data-template]')) {
    label.textContent = shopName(label.dataset.template ?? '', nameInput.value);
  }
  const name = shopName(store.template, nameInput.value);
  sign.name.textContent = name;
  sign.name.className = `kd-sign-name kd-face-${store.key}`;
  sign.mark.textContent = Array.from(name.trim())[0]?.toUpperCase() ?? 'K';
  sign.kind.textContent = `${store.label} shop in ${themes[theme].label}`;
  document.documentElement.dataset.theme = theme;
  themeColour?.setAttribute('content', config.papers[theme] ?? '#ffffff');
  showShop();
}

const problems = {
  name: (value: string) => (value.trim() === ''
    ? 'Add your name.'
    : cleanName(value) === null ? 'Use a name with letters in it, up to 40 characters.' : null),
  ig: (value: string) => (value.trim() === ''
    ? 'Add your Instagram ID.'
    : cleanHandle(value) === null ? 'Instagram IDs use letters, numbers, dots and underscores, up to 30.' : null),
};

function mark(input: HTMLInputElement, problem: string | null): void {
  const note = document.getElementById(`${input.id}-problem`);
  if (note !== null) {
    note.textContent = problem ?? '';
    note.hidden = problem === null;
  }
  if (problem === null) input.removeAttribute('aria-invalid');
  else input.setAttribute('aria-invalid', 'true');
}

let typing = 0;
nameInput.addEventListener('input', () => {
  if (nameInput.hasAttribute('aria-invalid')) mark(nameInput, problems.name(nameInput.value));
  window.clearTimeout(typing);
  typing = window.setTimeout(paint, 90);
});
igInput.addEventListener('input', () => {
  if (igInput.hasAttribute('aria-invalid')) mark(igInput, problems.ig(igInput.value));
});
igInput.addEventListener('change', () => {
  igInput.value = cleanHandle(igInput.value) ?? igInput.value.trim();
  showShop();
});
for (const input of storeInputs) {
  input.addEventListener('change', () => {
    if (!themeChosen) choose(themeInputs, storeOf(chosen(storeInputs, isStore)).theme);
    const note = document.getElementById('kd-store-problem');
    if (note !== null) note.hidden = true;
    paint();
  });
}
for (const input of themeInputs) {
  input.addEventListener('change', () => {
    themeChosen = true;
    paint();
  });
}

// A visitor sent to a page of a shop goes back there, and only there: the
// address has to be a page under the shop they picked.
function destination(store: StoreKey): string {
  const next = params.get('next') ?? '';
  const inside = new RegExp(`^/${store}(/[A-Za-z0-9._~%/-]*)?(\\?[^#]*)?$`);
  return inside.test(next) ? next : `/${store}/`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = cleanName(nameInput.value);
  const handle = cleanHandle(igInput.value);
  const store = chosen(storeInputs, isStore);
  mark(nameInput, problems.name(nameInput.value));
  mark(igInput, problems.ig(igInput.value));
  const storeNote = document.getElementById('kd-store-problem');
  if (storeNote !== null) storeNote.hidden = store !== null;
  if (name === null) { nameInput.focus(); return; }
  if (handle === null) { igInput.focus(); return; }
  if (store === null) { storeInputs[0]?.focus(); return; }
  saveProfile({ name, handle, theme: chosen(themeInputs, isTheme) ?? storeOf(store).theme, store });
  window.location.assign(destination(store));
});

const saved = readProfile();
nameInput.value = params.get('name') ?? saved?.name ?? '';
igInput.value = params.get('ig') ?? saved?.handle ?? '';
const firstStore = [params.get('edit'), params.get('store'), saved?.store].find(isStore) ?? 'health';
const firstTheme = [params.get('theme'), saved?.theme].find(isTheme);
choose(storeInputs, firstStore);
choose(themeInputs, firstTheme ?? storeOf(firstStore).theme);
themeChosen = firstTheme !== undefined;
paint();

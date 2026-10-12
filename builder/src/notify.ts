import type { Profile } from './persona.ts';

// Whoever runs the demo hears when someone opens a shop: the details on it go to
// /api/preview, which passes them on to Telegram (functions/api/preview.js).
// The same details from the same browser are told once a day, so a reload, the
// back button or a second look the same day is not news.
const toldKey = 'kubal.demo.told';
const day = 24 * 60 * 60 * 1000;

function toldToday(details: string, now: number): boolean {
  let told: Record<string, unknown> = {};
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(toldKey) ?? '{}');
    if (saved !== null && typeof saved === 'object' && !Array.isArray(saved)) told = saved as Record<string, unknown>;
  } catch {
    // Storage refused, or not ours: tell, and keep nothing.
  }
  const at = told[details];
  if (typeof at === 'number' && now - at >= 0 && now - at < day) return true;
  const kept = Object.entries(told).filter(([, when]) => typeof when === 'number' && now - when < day).slice(-19);
  try {
    window.localStorage.setItem(toldKey, JSON.stringify(Object.fromEntries([...kept, [details, now]])));
  } catch {
    // Full or refused.
  }
  return false;
}

export function tellOwner(profile: Profile, via: 'form' | 'link'): void {
  const { name, handle, store, theme } = profile;
  if (toldToday(JSON.stringify([store, theme, name, handle]), Date.now())) return;
  const body = JSON.stringify({ name, handle, store, theme, via });
  // A beacon outlives the page, and the start page leaves straight after this.
  try {
    if (navigator.sendBeacon('/api/preview', body)) return;
  } catch {
    // No beacons here: fetch below.
  }
  void fetch('/api/preview', { method: 'POST', body, keepalive: true }).catch(() => undefined);
}

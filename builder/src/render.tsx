import { renderToString } from 'react-dom/server';
import { palette } from '@commerce/contrast.ts';
import { shopTree } from './app.tsx';
import type { PageInput } from './pages.tsx';
import { themes } from './persona.ts';

// Drawn into each file for a browser without script. Anyone with script sees
// their own name, and the page waits for it rather than flashing this one.
const sample = { name: 'Creator', handle: '', theme: 'sunshine' as const };

export function shopBody(page: PageInput): string {
  return renderToString(shopTree(page, sample, '').tree);
}

// Each theme's page colour, so the screen is already the visitor's own colour
// in the moment before their shop is drawn.
export function papers(): Record<string, { paper: string; dark: boolean }> {
  return Object.fromEntries(Object.entries(themes).map(([key, theme]) => {
    const page = palette(theme.accent, theme.surface);
    return [key, { paper: page.paper, dark: page.dark }];
  }));
}

export { startBody, startConfig, themeCss } from './start-page.tsx';

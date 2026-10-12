import { createElement, forwardRef, useCallback, useState, type ReactNode } from 'react';

// The storefront's components import a handful of things from react-router. A
// static demo has no router: a link is a plain link, a form is a plain form, and
// every page is a file. This module stands in for the package at bundle time.

type To = string | { pathname?: string; search?: string; hash?: string };

let base = '';
let location = { pathname: '/', search: '', hash: '' };
let fetcherAction: ((fields: Record<string, string>) => unknown) | null = null;

export function configureRouter(options: { base: string; pathname: string; search?: string }) {
  base = options.base;
  location = { pathname: options.pathname, search: options.search ?? '', hash: '' };
}

// What a page's useFetcher submits to, standing in for the route's action.
export function setFetcherAction(action: ((fields: Record<string, string>) => unknown) | null) {
  fetcherAction = action;
}

function hrefOf(to: To): string {
  return typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`;
}

// Every address the shop writes starts at its own root. Here each shop lives
// under a folder of its own, so a root address is moved under it.
export function withBase(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  return `${base}${href}`;
}

type Anchor = Record<string, unknown> & { to: To; children?: ReactNode };

export const Link = forwardRef<HTMLAnchorElement, Anchor>(function Link(
  {
    to, prefetch, preventScrollReset, viewTransition, discover, reloadDocument, replace, state, relative,
    ...rest
  },
  ref,
) {
  return createElement('a', { ...rest, href: withBase(hrefOf(to)), ref });
});

export const NavLink = Link;

type FormProps = Record<string, unknown> & { action?: string; children?: ReactNode };

export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  {
    action, preventScrollReset, navigate, fetcherKey, reloadDocument, replace, state, viewTransition, discover,
    relative, ...rest
  },
  ref,
) {
  return createElement('form', { ...rest, ...(action === undefined ? {} : { action: withBase(action) }), ref });
});

export function useLocation() {
  return location;
}

export function useRouteLoaderData() {
  return { signedIn: false, resizeImages: false, nonce: undefined };
}

export function useRevalidator() {
  return { state: 'idle', revalidate: () => undefined };
}

function fieldsOf(target: unknown): Record<string, string> {
  if (target instanceof FormData) {
    return Object.fromEntries([...target].map(([key, value]) => [key, String(value)]));
  }
  if (target !== null && typeof target === 'object') {
    return Object.fromEntries(Object.entries(target).map(([key, value]) => [key, String(value)]));
  }
  return {};
}

export function useFetcher<T>() {
  const [data, setData] = useState<T | undefined>(undefined);
  const [state, setState] = useState<'idle' | 'submitting'>('idle');
  const submit = useCallback(async (target: unknown) => {
    if (fetcherAction === null) return;
    setState('submitting');
    const answer = await Promise.resolve(fetcherAction(fieldsOf(target)));
    setData(answer as T);
    setState('idle');
  }, []);
  return { data, state, submit, load: async () => undefined, Form };
}

export function redirect(url: string, init?: number | ResponseInit): Response {
  const status = typeof init === 'number' ? init : init?.status ?? 302;
  return new Response(null, { status, headers: { location: url } });
}

export function data<T>(value: T) {
  return value;
}

export function createContext<T>(defaultValue: T) {
  return { defaultValue };
}

export type RouterContextProvider = { get: <T>(context: { defaultValue: T }) => T };
export type EntryContext = Record<string, never>;

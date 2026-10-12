import { useEffect, type ReactNode } from 'react';
import { designOf, themeOf } from '@commerce/themes.ts';
import { PreviewContext } from '@kubal/ui/words.ts';
import { pageOf, type PageInput } from './pages.tsx';
import { firstName, personalize, type Profile } from './persona.ts';
import { configureRouter } from './router-shim.tsx';

// The demo's one line of its own, where the shop's announcement would be and in
// the same style, so the shop has one bar across its top rather than two.
function DemoBar({ page, name }: { page: PageInput; name: string }) {
  const theme = themeOf(designOf(page.shop).design, page.shop.theme_color);
  return (
    <div className="shop" {...theme.attributes}>
      <p className="announcement demo-bar">
        <span>Concept preview by Kubal for {firstName(name)}. Not a live shop.</span>
        {' '}
        <a href={`/?edit=${page.store}`}>Change details</a>
      </p>
    </div>
  );
}

function Titled({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    for (const element of document.querySelectorAll('title')) element.textContent = title;
    document.title = title;
    document.documentElement.classList.remove('kd-wait');
  }, [title]);
  return <>{children}</>;
}

// The page as one visitor's shop, drawn by the shop's own components. Preview
// mode is the panel's: the shop's style re-renders in place rather than being
// hoisted once, and the sign-in prompt stays away.
export function shopTree(
  page: PageInput, profile: Pick<Profile, 'name' | 'handle' | 'theme'>, search: string, bar = true,
) {
  configureRouter({ base: page.base, pathname: page.path, search });
  const own = personalize({ ...page, shop: { ...page.shop, announcement: null } }, profile);
  const { element, tags } = pageOf(own, search);
  const title = tags.find((tag): tag is { title: string } => 'title' in tag)?.title ?? own.shop.store_name;
  return {
    title,
    tree: (
      <PreviewContext.Provider value>
        <Titled title={title}>
          {bar ? <DemoBar page={own} name={profile.name} /> : null}
          {element}
        </Titled>
      </PreviewContext.Provider>
    ),
  };
}

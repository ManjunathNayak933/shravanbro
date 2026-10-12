import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { fromPaise, toPaise } from '@commerce/types.ts';
import { parseBag, parseSaved } from '@kubal/bag.ts';
import { brandsOf, departmentsOf, optionsOf, type GridProduct, type GridVariant } from '@kubal/catalog.ts';
import BagRoute, { sellerTotals } from '@kubal/routes/bag.tsx';
import BrandsRoute, { meta as brandsMeta } from '@kubal/routes/brands.tsx';
import {
  ProductPage, productPageOf, meta as productMeta,
  type ComplianceRow, type ProductRow, type RailRow, type SellerRow, type VariantRow,
} from '@kubal/routes/product.tsx';
import {
  gridOf, meta as shopMeta, opensOnShelves, shelvesOf, ShopPage, type CollectionRow, type StorefrontRow,
} from '@kubal/routes/shop.tsx';
import WishlistRoute from '@kubal/routes/wishlist.tsx';
import type { BagItem } from '@kubal/ui/bag.tsx';
import { Icon } from '@kubal/ui/icons.tsx';
import { cardOf } from '@kubal/ui/product-card.tsx';
import { ShopChrome, shopOf } from '@kubal/ui/shell.tsx';
import { setFetcherAction } from './router-shim.tsx';

export interface PricedVariant extends GridVariant {
  variant_id: string;
  price: string | number;
}

type Common = { path: string; store: string; base: string; shop: StorefrontRow };

export type PageInput = Common & (
  | { kind: 'home'; products: GridProduct[]; variants: GridVariant[]; collections: CollectionRow[] }
  | {
    kind: 'grid'; products: GridProduct[]; variants: GridVariant[];
    category?: string; brandId?: string; collection?: CollectionRow;
  }
  | {
    kind: 'product'; product: ProductRow; variants: VariantRow[]; seller: SellerRow; rules: ComplianceRow;
    sameBrand: RailRow[]; sameDepartment: RailRow[];
  }
  | { kind: 'brands'; products: GridProduct[] }
  | { kind: 'bag'; products: GridProduct[]; variants: PricedVariant[] }
  | { kind: 'wishlist'; products: GridProduct[] }
  | { kind: 'missing' }
);

export type Tag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

const origin = 'https://demo.kubal.invalid';

function Missing({ shop }: { shop: StorefrontRow }) {
  return (
    <ShopChrome shop={shopOf(shop)}>
      <div className="empty-state empty-state-page">
        <span className="empty-icon"><Icon name="search" size={30} /></span>
        <h1>Not in this preview</h1>
        <p>
          This preview has the shop&apos;s home, collections, brands, products, bag and wishlist.
          Accounts, help and checkout work in a live Kubal shop.
        </p>
        <div className="empty-actions">
          <Link className="btn btn-primary" to="/">Back to {shop.store_name}</Link>
        </div>
      </div>
    </ShopChrome>
  );
}

function bagAction(products: GridProduct[], variants: PricedVariant[]) {
  const byVariant = new Map(variants.map((variant) => [variant.variant_id, variant]));
  const byProduct = new Map(products.map((product) => [product.product_id, product]));
  return (fields: Record<string, string>) => {
    const items = parseBag(fields.bag ?? null).flatMap((line): BagItem[] => {
      const variant = byVariant.get(line.variantId);
      const product = variant === undefined ? undefined : byProduct.get(variant.product_id);
      if (variant === undefined || product === undefined) return [];
      const price = toPaise(String(variant.price));
      const lowest = price === toPaise(String(product.price_from));
      return [{
        variantId: variant.variant_id,
        productId: product.product_id,
        brandId: product.brand_id,
        sellerName: product.seller_name,
        title: product.title,
        options: optionsOf(variant).map(({ label, value }) => ({ label, value })),
        available: variant.is_buyable,
        image: product.images[0] ?? null,
        qty: line.qty,
        price: { price: variant.price, mrp: lowest ? product.mrp : null, discountPct: lowest ? product.discount_pct : null },
        lineTotal: fromPaise(price * line.qty),
      }];
    });
    return { items, totals: sellerTotals(items) };
  };
}

function wishlistAction(products: GridProduct[]) {
  const byId = new Map(products.map((product) => [product.product_id, product]));
  return (fields: Record<string, string>) => ({
    items: parseSaved(fields.saved ?? null).flatMap((id) => {
      const product = byId.get(id);
      return product === undefined ? [] : [cardOf(product)];
    }),
  });
}

export function pageOf(input: PageInput, search: string): { element: ReactNode; tags: Tag[] } {
  setFetcherAction(null);
  const url = new URL(`${input.path}${search}`, origin);

  if (input.kind === 'home') {
    const loaded = opensOnShelves(input.products)
      ? shelvesOf(input.shop, input.products, [], input.collections)
      : gridOf({
        shop: input.shop, url: new URL('/', origin), home: true, products: input.products, variants: input.variants,
        promotions: [], collections: input.collections, category: undefined, brandId: undefined, collection: null,
      });
    return { element: <ShopPage loaderData={loaded} />, tags: shopMeta({ loaderData: loaded }) };
  }

  if (input.kind === 'grid') {
    const loaded = gridOf({
      shop: input.shop, url, home: false, products: input.products, variants: input.variants, promotions: [],
      collections: [], category: input.category, brandId: input.brandId, collection: input.collection ?? null,
    });
    return { element: <ShopPage loaderData={loaded} />, tags: shopMeta({ loaderData: loaded }) };
  }

  if (input.kind === 'product') {
    const loaded = productPageOf(input);
    return { element: <ProductPage loaderData={loaded} />, tags: productMeta({ loaderData: loaded }) };
  }

  if (input.kind === 'brands') {
    const loaded = { shop: input.shop, departments: departmentsOf(input.products), brands: brandsOf(input.products) };
    return { element: <BrandsRoute loaderData={loaded} />, tags: brandsMeta({ loaderData: loaded }) };
  }

  if (input.kind === 'bag') {
    setFetcherAction(bagAction(input.products, input.variants));
    return {
      element: <BagRoute loaderData={{ shop: input.shop }} />,
      tags: [{ title: `Bag — ${input.shop.store_name}` }],
    };
  }

  if (input.kind === 'wishlist') {
    setFetcherAction(wishlistAction(input.products));
    return {
      element: <WishlistRoute loaderData={{ shop: input.shop }} />,
      tags: [{ title: `Wishlist — ${input.shop.store_name}` }],
    };
  }

  return {
    element: <Missing shop={input.shop} />,
    tags: [{ title: `Not in this preview — ${input.shop.store_name}` }],
  };
}


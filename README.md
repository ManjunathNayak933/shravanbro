# Kubal demo shops

A demo of Kubal for creators. A visitor adds their name and Instagram ID, picks
a kind of shop and a theme, and gets a shop with their name on it, drawn by
Kubal's own storefront components. It isn't a live shop: nothing can be bought,
and no brand has endorsed these previews.

- Start: `/` asks for a name, an Instagram ID, a kind of shop and a theme. The
  whole page takes the theme as it is picked, and on a wide screen the shop
  itself sits beside the form and changes as you type.
- Health: `/health/`, the Shraz Fit World concept, now in the visitor's name
- Fashion: `/fashion/`
- Beauty: `/beauty/`
- Footwear: `/footwear/`

Each shop has its home page, every product, its departments, brands and
collections, a page per product, and a bag and wishlist that work. Checkout says
it would open the brand's own checkout in a live shop. Account, help, privacy and
seller policy pages say they are not in the preview.

## What the visitor's details do

The name replaces Shravan everywhere the Health shop named him: the shop's name,
its collections, the bio, the note on each product and the line across the top.
The new shops use the name the same way. The Instagram ID becomes the shop's
Instagram link in the footer, and in the Beauty shop's profile at the top.

The details stay in the visitor's browser (`kubal.demo.profile` in local
storage). Nothing is sent anywhere. A shop page opened without them sends the
visitor to the start, and back to that page afterwards. "Change details" on any
shop goes back to the start with everything filled in.

## Sending someone a ready-made demo

A link can carry the details, and the shop opens straight away:

```
/fashion/?name=Priya%20Sharma&ig=priya.styles&theme=rose
```

`name` and `ig` are needed; `theme` is one of `sunshine`, `rose`, `ocean`,
`forest`, `saffron`, `grape`, `midnight` or `mono`.

## Every design is one Kubal can build

Each shop is a Shop design a creator can choose in Kubal today
(`packages/commerce/src/themes.ts`): a look, with some of its choices changed.

| Shop | Look | Headings | Corners | Cards | Photos | Header | Collections | Top of home |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Health | Pop | Condensed | Soft | Outlined | Square | In your colour | Cards | Big words |
| Fashion | Studio | Serif | Sharp | Plain | Tall, 3:4 | Name in the middle | Cards | Big words |
| Beauty | Blush | Rounded | Round | Lifted | Arch | Name on the left | Circles | Profile |
| Footwear | Midnight | Grotesk | Sharp | Framed | Square | Name in the middle | Cards | Big words |

A theme sets the two things a creator picks for colour: the shop's colour and
the page it sits on (white, tinted, warm, bold or dark). Picking a kind of shop
on the start page suggests a theme until the visitor picks one themselves.

## Deploying

Plain HTML with no build step, as before. On Cloudflare Pages, connect this
repository with no framework preset and an empty build command, or upload the
files with direct upload. `_redirects` sends the old addresses (`/p/…`,
`/collections/shravan-diet` and the rest) to the same pages under `/health/`.

## Changing it

`builder/` makes every page from Geetige's own storefront code and the shops in
`builder/data/*.json`. To change a product, a price or a shop's design, edit the
JSON and build again:

```
cd builder
npm install
KUBAL=/path/to/Geetige node build.mjs
```

In the data, `{first}`, `{first's}`, `{name}`, `{name's}` and `{instagram}` are
where the visitor's details go. The design columns are the storefront's own
(`look`, `heading_face`, `photo_shape` and the rest), so anything set there is a
choice Kubal offers.

Product names, prices and photos come from each brand's own store: Health's as
of 8 October 2026, the others as of 12 October 2026. Photos load from the brands'
own image servers.

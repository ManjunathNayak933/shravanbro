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

The details are kept in the visitor's browser (`kubal.demo.profile` in local
storage). The one thing sent anywhere is a note to you when someone opens a
shop (below), and the start page says so under the Instagram field and at the
foot. A shop page opened without details sends the visitor to the start, and
back to that page afterwards. "Change details" on any shop goes back to the
start with everything filled in.

## Sending someone a ready-made demo

A link can carry the details, and the shop opens straight away:

```
/fashion/?name=Priya%20Sharma&ig=priya.styles&theme=rose
```

`name` and `ig` are needed; `theme` is one of `sunshine`, `rose`, `ocean`,
`forest`, `saffron`, `grape`, `midnight` or `mono`. When the person opens it, you
hear about it on Telegram.

## Hearing when someone opens a shop

Each time someone opens a shop, from the start page or from a ready-made link,
a Telegram bot messages you:

```
🛍️ Someone opened a demo shop
Priya Sharma · @priya.studio
Fashion shop, Rose theme
[Open their shop]  [DM on Instagram]
```

The Instagram ID links to their profile. **Open their shop** shows you the shop
exactly as they saw it, without messaging you about it; **DM on Instagram**
opens a chat with them. The same details from the same browser are sent once a
day, so a reload or a second look is not a new message. Typing in the form, the
preview beside it and browsing a shop send nothing.

It is a Pages Function, `functions/api/preview.js`, that answers at
`/api/preview` and nowhere else (`_routes.json`). The bot's token never reaches
a page. To turn it on:

1. In Telegram, open **@BotFather**, send `/newbot`, and pick a name and a
   username. It replies with a token like `123456789:AA…`.
2. Open your new bot and press **Start**.
3. Open `https://api.telegram.org/bot<token>/getUpdates` in a browser, with your
   token in place of `<token>`. Copy the number after `"chat":{"id":`. That is
   your chat ID. If the list is empty, send the bot a message and reload.
4. In Cloudflare, open **Workers & Pages**, then this site's Pages project
   (`demostore`, at shrazfitworld.pages.dev), then **Settings → Variables and
   Secrets**, and add two, for Production:
   - `TELEGRAM_BOT_TOKEN`, type **Secret**: the token
   - `TELEGRAM_CHAT_ID`: the chat ID
5. Deploy again (**Deployments → … → Retry deployment**, or any push). New
   variables only reach a new deployment.

For a team chat, add the bot to a Telegram group, send a message there, and use
the group's ID from step 3 (it starts with `-`). Without the two variables the
function answers and sends nothing; add them for Preview too if you want
messages from branch previews.

Anyone can post to `/api/preview`, so it takes only details in the shop's own
format, only from the demo's own pages, and at most ten messages in ten minutes
from one address. The worst a stranger can do is put messages in your chat. If
that ever happens, a Cloudflare rate limiting rule on `/api/preview` stops it
outright. If messages don't arrive, open the latest deployment in Cloudflare,
start **Functions → Real-time logs**, and open a shop: the log shows Telegram's
answer. `Unauthorized` or `Not Found` is the token (copy it by tapping it in
BotFather's message), and `chat not found` is the chat ID or a bot nobody has
pressed Start on. Spaces in either variable are ignored.

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

Plain HTML with no build step, plus the one Pages Function above. On Cloudflare
Pages, connect this repository with no framework preset and an empty build
command; Pages finds `functions/` and deploys it with the site. Dashboard
drag-and-drop uploads leave the function out, so upload with
`npx wrangler pages deploy .` instead. `_redirects` sends the old addresses
(`/p/…`, `/collections/shravan-diet` and the rest) to the same pages under
`/health/`.

## Changing it

`builder/` makes every page from Geetige's own storefront code and the shops in
`builder/data/*.json`. To change a product, a price or a shop's design, edit the
JSON and build again:

```
cd builder
npm install
KUBAL=/path/to/Geetige node build.mjs
```

The build also makes `functions/api/preview.js` from
`builder/src/preview-function.ts`, with the shop's own rules for a name and an
Instagram ID, so change the function there.

In the data, `{first}`, `{first's}`, `{name}`, `{name's}` and `{instagram}` are
where the visitor's details go. The design columns are the storefront's own
(`look`, `heading_face`, `photo_shape` and the rest), so anything set there is a
choice Kubal offers.

Product names, prices and photos come from each brand's own store: Health's as
of 8 October 2026, the others as of 12 October 2026. Photos load from the brands'
own image servers.

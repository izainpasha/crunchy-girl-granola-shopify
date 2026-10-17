# Crunchy Girl Granola — Shopify theme

A fully functional Shopify Online Store 2.0 theme, built on [Dawn](https://github.com/Shopify/dawn) and restyled to match the [cozy-crunch-builder Lovable design](https://cozy-crunch-builder.lovable.app/). Every standard commerce flow — cart, checkout, product variants, search, collections — works out of the box; only the visual layer and homepage sections are custom.

## What's custom vs. inherited from Dawn

**Custom (brand-specific):**
- `sections/hero-granola.liquid` — homepage hero (heading, subheading, CTA, image)
- `sections/trust-badges.liquid` — 4-icon trust row
- `sections/difference.liquid` — "The Difference Is In the Batch" feature cards
- `sections/product-showcase.liquid` — "Pick your crunch" static product card grid
- `sections/testimonials.liquid` — rating + review cards
- `snippets/icon-brand.liquid` — inline SVG icon set used by the sections above
- `assets/brand.css` — layout/styling for all of the above
- Color schemes, typography, corner radius and shadow tokens in `config/settings_data.json`
- Google Fonts (DM Serif Display / Inter / Caveat) wired up in `layout/theme.liquid`
- `templates/index.json`, `sections/header-group.json`, `sections/footer-group.json` — homepage + header/footer content

**Inherited from Dawn (untouched logic):** product/collection/cart/search templates, cart drawer, predictive search, variant picker, customer accounts — all standard Dawn sections and JS, just reskinned via the color scheme + typography + radius tokens above.

## Design tokens

Pulled directly from the source design's CSS custom properties:

| Token | Hex | Used for |
|---|---|---|
| `cream` | `#FBF6EC` | page background |
| `oat` | `#F4EAD9` | card / secondary background |
| `cocoa` | `#3B2116` | text, dark footer |
| `terracotta` | `#CC6946` | buttons, links, price |
| `terracotta-deep` | `#AB4321` | button hover accent |
| `honey` | `#EBAA2D` | accent scheme |

Fonts: **DM Serif Display** (headings), **Inter** (body), **Caveat** (script accents).

## Before you launch

1. **Create products** for the four flavors shown in the "Pick your crunch" section (Birthday Cake, Apple, Original, Trail Variety Mix) with handles `birthday-cake`, `apple`, `original`, `trail-variety-mix` so the pre-filled product-card links resolve — or edit the links in the theme editor to match whatever handles you use.
2. **Set the shop name** to "Crunchy Girl Granola" in Shopify Admin → Settings → General (the header/footer wordmark pulls from `shop.name`).
3. **Create navigation menus** in Admin → Content → Menus:
   - `Main menu` — Shop / About / Contact (used by the header)
   - `Footer` — links to the four products (used by the footer "Shop" column)
4. **Upload a logo** (optional) in Theme settings → Logo, or leave blank to use the text wordmark.
5. **Add social links** in Theme settings → Social media if you want icons in the footer.
6. Images used in the homepage sections (`hero-granola.jpg`, `granola-birthday-cake.jpg`, `granola-apple.jpg`, `granola-original.jpg`, `granola-trail.jpg`) ship inside `/assets` and are auto-uploaded to your Files library the first time you push/publish the theme.

## Development

```
shopify theme dev          # local preview against a connected store
shopify theme check        # lint
shopify theme push         # deploy
```

---

Built on Dawn (MIT licensed, see `LICENSE.md`) by Shopify.

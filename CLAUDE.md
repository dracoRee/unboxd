# Unboxed — Project Overview

## What it is

Unboxed is a swap-first marketplace for designer-toy / blind-box collectibles (Pop Mart, Dimoo, Molly-style figures). Users list items they own, browse what others are offering, propose direct or triangular swaps, chat with counterparties, and track a trade through a verification checklist and state machine.

Two things make this more than a basic listings app:
- **Triangular swap matching** — builds a graph from each user's live listings ("has") and wishlist ("wants"), then searches for 3-cycles (A wants from B, B wants from C, C wants from A) to suggest swaps that a simple 1:1 match would miss.
- **Trade state machine with optimistic concurrency** — trades move `PENDING → ACCEPTED → IN_TRANSIT → COMPLETED` (or `DECLINED/CANCELLED/EXPIRED`), guarded by a `version` field so two clients can't race an update; every transition is logged to `TradeEvent`.

Real-time updates (new trade, status change, checklist progress) are pushed over Socket.io to per-user rooms. Full algorithm/architecture detail lives in the root `README.md` — this file is about the frontend: what pages exist and what the app currently looks like.

## Tech stack

- **Backend** (`main/`): Node.js + Express + Prisma → PostgreSQL, Socket.io, Supabase for auth/storage, SMTP for transactional email (password reset). See `main/.env.example` for the full config surface.
- **Frontend** (`unboxed-web-app/`): Angular 19 (standalone components, signals), Tailwind CSS 3.4.
- Rate limiting is applied to auth endpoints (login, register, forgot/reset-password) and general API traffic.

## Pages

Routes are defined in `unboxed-web-app/src/app/app.routes.ts`. All routes except auth pages sit behind `authGuard`.

**Auth**
| Route | Component | Purpose |
|---|---|---|
| `/login` | `LoginComponent` | Email/password + Google OAuth sign-in |
| `/register` | `RegisterComponent` | Account creation |
| `/forgot-password`, `/reset-password` | `ForgotPasswordComponent`, `ResetPasswordComponent` | Password recovery flow |
| `/auth/callback` | `AuthCallbackComponent` | OAuth redirect handler |

**Core product**
| Route | Component | Purpose |
|---|---|---|
| `/browse` (default) | `BrowseComponent` | Main marketplace feed — sidebar filters (series, reference value, trade type) next to a responsive card grid. Includes sponsored ad cards mixed into the feed. |
| `/series` | `SeriesComponent` | Visual directory of collectible series (Dimoo World x Disney, etc.) as a tile grid; clicking a series filters Browse to it. |
| `/my-collection` | `MyCollectionComponent` | The items a user owns, grouped by series with a completion-percentage progress bar per series. Each item has edit/delete/list-for-trade actions and an "add missing piece" affordance. |
| `/wishlist` | `WishlistComponent` | Items the user has favourited, rendered with the same trade-card component as Browse. |
| `/trades` | `TradesComponent` ("Trade Hub") | Tabs: My Listings, Suggested Swaps (the triangular-match output), My Offers, Received Offers. Each trade has an inline seller/buyer verification checklist. |
| `/trades/upload-item`, `/trades/edit-item/:id` | `UploadItemComponent` | Create or edit a listing (photos, condition, reference value, receipt upload). |
| `/chat` | `ChatPageComponent` | Conversation list + message thread, used for trade negotiation; supports image attachments. |
| `/profile/:id` | `ProfileComponent` | Public profile — Listings / Collection / Activity tabs, avatar, reputation. |

**Dead / non-product routes** (present in the codebase but not part of the real app — don't treat these as active surface area):
- `/home` → `HomeComponent` (`config/Home.ts`) is a leftover Supabase connectivity test page ("Supabase Users Test").
- `InboxComponent` (`pages/inbox/`) exists but is not registered in `app.routes.ts` and isn't referenced anywhere — orphaned.
- A few stray duplicate/backup template files sit alongside real components and are not wired to any `@Component` decorator (`trade-card.component 2.html`, `navbar.component_backup.html`, `advertisement-card.component_copy.html`). Safe to ignore or clean up; they don't render.

## Current visual design

**Color** — Single brand accent, defined once in `tailwind.config.js` (`accent-*` scale) and mirrored in `unboxed-web-app/src/styles.css` as `--brand-accent` / `--brand-accent-hover` (`#4f46e5` / `#4338ca`, indigo family). Almost every primary button, link-hover, focus ring, and CTA across the app draws from this one token now. Two colors outside that system are intentional, not drift:
- `purple-100/800` marks the "Secret" rarity tier on trade-card badges (part of a common/rare/secret categorical scheme, not a brand color).
- `purple-600` marks sponsored/ad content (badge, "Ad" label, CTA) specifically to visually separate paid placements from organic listings.

**Typography** — Inter, loaded via Google Fonts `@import` in `styles.css`. No custom display face; headings are just bold/black Inter at larger sizes. The one distinctive typographic element is the logo itself — a lowercase, hand-drawn-feeling yellow script wordmark ("unboxd.") in the navbar — which stands apart from the otherwise plain, utilitarian UI type.

**Surface & layout** — White top nav, light gray (`gray-50`) page canvas, white `rounded-2xl` cards with soft shadows for everything (product cards, panels, modals). This is a fairly generic "SaaS dashboard" visual language rather than something that reflects the toy/collectibles subject matter — functional and clean, but not distinctive beyond the logo.

**Iconography** — Outline stroke icons (Heroicons-style) throughout the navbar and card actions (chat, collection, trades, wishlist, profile, favourite/vouch buttons).

**Layout patterns**
- Browse: sidebar filters stack above the grid on mobile (`flex-col lg:flex-row`); product grid is `grid-cols-1 → sm:2 → xl:3`.
- Empty states (My Collection, Trade Hub, Chat) all follow the same formula: soft circular icon badge → bold heading → one-line gray subtext → primary CTA.
- Mobile nav: a fixed bottom tab bar (Series / Collection / Trades / Wishlist / Profile) replaces the top nav's desktop layout below `md`, driven by an `isMobile` flag that updates on window resize (not just on load).

**Accessibility / touch** — Interactive controls generally meet a 44×44px minimum touch target, and controls that reveal on `:hover` (image-zoom overlays, carousel arrows, collection item actions) are also visible by default below the `md` breakpoint so they aren't unreachable on touch devices. Two exceptions where a full 44px target isn't practical given layout density: the ad carousel's slide-indicator dots, and the three stacked action buttons on My Collection thumbnails (edit/delete/list-for-trade share an ~90–100px thumbnail on mobile).

**Known rough edges**
- `styles.css` still contains an entire unused legacy theme ("Steam Market Inspired Design System" — yes, styled after the Steam game marketplace) with dark navy CSS variables (`--steam-dark-bg`, `--steam-darker-bg`, etc.) and a global dark `body` background. It has no visible effect today because every page renders its own opaque white/gray-50 wrapper on top of it, but it's dead weight worth removing in a future cleanup pass.

# unboxd. — Architecture Essentials

Outline of critical architectural decisions only. Full detail (diagrams, code references, rationale) lives in `ARCHITECTURE.md` — read that before making non-trivial changes to any area below. This file is for fast orientation, not implementation.

---

## System shape

- Single Express process (`main/index.ts`, ~2.9k lines) — no microservices, no route modules, no service/repo layer. Routes call Prisma inline.
- One Prisma client (`main/lib/prisma.ts`) → PostgreSQL. `docker-compose.yml` runs Postgres 16 locally on port 5433.
- Angular 19 frontend, standalone components, Signals (no NgRx).
- Socket.io on the same HTTP server as Express — per-user rooms (`user_{id}`) + per-conversation rooms (`conversation_{id}`).
- File storage: Supabase Storage only (backend never writes uploads to disk; `multer` buffers in memory).
- Two auth paths → same `User` row: email/password (argon2 + JWT) and Google OAuth (Supabase Auth → `/auth/callback` → `POST /users/sync`).

## Trade state machine

- States: `PENDING → ACCEPTED → IN_TRANSIT → COMPLETED`, with `DECLINED / CANCELLED / EXPIRED` exits. Whitelisted transitions only (`TRADE_STATUS_TRANSITIONS` map).
- **`COMPLETED` is reached only via dual confirmation**, not a plain status PATCH: both `proposerConfirmedAt` and `receiverConfirmedAt` must be set via `PATCH /trades/:id/confirm`.
- Optimistic concurrency: every mutating trade write is guarded by `version` (`updateMany` with `version` in the `where`); mismatch → `409`, client must refetch.
- Every transition/confirmation logged to `TradeEvent` (audit trail).
- Each side has its own independent verification checklist (JSON) + derived status string — the JSON is the source of truth, the string can drift.
- **Gap: completion does not sync `UserCollectible`.** Items don't actually move between collections on trade completion yet.

## Swap matching

- `GET /swaps/suggestions/:userId` — triangular (3-cycle) matching only. No 1:1 direct-match endpoint exists separately.
- Computed fresh per request, O(L²) worst case, no caching/precomputed graph.
- Only `UserListing`s with a non-null `collectibleId` participate — freeform listings are invisible to matching on both the "has" and "wants" side.

## Data model — core entities

| Entity | Key point |
|---|---|
| `User` / `PublicUser` | 1:1 split — `User` = private (auth, email, ratings agg), `PublicUser` = public-safe (name, avatar, vouchCount). `UserListing` hangs off `PublicUser`. |
| `Series` → `Collectible` | Catalog. **`Collectible.userId` is optional and overloads the model** — sometimes a catalog row, sometimes a specific user's instance. Don't assume catalog-only. |
| `UserCollectible` | A user's collection entry. Duplicates = `quantity` int, not separate rows — no per-unit tracking. |
| `UserListing` | Marketplace listing. `collectibleId` optional (see matching gap above). `status`/`isAvailableForTrade` both exist as availability signals. |
| `Trade` / `TradeOfferedItem` / `TradeEvent` | Trade proposal, offered items (no quantity, one row each), append-only event log. |
| `WishlistItem` | Unique `(userId, listingId)`. Wishlisting a *listing* (not raw collectible) feeds matching's want-set. |
| `Vouch` / `Report` | Trust/moderation. `Vouch.type` discriminates user-vs-listing target. `Report.status` workflow exists at data level only, no admin UI yet. |
| `Conversation` / `Message` / `UserRating` | Chat (message optionally trade-scoped) and post-trade ratings (unique per `(tradeId, raterId)`). |

Source of truth for all fields/constraints: `main/prisma/schema.prisma`. `guidelines.md`'s "Core Models" table is stale — missing `Vouch`, `Report`, `TradeEvent`, and understates `Trade`'s actual fields.

## Known gaps (don't assume these are handled)

1. No centralized auth middleware — most routes trust `userId`/`actorId` from the request body, not a verified token.
2. Trade completion doesn't sync collections (see above).
3. Socket `join_user` has no auth check — any client can join any user's room by ID.
4. Chat messages are optimistic-broadcast with no rollback if persistence fails.
5. `main/dev.db` (SQLite) is a dead leftover — Postgres is the real datasource.

## Where to look for more

- Full detail, diagrams, code paths: `ARCHITECTURE.md`
- Product rationale / why these systems exist: `PRD.md`
- Algorithm complexity framing: root `README.md`
- API/data-model prose (partially stale, cross-check against schema): `guidelines.md`

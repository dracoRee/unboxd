# unboxd. — Product Requirements Document

**Status**: Draft
**Last updated**: 2026-08-22
**Owner**: Timothy Tan

---

## 1. Problem Statement

Blind box collectors (Pop Mart, Dimoo, Molly-style figures) routinely open box after box and end up with duplicates of common figures while still missing the ones they actually want to complete a series. Today, there's no purpose-built way to solve this. Collectors fall back on:

- **Facebook groups / Reddit / Discord** — no structure, no way to search "who has what I need and wants what I have," negotiation happens ad hoc in comments or DMs, and there's no record of who's reliable.
- **General marketplaces (Carousell, etc.)** — built for buy/sell, not swap. Finding a compatible trade partner means manually scanning listings and messaging people one at a time, with no guarantee the other person wants anything you have.

The common failure mode: **discovery and negotiation cost more time than the trade is worth**, so duplicates just pile up instead of turning into completed collections.

## 2. Who unboxd. Is For

**Primary user: the blind box collector actively building out one or more series.** They:
- Buy blind boxes knowing they'll get duplicates, and want those duplicates to become useful rather than dead inventory.
- Track (mentally or in a spreadsheet today) what they own and what they're missing from a series.
- Are currently trading through fragmented, low-structure channels (Facebook groups, Reddit, Discord, Carousell) where finding a compatible partner and reaching agreement is slow and manual.

This is not a general resale/marketplace audience — someone who just wants to buy or sell a figure for cash is a secondary case, not who the product is designed around. The product's reason to exist is the **swap**, specifically the duplicate-for-missing-piece swap, and the matching problem that makes swaps hard to find manually (you need someone who both wants what you have *and* has what you want).

## 3. Product Thesis

unboxd. is **collection management + intelligent trade matching + structured swapping** — not "another marketplace for buying and selling collectibles." Every feature decision should be evaluated against whether it strengthens that loop:

```
track collection → surface duplicates & gaps → match against other collectors → structured offer → safe exchange → collections update automatically
```

If a proposed feature mainly serves cash buy/sell behavior instead of this loop, it's out of scope or low priority by default.

## 4. Goals

1. Make it trivial to know, at a glance, what you have duplicates of and what you're missing — per series.
2. Surface *specific, actionable* trade matches (including multi-party matches a human wouldn't find by scanning listings) instead of requiring collectors to manually search and message.
3. Replace open-ended chat negotiation with a structured offer/accept flow that both sides can trust.
4. Once a trade is agreed, remove ambiguity about exchange state (what's been sent, verified, received) and keep both users' collections in sync with the outcome automatically.
5. Do all of the above with enough safety (identity signal, trade history, dispute-resistant state) that swapping with a stranger feels lower-risk than a Facebook group DM.

## 5. Non-Goals (for now)

- Being a general cash marketplace / storefront for sellers who don't want to swap.
- Payments/escrow for cash top-ups on uneven trades (may become relevant later, not core today).
- Authentication of physical figures (counterfeit detection) beyond user-submitted verification signals.
- Mobile native apps (backlog, tech decision not yet made — see `guidelines.md`).
- Admin moderation tooling beyond basic status fields (explicitly deferred per existing decision log).

## 6. Core Product Pillars & Requirements

### 6.1 Collection Management
Users need an accurate, low-friction picture of what they own and what they're chasing, organized the way collectors actually think: **by series**.

Requirements:
- Add items to a personal collection, grouped by series, with per-series completion progress.
- Distinguish "have one" vs. "have duplicates of" within a series — duplicates are the raw material for trading and should be visually distinct, not just a quantity field.
- Track what's missing per series (wishlist), so the app knows what to match against without the user re-declaring it every time.
- Editing/removing collection items and re-listing an item for trade should not require re-entering data already captured in the collection (see "Collection → Listing Integration" below).

Current state: `MyCollectionComponent` (`/my-collection`) already implements grouped-by-series collection with completion bars and edit/delete/list-for-trade actions. `WishlistComponent` (`/wishlist`) covers the "missing" side. Gap: pre-filling a listing from a collection item is on the current sprint, not yet done.

### 6.2 Intelligent Trade Matching
This is the product's core differentiator and the reason a naive marketplace search doesn't solve the problem.

Requirements:
- **Direct (1:1) matches**: surface listings where the other user's "want" overlaps with the current user's "have," and vice versa.
- **Multi-party (triangular) matches**: because direct overlap is often impossible (A wants from B, but B doesn't want anything A has), the system must search for 3-cycles — A wants from B, B wants from C, C wants from A — and present them as a single actionable suggestion, not three separate dead-end listings.
- Matches must be actionable, not just informational: a suggested swap should convert into a structured trade offer in one step, not send the user back into manual chat negotiation.
- Matching needs to scale as listings grow — current implementation caps suggestions and uses map-based lookups for `user:collectible` pairs to avoid the naive O(L²) cost blowing up (see root `README.md`).

Current state: implemented — Trade Hub's "Suggested Swaps" tab surfaces the triangular-match output described in `README.md`.

### 6.3 Structured Swapping (Offer → Trade → Exchange)
Chat-based negotiation is the thing this product replaces, not something to route users back into for the actual deal terms.

Requirements:
- A trade offer is a structured object (specific items from each side), not a chat message — both parties see the same explicit terms.
- Trade lifecycle must be unambiguous and auditable: `PENDING → ACCEPTED → IN_TRANSIT → COMPLETED`, with `DECLINED / CANCELLED / EXPIRED` as explicit exits. No implicit or undocumented states.
- Concurrent updates to the same trade must not corrupt state — e.g., both parties acting at once, or a stale client applying an update after the trade already moved on. Every transition should be attributable (who, when, from what state) for dispute resolution.
- A verification checklist during exchange (e.g., item sent / item received confirmation from each side) so "did they actually send it" isn't left to trust alone.
- On completion, both users' collections update automatically — the traded-away item leaves one collection, the traded-in item joins the other, without manual re-entry.
- Real-time status visibility: users shouldn't have to refresh or ask "did they respond yet" — offer creation, status changes, and checklist progress should push to the counterparty live.

Current state: implemented — Prisma `Trade`/`TradeOfferedItem`/`TradeEvent` model, optimistic concurrency via `version` field (409 on conflict), Socket.io events (`trade:created`, `trade:status`, `trade:checklist`) per `README.md`. Post-trade collection sync and ratings (`UserRating`) exist; confirm collection auto-update on `COMPLETED` is airtight (edge case: partial/multi-item trades).

## 7. Key User Flows

**Flow A — Duplicate becomes a listing**
Collector adds a pulled figure to their collection → app flags it as a duplicate within its series → collector lists it for trade, pre-filled from the collection record → listing appears in Browse and feeds the matching engine.

**Flow B — Discovering a match**
Collector opens Trade Hub → sees direct matches (someone wants what they have and has what they want) and suggested triangular swaps → selects a suggested swap → converts it into a structured trade offer to the relevant counterpart(ies) in one action.

**Flow C — Negotiating and closing a trade**
Recipient sees a received offer with explicit terms (not a chat message) → accepts, declines, or the offer expires → on accept, both sides work through a shared verification checklist as items ship → trade completes → both collections update automatically → both sides can rate the trade partner.

**Flow D — Chat as support, not the deal mechanism**
Chat exists for logistics/clarification (shipping details, condition questions) alongside a trade, but the trade's terms and state live in the structured offer/trade object, not in the conversation.

## 8. Success Metrics

- **Time-to-match**: median time from listing a duplicate to receiving an actionable trade suggestion.
- **Suggestion → offer conversion rate**: % of surfaced matches (direct + triangular) that convert into a sent trade offer.
- **Offer → completion rate**: % of accepted trades that reach `COMPLETED` (vs. stalling/cancelling), as a proxy for whether the checklist/exchange flow is trustworthy enough.
- **Duplicates resolved**: number of collection items that move from "duplicate" to "traded away" per active user per month.
- **Chat dependency**: proportion of completed trades where meaningful negotiation happened in chat *before* an offer was sent — a high number signals the structured-offer flow isn't yet replacing manual negotiation, which is the thing this product is supposed to fix.

## 9. Safety & Trust Considerations

- Trade history and ratings (`UserRating`) give collectors a trust signal before swapping with a stranger — this substitutes for the personal-reputation-in-a-Discord-server signal collectors currently rely on informally.
- Verification checklist + `TradeEvent` audit log exist specifically so disputes ("I never received it") have a record to point to, not just two conflicting claims.
- Listing verification (secret key checking + manual review for high-value items) and reporting users/listings are current-sprint priorities aimed at reducing scam/counterfeit risk — both directly protect the swap use case, since a swap-first product breaks down if either side can't trust the other's item is genuine.

## 10. Open Questions

- How should uneven-value trades be handled (e.g., swap plus small cash top-up) — is that in scope, or does it pull the product toward general marketplace behavior we're explicitly trying to avoid?
- What's the fallback when triangular matching finds nothing — do we degrade to showing partial/direct matches, or surface "nobody wants what you have yet" honestly?
- How many parties should multi-party matching realistically support — is 3-cycle the practical ceiling, or is there user demand for 4+ party chains once listing volume grows?
- What signal, beyond trade history and ratings, should factor into "is this user trustworthy for a swap" (e.g., verified identity, response rate, listing verification status)?

## 11. Relationship to Existing Docs

- Algorithm and architecture detail (matching engine complexity, state machine, concurrency, real-time infra): root `README.md`.
- Data model, API surface, current sprint priorities, and backlog: `guidelines.md`.
- Frontend routes, current visual design, and known rough edges: `CLAUDE.md`.

This PRD defines *why* those exist and what "done" looks like at the product level; it should stay in sync with the sprint priorities and backlog tables in `guidelines.md` rather than duplicating them.

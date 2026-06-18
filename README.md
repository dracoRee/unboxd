# Unboxed Swap Marketplace

Unboxed is a swap-first collectibles marketplace focused on secure, multi-party trading. The project highlights algorithmic matching, concurrent state transitions, and real-time updates — the same hard problems production marketplaces face.

## Swap Matching Engine (Triangular Swaps)
We build a user graph from two sources:
- **Has**: live listings per user (available listings with a collectible ID)
- **Wants**: wishlist items per user (collectible IDs from wishlisted listings)

We then search for 3-cycles where:
- User A wants a collectible from User B
- User B wants a collectible from User C
- User C wants a collectible from User A

Each suggestion returns a 3-leg cycle (B → A, C → B, A → C) with listing metadata. We cap results and can add caching for scale.

**Complexity** (worst-case): if $L$ is the number of available listings, the naive cycle scan is $O(L^2)$ due to nested listing iteration. We cap suggestions (`limit`) and rely on maps for fast lookups of `user:collectible` pairs.

## Trade State Machine + Optimistic Concurrency
Trades follow explicit states:

```
PENDING → ACCEPTED → IN_TRANSIT → COMPLETED
	↘ DECLINED / CANCELLED / EXPIRED
```

Updates are guarded with **optimistic concurrency** using a `version` field. Every transition is enforced via:
- `status` must match `expectedStatus`
- `version` must match current value

If another client updates the same trade first, the update fails with HTTP 409 and the UI refreshes.

All transitions are logged in `TradeEvent` for auditability.

## Real-Time Infrastructure
Socket.io is used for:
- trade creation (`trade:created`)
- trade status changes (`trade:status`)
- verification checklist progress (`trade:checklist`)

Clients join per-user rooms (`user_{id}`) and update Trade Hub state immediately.

## Tech Stack
- **Backend**: Node.js + Express + Prisma (PostgreSQL)
- **Frontend**: Angular 19 (standalone components, signals)
- **Real-time**: Socket.io

## Quick Start
```bash
# Backend
cd main
npm install
npx prisma generate
npx prisma migrate dev
npm start

# Frontend
cd unboxed-web-app
npm install
ng serve
```

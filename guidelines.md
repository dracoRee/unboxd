# Unboxed — AI Development Guidelines

> **Purpose**: This file is the single source of truth for any AI assistant (GitHub Copilot, Claude, GPT, etc.) working on this project. It provides project context, verification requirements, coding standards, and prompting best practices. Keep it updated as the project evolves.

---

## 1. Project Overview

**Unboxed** is a collectibles marketplace web application where users can:
- Browse, list, and trade collectible items (blind box figures, designer toys, etc.)
- Track their personal collection with series mastery progress
- Chat in real-time with other traders
- Rate and review trade partners
- Maintain wishlists of desired items

### Tech Stack

| Category | Technology | Version / Notes |
|----------|-----------|-----------------|
| **Frontend** | Angular | v19 (standalone components) |
| **Styling** | Tailwind CSS | v3.4 + PostCSS |
| **Backend** | Express.js | TypeScript, Node.js |
| **ORM** | Prisma | PostgreSQL |
| **Auth** | Supabase Auth | Email/password + OAuth |
| **Storage** | Supabase Storage | Image/video/receipt uploads |
| **Real-time** | Socket.io | Chat messaging |
| **Email** | Nodemailer | SMTP (password reset) |
| **Password Hashing** | argon2 | |
| **JWT** | jsonwebtoken | Session tokens |

### Key Dependencies
- **Frontend**: `@angular/core@^19`, `rxjs@~7.8`, `socket.io-client@^4.8`, `tailwindcss@^3.4`
- **Backend**: `express`, `prisma`, `@supabase/supabase-js`, `socket.io`, `argon2`, `jsonwebtoken`, `nodemailer`, `multer`

---

## 2. Project Structure

```
├── main/                          # Backend (Express + Prisma)
│   ├── index.ts                   # All API routes (~2200 lines)
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (source of truth for data models)
│   ├── services/
│   │   └── storage.service.ts     # Supabase storage upload helper
│   ├── lib/
│   │   └── prisma.ts              # Prisma client singleton
│   ├── generated/prisma/          # Auto-generated Prisma client (DO NOT EDIT)
│   └── package.json
│
├── unboxed-web-app/               # Frontend (Angular 19)
│   ├── src/app/
│   │   ├── app.routes.ts          # All route definitions
│   │   ├── app.config.ts          # App configuration & providers
│   │   ├── pages/                 # Page components (one per route)
│   │   │   ├── browse/            # Marketplace browsing
│   │   │   ├── trades/            # User listings & trade management
│   │   │   ├── my-collection/     # Personal collection tracker
│   │   │   ├── profile/           # User profile view
│   │   │   ├── chat-page/         # Chat interface
│   │   │   ├── inbox/             # Message inbox
│   │   │   ├── wishlist/          # Saved items
│   │   │   ├── series/            # Series overview
│   │   │   ├── login/             # Auth pages
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── auth-callback/
│   │   ├── components/            # Shared/reusable components
│   │   │   ├── trade-card/        # Individual listing card
│   │   │   ├── trade-grid/        # Grid layout for listings
│   │   │   ├── trade-modal/       # Trade detail/action modal
│   │   │   ├── navbar/            # Top navigation
│   │   │   ├── sidebar-filters/   # Filter sidebar
│   │   │   ├── category-tabs/     # Category filter tabs
│   │   │   └── chat/              # Chat messaging component
│   │   ├── services/              # API service layer
│   │   │   ├── auth.service.ts
│   │   │   ├── trade.service.ts
│   │   │   ├── collection.service.ts
│   │   │   ├── messaging.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── supabase.service.ts
│   │   ├── models/                # TypeScript interfaces
│   │   │   ├── trade-item.model.ts
│   │   │   ├── collection.model.ts
│   │   │   └── series.model.ts
│   │   └── guards/
│   │       └── auth.guard.ts      # Route protection
│   ├── tailwind.config.js
│   └── package.json
│
├── scraper/                       # Data scraping scripts (Python)
├── gform/                         # Google Form data processing (Python)
└── guidelines.md                  # THIS FILE
```

---

## 3. Data Models (Prisma Schema)

> **Source of truth**: `main/prisma/schema.prisma`

### Core Models
| Model | Purpose |
|-------|---------|
| `User` | Auth account (email, password, username, rating stats) |
| `PublicUser` | Public profile (name, bio, profile picture, verification status) |
| `Series` | Collectible series (name, description, total items) |
| `Collectible` | Individual collectible item within a series |
| `UserCollectible` | User's personal collection item (owned, with condition/photos) |
| `UserListing` | Marketplace listing (for-trade item with status, deal methods) |
| `Trade` | Trade proposal between two users |
| `TradeOfferedItem` | Items offered in a trade (join table) |
| `Message` | Chat message (in conversation or trade context) |
| `Conversation` | Chat thread between users |
| `WishlistItem` | User's wishlisted listing |
| `UserRating` | Post-trade rating (1–5 score + comment) |

### Enums
- `ListingStatus`: AVAILABLE, SOLD
- `ListingCondition`: BRAND_NEW, LIKE_NEW, LIGHTLY_USED, WELL_USED, HEAVILY_USED

---

## 4. API Endpoints Summary

> **Source of truth**: `main/index.ts`

### Auth
- `POST /auth/register` — Register with email/password
- `POST /auth/login` — Login, returns JWT
- `POST /auth/forgot-password` — Send reset email
- `POST /auth/reset-password` — Reset password with token

### Users
- `POST /users/sync` — Sync user from email
- `GET /users/search?q=` — Search users
- `GET /users/profile/:id` — Get profile with stats
- `PATCH /users/profile` — Update profile
- `POST /users/follow/:id` | `POST /users/unfollow/:id` — Follow/unfollow
- `GET /users/:id/followers` | `GET /users/:id/following` — Social graph

### Collection
- `GET /collection/:userId` — User collection grouped by series
- `POST /collection/add` — Add item (multipart upload)
- `PATCH /collection/:id` — Update item
- `DELETE /collection/:id` — Remove/decrement item

### Series & Collectibles
- `GET /series` — All series
- `GET /collectibles?seriesId=` — Collectibles list
- `GET /series/:seriesId/collectibles/:userId` — Series items with ownership status

### Listings
- `POST /listings/create` — Create listing (multipart upload)
- `GET /listings/user/:userId` — User's listings
- `GET /listings/marketplace` — Browse marketplace (with pagination/filters)
- `GET /listings/:id` — Single listing detail
- `PATCH /listings/:id` — Update listing
- `PATCH /listings/:id/availability` — Toggle availability

### Trades
- `POST /trades` — Propose trade
- `GET /trades/:userId` — User's trades
- `PATCH /trades/:id` — Update trade status

### Ratings
- `POST /ratings` — Rate completed trade
- `GET /ratings/:userId` — User's received ratings
- `GET /ratings/check/:tradeId/:raterId` — Check rating eligibility

### Wishlist
- `POST /wishlist` — Add to wishlist
- `GET /wishlist/:userId` — Get wishlist
- `DELETE /wishlist/:userId/:listingId` — Remove from wishlist

---

## 5. Development Workflow

### Setup & Run

```bash
# Backend
cd main
npm install
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run migrations
npx tsx index.ts           # Start backend server (port 3000)

# Frontend
cd unboxed-web-app
npm install
ng serve                   # Start dev server (port 4200)
```

### Environment Variables (Backend `.env`)
```
DATABASE_URL=              # PostgreSQL connection string
SUPABASE_URL=              # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Supabase service role key
JWT_SECRET=                # JWT signing secret
FRONTEND_URL=              # Frontend URL (e.g., http://localhost:4200)
SMTP_HOST=                 # Email SMTP host
SMTP_PORT=                 # Email SMTP port
SMTP_USER=                 # Email SMTP username
SMTP_PASS=                 # Email SMTP password
```

### Database Changes
1. Edit `main/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Run `npx prisma generate`
4. Update `main/index.ts` with new endpoints
5. Update relevant frontend services/models

---

## 6. Verification Requirements — ALWAYS VERIFY

> **Rule**: Every change MUST be verified before considering it complete. No exceptions.

### Verification Checklist

#### Schema Changes
- [ ] `npx prisma migrate dev` completes without errors
- [ ] `npx prisma generate` succeeds
- [ ] Verify migration SQL is correct (check `prisma/migrations/<name>/migration.sql`)

#### Backend API Changes
- [ ] Server starts without errors: `npx tsx index.ts`
- [ ] New endpoints respond correctly (test with curl, Postman, or browser)
- [ ] Error cases return appropriate status codes (400, 401, 404, 500)
- [ ] Existing endpoints are not broken (regression check)

#### Frontend Changes
- [ ] `ng serve` compiles without errors
- [ ] No TypeScript compilation errors (`ng build` or check Problems panel)
- [ ] Component renders correctly in browser at the correct route
- [ ] User interactions work (clicks, form submissions, navigation)
- [ ] Responsive layout is intact (check mobile/tablet viewports)
- [ ] No console errors in browser DevTools

#### Integration Verification
- [ ] Frontend successfully calls new backend endpoints
- [ ] Data flows correctly: UI → Service → API → Database → Response → UI
- [ ] Real-time features (Socket.io) still work after changes

### How to Verify

| Method | When to Use | How |
|--------|-------------|-----|
| **CLI** | Schema migrations, build errors, dependency issues | Run the command, check exit code and output |
| **Browser** | UI changes, routing, user flows | Open `http://localhost:4200`, navigate to affected pages |
| **curl/Postman** | API endpoints | `curl -X POST http://localhost:3000/endpoint -H "Content-Type: application/json" -d '{}'` |
| **Prisma Studio** | Database state | `npx prisma studio` — visual DB browser |
| **Browser DevTools** | Network requests, console errors, responsive design | F12 → Network tab, Console tab |

### Verification Examples

```bash
# Verify backend compiles
cd main && npx tsx --no-warnings index.ts

# Verify frontend compiles
cd unboxed-web-app && ng build --configuration=development 2>&1 | head -20

# Verify Prisma schema is valid
cd main && npx prisma validate

# Test an API endpoint
curl -s http://localhost:3000/series | head -c 200

# Check for TypeScript errors in frontend
cd unboxed-web-app && npx tsc --noEmit 2>&1 | head -30
```

---

## 7. Coding Standards

### Backend (Express + TypeScript)
- All routes in `main/index.ts` (monolith for now — future refactor to route modules)
- Use Prisma client for all DB operations (never raw SQL unless absolutely necessary)
- Validate request inputs at the route handler level (check required fields, parse integers)
- Use `parseInt()` for all route params that are IDs
- Use transactions (`prisma.$transaction`) for multi-step DB operations
- Return consistent error responses: `{ error: 'message' }`
- Log errors with `console.error` on server, never expose stack traces to client in production
- Hash passwords and secrets with argon2, never store plaintext

### Frontend (Angular 19)
- **See also**: `.github/instructions/angular.instructions.md` for detailed Angular standards
- Use standalone components (no NgModules)
- Use Angular Signals (`signal()`, `computed()`, `effect()`) for state management
- Use `input()` / `output()` functions (not decorators) for component I/O
- Use `HttpClient` for API calls, handle errors with RxJS `catchError`
- Use Tailwind CSS for styling (utility-first, avoid custom CSS unless necessary)
- Keep components focused — smart (page) components orchestrate, presentational components render
- Use route guards for authenticated routes

### File Naming
- Components: `feature-name.component.ts`
- Services: `feature-name.service.ts`
- Models: `feature-name.model.ts`
- Follow existing conventions in the codebase

### Security
- Sanitize user inputs (Angular's built-in sanitization + backend validation)
- Use parameterized queries (Prisma handles this)
- Never trust client-side data for authorization — verify on backend
- Hash sensitive data (passwords, secret keys) with argon2
- CORS is configured for `FRONTEND_URL` only

---

## 8. LLM Best Practices — Prompting Guide

> Reference: [Palantir Prompt Engineering Best Practices](https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering)

### For Users Prompting AI on This Project

#### Be Clear and Specific
- **Bad**: "Fix the trades page"
- **Good**: "The trades page at `/trades` shows a blank screen when the user has no listings. Add an empty state with a message and a link to create a listing."

- **Bad**: "Add a new feature"
- **Good**: "Add a vouch button to the `trade-card` component that calls `POST /vouches` and increments the displayed count. Only show the button if the current user has completed a trade with the listing owner."

#### Provide Context
- Reference specific files, models, and endpoints by name
- State the current behavior AND desired behavior
- Mention relevant constraints ("must work with existing Prisma schema", "must not break existing routes")

#### Use Examples
- "The output should look like the existing rating display on the profile page, but using a shield icon instead of stars"
- "Follow the same pattern as `POST /ratings` for input validation and error handling"

#### Break Complex Tasks into Steps
- **Bad**: "Build the entire vouch system"
- **Good**:
  1. "Add the `Vouch` model and `VouchType` enum to `schema.prisma`"
  2. "Create the `POST /vouches` endpoint with eligibility checking"
  3. "Create `vouch.service.ts` in the frontend"
  4. "Add the vouch button to `trade-card.component.html`"

#### Set Constraints
- "Limit the response to backend changes only"
- "Do not modify existing endpoints"
- "Use the existing Tailwind design system, no new CSS files"
- "Keep the same error handling pattern used in `/ratings`"

#### Iterate and Refine
- If the output isn't right, explain what's wrong and ask for a specific fix
- Use the verification checklist (Section 6) to identify issues
- Provide the error message or screenshot when reporting problems

### For AI Assistants Working on This Project

#### Before Making Changes
1. **Read the relevant source files** — don't assume you know the current state
2. **Check `main/prisma/schema.prisma`** for the current data model before proposing schema changes
3. **Check existing patterns** in `main/index.ts` before adding new endpoints (match validation style, error handling, response format)
4. **Check existing components** before creating new ones — there may be a reusable component already

#### While Making Changes
1. **Follow existing patterns** — consistency matters more than "better" approaches
2. **Make minimal changes** — don't refactor surrounding code unless asked
3. **Keep `main/index.ts` organized** — add new endpoints near related existing ones
4. **Update both frontend and backend** when adding features that span the stack

#### After Making Changes — ALWAYS VERIFY
1. **Run `npx prisma validate`** after schema changes
2. **Run `ng build`** (or check for TypeScript errors) after frontend changes
3. **Test the endpoint** with curl or the browser after backend changes
4. **Check the browser** for rendering issues after UI changes
5. **Run existing tests** if they exist for the affected area
6. **Report what you verified** — tell the user what checks you ran and their results

---

## 9. Current Sprint — Feature Roadmap

### Priority (This Sprint)
1. **Vouch System** — Per-listing and per-user vouches, gated by completed trades
2. **Report Users/Listings** — Flag inappropriate content, scams, counterfeits
3. **Collection → Listing Integration** — Pre-fill listing form from user's collection
4. **Listing Verification** — Secret key checking + manual review for high-value items

### Backlog (Future Sprints)
| Feature | Owner/Notes |
|---------|-------------|
| Preview page (browse without account) | John |
| Dropdown filtering | John |
| Message moderation / spam prevention | NLP/regex content filter |
| AI fraud detection | Research spike needed |
| API as a Service | Rate limiting, API keys, docs |
| Mobile app | Tech decision needed (React Native / Flutter) |
| Series/collectible data cleanup | Polish scraped data |
| UI enhancements | General polish pass |
| Tech stack evaluation | Next.js + Convex + shadcn + TipTap |

---

## 10. Useful Documentation

| Resource | URL |
|----------|-----|
| Angular Docs | https://angular.dev |
| Prisma Docs | https://www.prisma.io/docs |
| Supabase Docs | https://supabase.com/docs |
| Tailwind CSS | https://tailwindcss.com/docs |
| Socket.io | https://socket.io/docs |
| Convex (evaluation) | https://docs.convex.dev/llms.txt |
| Next.js (evaluation) | https://nextjs.org/docs/llms-full.txt |
| TipTap (evaluation) | https://tiptap.dev/llms.txt |
| shadcn/ui (evaluation) | https://ui.shadcn.com/llms.txt |
| Palantir LLM Best Practices | https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering |

---

## 11. Decision Log

Track key architectural and design decisions here.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-09 | Vouches are both per-listing and per-user | Covers both "item is legit" and "seller is trustworthy" use cases |
| 2026-03-09 | Vouches gated by completed trades only | Prevents spam/gaming; real trust signal from actual transactions |
| 2026-03-09 | Tech stack migration deferred | Current Angular+Express stack works; evaluate Next.js/Convex separately |
| 2026-03-09 | Admin panel out of scope for this sprint | API endpoints prepared with status fields; admin UI is future work |
| 2026-03-09 | Secret keys hashed with argon2 | Same library already used for passwords; never store plaintext |

---

*Last updated: 2026-03-09*

# Self-hosted Supabase stack — troubleshooting log

Issues found and fixed after cutting the frontend/backend over to the self-hosted
Supabase stack (`supabase.unboxd.online`), surfaced during real browser testing
rather than curl-based smoke tests. Kept as a reference for anyone debugging
similar symptoms later.

## Root cause 1: dropping Kong also dropped its CORS handling

The stock Supabase self-hosted `docker-compose.yml` runs Kong in front of
GoTrue/PostgREST/Storage. Kong's default config includes a CORS plugin that
adds `Access-Control-Allow-Origin` (and friends) to every response. This
project deliberately dropped Kong in favor of plain Nginx path-routing (see
main plan doc) to save memory on a 2GB instance — Nginx does the routing job
fine, but nothing was configured to replicate Kong's CORS layer.

**Symptom:** browser console showed `blocked by CORS policy: Response to
preflight request doesn't pass access control check: No
'Access-Control-Allow-Origin' header is present`. `curl` never caught this
because `curl` doesn't perform CORS preflight — only real browsers enforce it.

**Fix:** `main/self-host/nginx/cors-map.conf` (deployed to
`/etc/nginx/conf.d/`, http-level) defines an allowlist of frontend origins.
Each proxied `location` block in `supabase.unboxd.online.conf` short-circuits
`OPTIONS` preflight requests with the right headers, and adds
`Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials` to real
responses too.

**Follow-on bug caught during the fix:** PostgREST already emits its own
`Access-Control-Allow-Origin: *` header. Nginx's `add_header` doesn't replace
an existing upstream header — it appends, so responses briefly carried two
conflicting `Access-Control-Allow-Origin` values (which browsers reject
outright). Fixed with `proxy_hide_header 'Access-Control-Allow-Origin';` /
`proxy_hide_header 'Access-Control-Allow-Credentials';` before adding ours, in
all three proxied locations (`/auth/v1/`, `/rest/v1/`, `/storage/v1/`).

**Two allowlist gaps found on the first real login attempt:**
- Only `https://unboxd.online` was allowlisted, not `https://www.unboxd.online`
  — fixed in `cors-map.conf` and, separately, in Express's own `cors()` /
  Socket.io config in `main/index.ts` (which had the same single-origin bug,
  independent of Nginx).
- `Access-Control-Allow-Headers` was missing `x-supabase-api-version`, a
  header the Supabase JS client sends on auth requests. Added to the allowlist
  in `supabase.unboxd.online.conf`.

## Root cause 2: incomplete post-migration checks (name-based, not value-based)

Two separate migration steps used a *column-name* heuristic instead of
checking actual data, and both missed the same table as a result.

**Phase 5 (PostgREST grants):** grants were applied to the tables visibly
referenced in `supabase.service.ts`'s `.from()` calls. That file's
`getAvailableListings()` embeds a *different* table, `PublicUser`, via
`PublicUser:userId(...)` — easy to miss on a surface read since it doesn't
appear as its own `.from()` call, only inside a `.select()` string.

**Symptom:** `permission denied for table PublicUser` (Postgres error
`42501`) on the Browse page after CORS was otherwise fixed.

**Fix:** `GRANT SELECT ON "PublicUser" TO anon, authenticated;`

**Phase 7 (URL rewrite after data migration):** the check for "which columns
hold Supabase Storage URLs that need their domain rewritten" searched
`information_schema.columns` for column names containing `"url"`. That
correctly found `imageUrl`/`demoVideoUrl`/`receiptUrl` columns, but missed
`PublicUser.profilePicture` (and `User.profilePicture`, caught separately by
a manual spot-check at the time) — a column that holds a Storage URL without
having "url" in its name.

**Fix — done properly this time:** scanned every `text`/`character varying`
column across the whole `public` schema (42 columns) for the literal old
Cloud domain string in its *values*, not its column name. Confirmed
`PublicUser.profilePicture` was the only remaining miss, then:
```sql
UPDATE "PublicUser"
SET "profilePicture" = REPLACE("profilePicture",
  'https://cabvbtshrdspbkbmbifi.supabase.co', 'https://supabase.unboxd.online')
WHERE "profilePicture" LIKE 'https://cabvbtshrdspbkbmbifi.supabase.co%';
```

## Takeaway for future migration/infra work

- Anything a managed platform (Kong, Supabase Cloud) does invisibly has to be
  manually re-verified when it's replaced — `curl` proves the plumbing works,
  it doesn't prove a browser can actually use it (CORS is the clearest
  example).
- When auditing "does X reference Y" across a database, check actual *values*,
  not naming conventions — a heuristic like "columns named `*url*`" will miss
  real matches with different names (`profilePicture`, `avatar`, etc.).

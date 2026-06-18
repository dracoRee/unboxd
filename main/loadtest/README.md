# Load Testing (k6)

This script targets the busiest swap-marketplace endpoints:
- GET /listings/marketplace
- GET /swaps/suggestions/:userId
- GET /series/:seriesId/collectibles/:userId
- POST /trades

## Prereqs
- Backend running on http://localhost:3000 (or set BASE_URL)
- k6 installed locally (https://k6.io/docs/get-started/installation/)

## Quick start

```bash
cd main
npm run loadtest:swap
```

## Customize load

```bash
BASE_URL=http://localhost:3000 \
VUS=500 \
DURATION=2m \
USER_ID_MIN=1 USER_ID_MAX=100 \
SERIES_ID_MIN=1 SERIES_ID_MAX=20 \
COLLECTIBLE_ID_MIN=1 COLLECTIBLE_ID_MAX=200 \
npm run loadtest:swap
```

## Notes
- This test assumes the referenced IDs exist in your database.
- If you see many 400s on /trades, widen the ID ranges or pre-seed data.
- For 10,000 VUs, run k6 from a stronger machine or split the load across multiple generators.

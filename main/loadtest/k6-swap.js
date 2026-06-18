import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DEFAULT_USER_ID = Number(__ENV.USER_ID || 1);

export const options = {
    stages: [
    { duration: '30s', target: 10  }, // ramp up to 10 users
    { duration: '1m',  target: 50  }, // ramp up to 50 users
    { duration: '30s', target: 100 }, // ramp up to 100 users
    { duration: '30s', target: 0   }, // ramp back down
  ],
  vus: Number(__ENV.VUS || 10),
//   duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500']
  }
};

const headers = {
  'Content-Type': 'application/json'
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUserId() {
  const min = Number(__ENV.USER_ID_MIN || DEFAULT_USER_ID);
  const max = Number(__ENV.USER_ID_MAX || DEFAULT_USER_ID + 10);
  return randInt(min, max);
}

function pickSeriesId() {
  const min = Number(__ENV.SERIES_ID_MIN || 1);
  const max = Number(__ENV.SERIES_ID_MAX || 10);
  return randInt(min, max);
}

function pickCollectibleId() {
  const min = Number(__ENV.COLLECTIBLE_ID_MIN || 1);
  const max = Number(__ENV.COLLECTIBLE_ID_MAX || 50);
  return randInt(min, max);
}

export default function () {
  const userId = pickUserId();
  const seriesId = pickSeriesId();

  const marketplace = http.get(`${BASE_URL}/listings/marketplace?limit=20&offset=0`);
  const marketplaceOk = check(marketplace, { 'marketplace 200': (r) => r.status === 200 });
  if (!marketplaceOk && (__ITER < 3 || __ITER % 50 === 0)) {
    console.warn(`marketplace status=${marketplace.status} body=${marketplace.body?.slice(0, 200)}`);
  }

  const swaps = http.get(`${BASE_URL}/swaps/suggestions/${userId}?limit=10`);
  check(swaps, { 'swaps 200': (r) => r.status === 200 });

  const collectibles = http.get(`${BASE_URL}/series/${seriesId}/collectibles/${userId}`);
  check(collectibles, { 'collectibles 200': (r) => r.status === 200 });

  const proposerId = userId;
  const receiverId = pickUserId();
  const targetItemId = pickCollectibleId();
  const offeredItemIds = [pickCollectibleId()];

  const tradePayload = JSON.stringify({
    proposerId,
    receiverId,
    targetItemId,
    offeredItemIds,
    buyerPaysCash: true,
    cashTopUp: 0
  });

  const tradeResp = http.post(`${BASE_URL}/trades`, tradePayload, { headers });
  check(tradeResp, {
    'trade 201 or 400': (r) => r.status === 201 || r.status === 400
  });

  sleep(Number(__ENV.SLEEP || 1));
}

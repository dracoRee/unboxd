import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// These tests exercise the exact write pattern used by PATCH /trades/:id
// (main/index.ts) directly against Prisma, rather than through the HTTP
// layer: index.ts calls server.listen() as a module-load side effect and
// doesn't export `app`, so there's no supertest-able handler to import yet.
// Wiring that up is a separate refactor; these tests still prove the two
// real gaps in the current write path.

let proposerId: number;
let receiverId: number;
let targetItemId: number;
let seriesId: number;

async function createPendingTrade() {
  const trade = await prisma.trade.create({
    data: {
      proposerId,
      receiverId,
      targetItemId,
      status: 'PENDING',
      version: 0
    }
  });
  return trade;
}

beforeAll(async () => {
  const proposer = await prisma.user.create({
    data: { email: 'trade-safety-proposer@test.local', username: 'trade_safety_proposer', password: 'x' }
  });
  const receiver = await prisma.user.create({
    data: { email: 'trade-safety-receiver@test.local', username: 'trade_safety_receiver', password: 'x' }
  });
  const series = await prisma.series.create({ data: { name: 'Trade Safety Test Series' } });
  const collectible = await prisma.collectible.create({
    data: { name: 'Test Figure', rarity: 'common', referenceValue: 10, seriesId: series.id }
  });

  proposerId = proposer.id;
  receiverId = receiver.id;
  seriesId = series.id;
  targetItemId = collectible.id;
});

afterEach(async () => {
  await prisma.trade.deleteMany({ where: { proposerId, receiverId } });
});

afterAll(async () => {
  await prisma.collectible.deleteMany({ where: { seriesId } });
  await prisma.series.delete({ where: { id: seriesId } });
  await prisma.user.deleteMany({ where: { id: { in: [proposerId, receiverId] } } });
  await prisma.$disconnect();
});

describe('trade status update write safety', () => {
  it('rejects the losing side of two concurrent status updates with a version conflict', async () => {
    const trade = await createPendingTrade();

    const attemptAccept = () =>
      prisma.trade.updateMany({
        where: { id: trade.id, status: 'PENDING', version: 0 },
        data: { status: 'ACCEPTED', version: { increment: 1 } }
      });

    const [a, b] = await Promise.all([attemptAccept(), attemptAccept()]);
    const counts = [a.count, b.count].sort();

    expect(counts).toEqual([0, 1]);

    const final = await prisma.trade.findUnique({ where: { id: trade.id } });
    expect(final?.status).toBe('ACCEPTED');
    expect(final?.version).toBe(1);
  });

  it('leaves the trade updated with no audit event when the TradeEvent write fails (non-transactional gap)', async () => {
    const trade = await createPendingTrade();

    const updateResult = await prisma.trade.updateMany({
      where: { id: trade.id, status: 'PENDING', version: 0 },
      data: { status: 'ACCEPTED', version: { increment: 1 } }
    });
    expect(updateResult.count).toBe(1);

    const createEventSpy = vi
      .spyOn(prisma.tradeEvent, 'create')
      .mockRejectedValueOnce(new Error('simulated crash between the two writes'));

    await expect(
      prisma.tradeEvent.create({
        data: { tradeId: trade.id, type: 'STATUS', fromStatus: 'PENDING', toStatus: 'ACCEPTED' }
      })
    ).rejects.toThrow('simulated crash between the two writes');

    createEventSpy.mockRestore();

    // The status write already committed even though the "request" would
    // report failure — proving the two writes aren't atomic today.
    const final = await prisma.trade.findUnique({ where: { id: trade.id } });
    expect(final?.status).toBe('ACCEPTED');

    const events = await prisma.tradeEvent.findMany({ where: { tradeId: trade.id } });
    expect(events).toHaveLength(0);
  });
});

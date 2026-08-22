import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

describe('database schema', () => {
  it('can write and read a Series row via the generated Prisma client', async () => {
    const created = await prisma.series.create({ data: { name: 'CI Smoke Test Series' } });
    const found = await prisma.series.findUnique({ where: { id: created.id } });

    expect(found?.name).toBe('CI Smoke Test Series');

    await prisma.series.delete({ where: { id: created.id } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

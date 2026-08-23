import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const dimoo = await prisma.series.create({
    data: {
      name: 'Dimoo World x Disney',
      description: 'Dimoo x Disney collaboration series',
      totalItems: 12,
    },
  });

  const molly = await prisma.series.create({
    data: {
      name: 'Molly Space Travel',
      description: 'Molly space-themed blind box series',
      totalItems: 8,
    },
  });

  await prisma.collectible.createMany({
    data: [
      { name: 'Dimoo Astronaut', rarity: 'common', referenceValue: 15, seriesId: dimoo.id },
      { name: 'Dimoo Stargazer', rarity: 'rare', referenceValue: 35, seriesId: dimoo.id },
      { name: 'Dimoo Moonwalker', rarity: 'secret', referenceValue: 120, seriesId: dimoo.id },
      { name: 'Molly Captain', rarity: 'common', referenceValue: 15, seriesId: molly.id },
      { name: 'Molly Pilot', rarity: 'rare', referenceValue: 35, seriesId: molly.id },
      { name: 'Molly Nova', rarity: 'secret', referenceValue: 120, seriesId: molly.id },
    ],
  });

  console.log('Seeded 2 series and 6 collectibles.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

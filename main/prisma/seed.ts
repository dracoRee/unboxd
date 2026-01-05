import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('Cleaning up existing data...');
  await prisma.userCollectible.deleteMany();
  await prisma.collectible.deleteMany();
  await prisma.series.deleteMany();

  console.log('Seeding series and collectibles...');

  // Skullpanda Ancient Castle
  const skullpanda = await prisma.series.create({
    data: {
      name: 'Ancient Castle Series',
      description: 'The mysterious Skullpanda explores the gothic vibes of an ancient castle.',
      imageUrl: 'images/skullpanda_ancient_castle-series.webp',
      items: {
        create: [
          { name: 'Skullpanda Ancient Castle', rarity: 'Rare', referenceValue: 45, imageUrl: 'images/skullpanda_ancient_castle-series.webp' },
          { name: 'Bloody Rose', rarity: 'Common', referenceValue: 18, imageUrl: 'images/skullpanda_rose.webp' },
          { name: 'Phantom', rarity: 'Common', referenceValue: 20, imageUrl: 'images/skullpanda_phantom.webp' }
        ]
      }
    }
  });

  // Dimoo Aquarium
  const dimoo = await prisma.series.create({
    data: {
      name: 'Aquarium Series',
      description: 'Dimoo dives into the deep blue sea.',
      imageUrl: 'images/POP-MART-x-Ayan-Dimoo-World-Aquarium-Blind-Box-Series-The-Toy-Chronicle-rqrrq.avif',
      items: {
        create: [
          { name: 'Dimoo Aquarium', rarity: 'Common', referenceValue: 15, imageUrl: 'images/POP-MART-x-Ayan-Dimoo-World-Aquarium-Blind-Box-Series-The-Toy-Chronicle-rqrrq.avif' },
          { name: 'Seal', rarity: 'Common', referenceValue: 16, imageUrl: 'images/dimoo_seal.webp' },
          { name: 'Starfish', rarity: 'Common', referenceValue: 14, imageUrl: 'images/dimoo_starfish.webp' }
        ]
      }
    }
  });

  // Hirono Little Mischief
  const hirono = await prisma.series.create({
    data: {
      name: 'Little Mischief',
      description: 'The melancholic world of Hirono.',
      imageUrl: 'images/hirono.jpg',
      items: {
        create: [
          { name: 'Hirono Little Mischief', rarity: 'Rare', referenceValue: 50, imageUrl: 'images/hirono.jpg' },
          { name: 'The Silent One', rarity: 'Common', referenceValue: 22, imageUrl: 'images/hirono_silent.webp' },
          { name: 'The Wanderer', rarity: 'Common', referenceValue: 25, imageUrl: 'images/hirono_wanderer.webp' }
        ]
      }
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

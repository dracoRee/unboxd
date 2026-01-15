import { prisma } from '../lib/prisma.js';
import * as argon2 from 'argon2';

async function main() {
  console.log('Cleaning up existing data...');
  // Delete in reverse order of dependencies
  await prisma.message.deleteMany();
  await prisma.tradeOfferedItem.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.userListing.deleteMany();
  await prisma.userCollectible.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.publicUser.deleteMany();
  await prisma.user.deleteMany();
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
    },
    include: { items: true }
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
    },
    include: { items: true }
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
    },
    include: { items: true }
  });

  console.log('Seeding mock users...');
  const hashedPassword = await argon2.hash('password123');
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'collector_tim@example.com',
        password: hashedPassword,
        publicUser: {
          create: {
            name: 'Timothy Tan',
            bio: 'Avid POP MART collector based in Melbourne.',
            profilePicture: 'https://i.pravatar.cc/150?u=tim'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah_pop@example.com',
        password: hashedPassword,
        publicUser: {
          create: {
            name: 'Sarah Chen',
            bio: 'Searching for rare Skullpandas!',
            profilePicture: 'https://i.pravatar.cc/150?u=sarah'
          }
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'mike_trades@example.com',
        password: hashedPassword,
        publicUser: {
          create: {
            name: 'Mike Ross',
            bio: 'Dimoo fan for life.',
            profilePicture: 'https://i.pravatar.cc/150?u=mike'
          }
        }
      }
    })
  ]);

  console.log('Seeding sample listings...');
  await prisma.userListing.createMany({
    data: [
      {
        userId: users[1].id,
        collectibleId: skullpanda.items[0].id,
        serialNumber: 'SKP-AC-001',
        demoVideoUrl: 'https://example.com/demo1.mp4',
        receiptUrl: 'https://example.com/receipt1.jpg',
        imageUrl: skullpanda.items[0].imageUrl,
        isAvailableForTrade: true
      },
      {
        userId: users[2].id,
        collectibleId: dimoo.items[0].id,
        serialNumber: 'DIMOO-AQ-99',
        demoVideoUrl: 'https://example.com/demo2.mp4',
        receiptUrl: 'https://example.com/receipt2.jpg',
        imageUrl: dimoo.items[0].imageUrl,
        isAvailableForTrade: true
      },
      {
        userId: users[0].id,
        collectibleId: hirono.items[0].id,
        serialNumber: 'HIRONO-LM-01',
        demoVideoUrl: 'https://example.com/demo3.mp4',
        receiptUrl: 'https://example.com/receipt3.jpg',
        imageUrl: hirono.items[0].imageUrl,
        isAvailableForTrade: true
      }
    ]
  });

  console.log('Seeding wishlists...');
  await prisma.wishlistItem.createMany({
    data: [
      { userId: users[0].id, collectibleId: skullpanda.items[0].id },
      { userId: users[1].id, collectibleId: hirono.items[0].id }
    ]
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

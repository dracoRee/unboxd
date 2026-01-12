import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function migrateExistingUsers() {
  console.log('Starting migration of existing users to public_users table...');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        bio: true,
        profilePicture: true
      }
    });

    console.log(`Found ${users.length} users to migrate`);

    // Create publicUser entries for each user
    let successCount = 0;
    let skipCount = 0;

    for (const user of users) {
      try {
        // Check if publicUser already exists
        const existing = await prisma.publicUser.findUnique({
          where: { id: user.id }
        });

        if (existing) {
          console.log(`Skipping user ${user.id} - publicUser already exists`);
          skipCount++;
          continue;
        }

        // Create publicUser entry
        await prisma.publicUser.create({
          data: {
            id: user.id,
            name: user.name || 'User',
            bio: user.bio,
            profilePicture: user.profilePicture
          }
        });

        successCount++;
        console.log(`Migrated user ${user.id} (${user.name})`);
      } catch (error) {
        console.error(`Failed to migrate user ${user.id}:`, error);
      }
    }

    console.log('\nMigration complete!');
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already exists): ${skipCount}`);
    console.log(`Failed: ${users.length - successCount - skipCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateExistingUsers();

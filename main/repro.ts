
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to fetch listing 11...');
    const listing = await prisma.userListing.findUnique({
      where: { id: 11 },
      include: {
        user: {
          select: {
            id: true,
            // This is the suspected invalid part: PublicUser does not have a publicUser relation
            publicUser: { 
              select: { 
                name: true, 
                profilePicture: true,
                bio: true
              } 
            }
          }
        },
        collectible: {
          include: { series: true }
        }
      }
    });
    console.log('Listing fetched:', listing);
  } catch (error) {
    console.error('Error fetching listing:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const collectible = await prisma.collectible.findFirst({
    include: { series: true }
  });
  console.log(JSON.stringify(collectible, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

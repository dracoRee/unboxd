/*
  Warnings:

  - You are about to drop the column `acquiredAt` on the `UserCollectible` table. All the data in the column will be lost.
  - You are about to drop the column `collectibleId` on the `UserCollectible` table. All the data in the column will be lost.
  - Added the required column `seriesId` to the `UserCollectible` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserCollectible" DROP CONSTRAINT "UserCollectible_collectibleId_fkey";

-- DropIndex
DROP INDEX "UserCollectible_userId_collectibleId_key";

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "totalItems" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "UserCollectible" DROP COLUMN "acquiredAt",
DROP COLUMN "collectibleId",
ADD COLUMN     "seriesId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "PublicUser" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "profilePicture" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PublicUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserListing" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "collectibleId" INTEGER,
    "serialNumber" TEXT NOT NULL,
    "demoVideoUrl" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isAvailableForTrade" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserFollows" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "UserListing_userId_idx" ON "UserListing"("userId");

-- CreateIndex
CREATE INDEX "UserListing_collectibleId_idx" ON "UserListing"("collectibleId");

-- CreateIndex
CREATE INDEX "UserListing_isAvailableForTrade_idx" ON "UserListing"("isAvailableForTrade");

-- CreateIndex
CREATE UNIQUE INDEX "_UserFollows_AB_unique" ON "_UserFollows"("A", "B");

-- CreateIndex
CREATE INDEX "_UserFollows_B_index" ON "_UserFollows"("B");

-- AddForeignKey
ALTER TABLE "PublicUser" ADD CONSTRAINT "PublicUser_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollectible" ADD CONSTRAINT "UserCollectible_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListing" ADD CONSTRAINT "UserListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListing" ADD CONSTRAINT "UserListing_collectibleId_fkey" FOREIGN KEY ("collectibleId") REFERENCES "Collectible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFollows" ADD CONSTRAINT "_UserFollows_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFollows" ADD CONSTRAINT "_UserFollows_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

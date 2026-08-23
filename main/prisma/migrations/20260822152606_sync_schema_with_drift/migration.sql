-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('BRAND_NEW', 'LIKE_NEW', 'LIGHTLY_USED', 'WELL_USED', 'HEAVILY_USED');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VouchType" AS ENUM ('USER', 'LISTING');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- DropForeignKey
ALTER TABLE "UserListing" DROP CONSTRAINT "UserListing_userId_fkey";

-- DropForeignKey
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_collectibleId_fkey";

-- DropIndex
DROP INDEX "WishlistItem_userId_collectibleId_key";

-- AlterTable
ALTER TABLE "Collectible" DROP COLUMN "imageUrl",
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "PublicUser" ADD COLUMN     "username" TEXT NOT NULL,
ADD COLUMN     "vouchCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "buyerPaysCash" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cashAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "proposerChecklist" JSONB,
ADD COLUMN     "proposerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "proposerVerificationStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "receiverChecklist" JSONB,
ADD COLUMN     "receiverConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "receiverVerificationStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "TradeStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserCollectible" ADD COLUMN     "condition" "ListingCondition" DEFAULT 'BRAND_NEW',
ADD COLUMN     "demoVideoUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "referenceValue" DOUBLE PRECISION,
ADD COLUMN     "serialNumber" TEXT;

-- AlterTable
ALTER TABLE "UserListing" ADD COLUMN     "condition" "ListingCondition" NOT NULL DEFAULT 'BRAND_NEW',
ADD COLUMN     "dealMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "description" TEXT NOT NULL DEFAULT 'No description provided',
ADD COLUMN     "referenceValue" DOUBLE PRECISION,
ADD COLUMN     "seriesName" TEXT,
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Untitled Listing',
ADD COLUMN     "vouchCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WishlistItem" DROP COLUMN "collectibleId",
ADD COLUMN     "listingId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "TradeEvent" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "type" TEXT NOT NULL,
    "fromStatus" "TradeStatus",
    "toStatus" "TradeStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" SERIAL NOT NULL,
    "tradeId" INTEGER NOT NULL,
    "raterId" INTEGER NOT NULL,
    "rateeId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vouch" (
    "id" SERIAL NOT NULL,
    "type" "VouchType" NOT NULL,
    "userId" INTEGER,
    "listingId" INTEGER,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "reportedUserId" INTEGER,
    "listingId" INTEGER,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeEvent_tradeId_idx" ON "TradeEvent"("tradeId");

-- CreateIndex
CREATE INDEX "TradeEvent_actorId_idx" ON "TradeEvent"("actorId");

-- CreateIndex
CREATE INDEX "UserRating_rateeId_idx" ON "UserRating"("rateeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_tradeId_raterId_key" ON "UserRating"("tradeId", "raterId");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_type_authorId_userId_key" ON "Vouch"("type", "authorId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Vouch_type_authorId_listingId_key" ON "Vouch"("type", "authorId", "listingId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- CreateIndex
CREATE INDEX "Report_listingId_idx" ON "Report"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicUser_username_key" ON "PublicUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "UserListing_status_idx" ON "UserListing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_listingId_key" ON "WishlistItem"("userId", "listingId");

-- AddForeignKey
ALTER TABLE "Collectible" ADD CONSTRAINT "Collectible_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserListing" ADD CONSTRAINT "UserListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PublicUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEvent" ADD CONSTRAINT "TradeEvent_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEvent" ADD CONSTRAINT "TradeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UserListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UserListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "UserListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

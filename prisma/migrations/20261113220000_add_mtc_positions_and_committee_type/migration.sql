-- CreateEnum
CREATE TYPE "Position" AS ENUM ('HEAD', 'VICE', 'LEADER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "NotificationAudience" ADD VALUE 'MTC';
ALTER TYPE "NotificationAudience" ADD VALUE 'POSITION';

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_committeeId_fkey";

-- AlterTable
ALTER TABLE "Committee" ADD COLUMN "type" VARCHAR(20) NOT NULL DEFAULT 'committee';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isMTC" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "position" "Position" NOT NULL DEFAULT 'LEADER';

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN "isMTC" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "position" "Position" NOT NULL DEFAULT 'LEADER',
ALTER COLUMN "committeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "audiencePosition" "Position";

-- CreateIndex
CREATE INDEX "User_isMTC_position_idx" ON "User"("isMTC", "position");

-- CreateIndex
CREATE INDEX "TeamMember_isMTC_position_idx" ON "TeamMember"("isMTC", "position");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

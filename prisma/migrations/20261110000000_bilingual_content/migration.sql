ALTER TABLE "User" ADD COLUMN "preferredLanguage" VARCHAR(2) NOT NULL DEFAULT 'en';

ALTER TABLE "TeamMember"
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "bioAr" VARCHAR(500);

ALTER TABLE "Event"
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "descriptionAr" VARCHAR(2000);

ALTER TABLE "Notification"
  ADD COLUMN "titleAr" TEXT,
  ADD COLUMN "messageAr" VARCHAR(3000);

-- Add nullable expiration timestamp for admin-generated temporary passwords (additive, non-destructive)
ALTER TABLE "User" ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3);

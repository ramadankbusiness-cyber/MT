import dotenv from "dotenv";
import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Role } from "../lib/db-enums";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const providedPassword = process.env.ADMIN_PASSWORD;
const resetPassword = process.argv.includes("--reset-password");
const generatedPassword = providedPassword ?? randomBytes(18).toString("base64url");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("ADMIN_SEED_DATABASE_MISSING");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set a valid ADMIN_EMAIL in .env.local.");
  }
  if (
    !generatedPassword ||
    generatedPassword.length < 16 ||
    !/[a-z]/.test(generatedPassword) ||
    !/[A-Z]/.test(generatedPassword) ||
    !/[0-9]/.test(generatedPassword)
  ) {
    throw new Error("ADMIN_PASSWORD must contain at least 16 characters with uppercase, lowercase, and a number.");
  }

  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  const accountData = {
    name: "MT Club Admin",
    role: Role.ADMIN,
    isActive: true,
    mustChangePassword: !resetPassword,
    committeeId: null,
  };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  let adminId: string;
  if (existing) {
    adminId = existing.id;
    await prisma.user.update({
      where: { id: adminId },
      data: {
        ...accountData,
        ...(resetPassword || !providedPassword ? { passwordHash } : {}),
      },
    });
  } else {
    const admin = await prisma.user.create({
      data: {
        ...accountData,
        email,
        passwordHash,
      },
      select: { id: true },
    });
    adminId = admin.id;
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "admin.bootstrap",
        targetType: "User",
        targetId: adminId,
      },
    });
  }

  console.info(`Admin account ${existing ? "updated" : "created"} for ${email}.`);
  if (!providedPassword) {
    console.info(`Generated admin password: ${generatedPassword}`);
    console.info("Set ADMIN_PASSWORD in .env.local to keep a stable password across seed runs.");
  }
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error && error.message === "ADMIN_SEED_DATABASE_MISSING") {
      console.error("Admin seed failed: set DATABASE_URL in .env.local.");
    } else {
      console.error("Admin seed failed. Check the environment configuration and database connection.");
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

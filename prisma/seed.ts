import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { CLUB_COMMITTEES } from "../data/committees";

const prisma = new PrismaClient();
const emailFor = (value: string) => value.trim().toLowerCase();

async function seedAccount(input: {
  name: string;
  email: string;
  role: Role;
  committeeId?: string;
  password: string;
}) {
  const email = emailFor(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      role: input.role,
      committeeId: input.committeeId,
      passwordHash,
      mustChangePassword: true,
    },
    select: { id: true },
  });
  console.info(`Created ${input.role.toLowerCase()} account: ${email}`);
  console.info(`Temporary password for ${email}: ${input.password}`);
  return user.id;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminName || !adminPassword || adminPassword.length < 12) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters before seeding.");
  }

  for (const [legacyName, canonicalName] of [["Leadership", "OC"], ["Technology", "Tech"]] as const) {
    const legacy = await prisma.committee.findUnique({ where: { name: legacyName }, select: { id: true } });
    if (!legacy) continue;
    const canonical = await prisma.committee.findUnique({ where: { name: canonicalName }, select: { id: true } });
    if (!canonical) {
      await prisma.committee.update({ where: { id: legacy.id }, data: { name: canonicalName } });
      continue;
    }
    await prisma.$transaction([
      prisma.user.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.teamMember.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.event.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.attendanceSession.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.zone.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.notification.updateMany({ where: { committeeId: legacy.id }, data: { committeeId: canonical.id } }),
      prisma.committee.delete({ where: { id: legacy.id } }),
    ]);
  }

  for (const name of CLUB_COMMITTEES) {
    await prisma.committee.upsert({ where: { name }, update: {}, create: { name } });
  }
  const [oc, tech] = await Promise.all([
    prisma.committee.findUniqueOrThrow({ where: { name: "OC" } }),
    prisma.committee.findUniqueOrThrow({ where: { name: "Tech" } }),
  ]);

  const normalizedAdminEmail = emailFor(adminEmail);
  const existingAdmin = await prisma.user.findUnique({ where: { email: normalizedAdminEmail }, select: { id: true } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { name: adminName, role: Role.ADMIN, committeeId: null },
    });
  } else {
    await seedAccount({ name: adminName, email: normalizedAdminEmail, role: Role.ADMIN, password: adminPassword });
  }
  const leaders = [
    { name: "OC Committee Lead", email: "leader.leadership@example.com", committeeId: oc.id },
    { name: "Tech Committee Lead", email: "leader.technology@example.com", committeeId: tech.id },
  ];
  for (const leader of leaders) {
    await seedAccount({ ...leader, role: Role.LEADER, password: `${randomBytes(24).toString("base64url")}Aa1` });
  }

  for (let index = 1; index <= 10; index += 1) {
    await seedAccount({
      name: `MT Club Member ${String(index).padStart(2, "0")}`,
      email: `member${String(index).padStart(2, "0")}@example.com`,
      role: Role.MEMBER,
      committeeId: index % 2 === 0 ? tech.id : oc.id,
      password: `${randomBytes(24).toString("base64url")}Aa1`,
    });
  }

  const zone = await prisma.zone.findFirst({ where: { name: "Main Hall", committeeId: null } });
  if (!zone) {
    await prisma.zone.create({
      data: { name: "Main Hall", latitude: 30.0444, longitude: 31.2357, radiusMeters: 100 },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: normalizedAdminEmail }, select: { id: true } });
  const sampleEvents = [
    { title: "Community Welcome Session", daysFromNow: 14, location: "Main Hall", description: "Meet the community, explore the club, and find your next opportunity to learn and build." },
    { title: "Project Collaboration Workshop", daysFromNow: 28, location: "Main Hall", description: "A hands-on workshop for members to form teams and start shaping collaborative projects." },
  ];
  for (const event of sampleEvents) {
    const existing = await prisma.event.findFirst({ where: { title: event.title } });
    if (!existing) {
      await prisma.event.create({
        data: {
          title: event.title,
          description: event.description,
          startsAt: new Date(Date.now() + event.daysFromNow * 24 * 60 * 60 * 1000),
          location: event.location,
          createdById: admin.id,
          published: true,
        },
      });
    }
  }

  const teamSeed = [
    { name: "Baher Alaa", title: "Head, MT Club", committeeId: oc.id, bio: "Bringing the club's people and ideas together." },
    { name: "Laila Ziad", title: "Vice Head, MT Club", committeeId: oc.id, bio: "Helping the community learn and grow together." },
    { name: "Mahmoud Sameh", title: "Head, Tech", committeeId: tech.id, bio: "Leading the club's technology committee." },
    { name: "Ramadan Kamal", title: "Vice Head, Tech", committeeId: tech.id, bio: "Building thoughtful technology experiences." },
  ];
  for (const entry of teamSeed) {
    const existing = await prisma.teamMember.findFirst({ where: { name: entry.name, title: entry.title } });
    if (!existing) await prisma.teamMember.create({ data: { ...entry, order: teamSeed.indexOf(entry) } });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

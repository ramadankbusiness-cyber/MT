import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/schemas";
import { requirePermission } from "@/lib/auth-guards";
import { createTemporaryPassword } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";
import { dispatchPushNotification } from "@/lib/notification-delivery";
import { isClubCommitteeId, listClubCommittees } from "@/lib/committees";

export async function GET() {
  const access = await requirePermission("users.read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const [users, committees] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, committeeId: true, committee: { select: { name: true } }, isActive: true, mustChangePassword: true, createdAt: true },
    }),
    listClubCommittees(),
  ]);
  return NextResponse.json({ users, committees });
}

export async function POST(request: Request) {
  const access = await requirePermission("users.create");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the account details and try again." }, { status: 400 });

  const { name, email, role, committeeId } = parsed.data;
  const temporaryPassword = parsed.data.temporaryPassword || createTemporaryPassword();
  if ((role === "LEADER" || role === "MEMBER") && !committeeId) {
    return NextResponse.json({ error: "Select a committee for this account." }, { status: 400 });
  }
  if (committeeId && !(await isClubCommitteeId(committeeId))) {
    return NextResponse.json({ error: "That committee does not exist." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, role, committeeId: committeeId ?? null, passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true },
      select: { id: true, name: true, email: true, role: true, committeeId: true },
    });
    await writeAuditLog({ actorId: access.user.id, action: "user.create", targetType: "User", targetId: user.id });
    const notification = await prisma.notification.create({
      data: {
        title: "Your MT Club account is ready",
        message: "An administrator created your account. Sign in with your temporary password and choose a new password.",
        type: "ACCOUNT_CREATED",
        audience: "USERS",
        createdById: access.user.id,
        sentAt: new Date(),
        recipients: { create: { userId: user.id, deliveredAt: new Date() } },
      },
    });
    await dispatchPushNotification(notification.id);
    return NextResponse.json({ user, temporaryPassword }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    console.error("[Admin users] Account creation failed", error);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}

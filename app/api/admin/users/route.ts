import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { accountSchema } from "@/lib/schemas";
import { requirePermission } from "@/lib/auth-guards";
import { createTemporaryPassword } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";
import { dispatchPushNotification } from "@/lib/notification-delivery";
import { isClubCommitteeId, listClubCommittees } from "@/lib/committees";

async function GETInternal() {
  const access = await requirePermission("users.read");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const [users, committees] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, position: true, isMTC: true, committeeId: true, committee: { select: { id: true, key: true, name: true, nameAr: true, type: true } }, isActive: true, mustChangePassword: true, createdAt: true },
    }),
    listClubCommittees(null, { includeMTC: true }),
  ]);
  return NextResponse.json({ users, committees });
}

async function POSTInternal(request: Request) {
  const access = await requirePermission("users.create");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the account details and try again." }, { status: 400 });

  const { name, email, role, committeeId, position } = parsed.data;
  const temporaryPassword = parsed.data.temporaryPassword || createTemporaryPassword();
  const temporaryPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const selectedCommittee = committeeId ? await prisma.committee.findUnique({ where: { id: committeeId }, select: { key: true } }) : null;
  const isMTC = parsed.data.isMTC || selectedCommittee?.key === "mtc";
  if ((role === "LEADER" || role === "MEMBER") && !committeeId && !isMTC) {
    return NextResponse.json({ error: "Select a committee for this account." }, { status: 400 });
  }
  if (committeeId && !(await isClubCommitteeId(committeeId, { includeMTC: true }))) {
    return NextResponse.json({ error: "That committee does not exist." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, role, position, isMTC, committeeId: role === "ADMIN" ? null : (committeeId ?? null), passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true, temporaryPasswordExpiresAt },
      select: { id: true, name: true, email: true, role: true, position: true, isMTC: true, committeeId: true },
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
    return NextResponse.json({ user, temporaryPassword }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    console.error("[Admin users] Account creation failed", error);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}

export const GET = withApiErrorHandling(GETInternal, "/api/admin/users");
export const POST = withApiErrorHandling(POSTInternal, "/api/admin/users");

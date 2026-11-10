import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { createTemporaryPassword } from "@/lib/security";
import { writeAuditLog } from "@/lib/audit";
import { userRoleUpdateSchema } from "@/lib/schemas";
import { dispatchPushNotification } from "@/lib/notification-delivery";
import { isClubCommitteeId } from "@/lib/committees";

type RouteContext = { params: Promise<{ id: string }> };

async function PATCHInternal(request: Request, context: RouteContext) {
  const access = await requirePermission("users.update");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Choose a valid account change." }, { status: 400 });
  }
  if ("isActive" in body && typeof body.isActive === "boolean") {
    if (id === access.user.id) return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, isActive: true },
    }).catch(() => null);
    if (!updated) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    await writeAuditLog({ actorId: access.user.id, action: body.isActive ? "user.activate" : "user.deactivate", targetType: "User", targetId: id });
    return NextResponse.json({ user: updated });
  }
  const parsed = userRoleUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid account role." }, { status: 400 });
  if (id === access.user.id) return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  const { role } = parsed.data;
  const committeeId = parsed.data.committeeId ?? null;
  if (role !== "ADMIN" && !committeeId) {
    return NextResponse.json({ error: "Select a committee for this account." }, { status: 400 });
  }
  if (committeeId && !(await isClubCommitteeId(committeeId))) {
    return NextResponse.json({ error: "That committee does not exist." }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { role, committeeId: role === "ADMIN" ? null : committeeId, mustChangePassword: true },
    select: { id: true, name: true, email: true, role: true, committeeId: true, isActive: true },
  }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  await writeAuditLog({ actorId: access.user.id, action: "user.role.change", targetType: "User", targetId: id, details: { role, committeeId } });
  const notification = await prisma.notification.create({
    data: {
      title: "Your MT Club role has changed",
      message: "An administrator updated your account role. Sign in again and set a new password to continue.",
      type: "ROLE_CHANGED",
      audience: "USERS",
      createdById: access.user.id,
      sentAt: new Date(),
      recipients: { create: { userId: id, deliveredAt: new Date() } },
    },
  });
  await dispatchPushNotification(notification.id);
  return NextResponse.json({ user: updated });
}

async function POSTInternal(_request: Request, context: RouteContext) {
  const access = await requirePermission("users.resetPassword");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  if (id === access.user.id) return NextResponse.json({ error: "Use the password page to change your own password." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const temporaryPassword = createTemporaryPassword();
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
  ]);
  await writeAuditLog({ actorId: access.user.id, action: "user.password.reset", targetType: "User", targetId: id });
  const notification = await prisma.notification.create({
    data: {
      title: "Your MT Club password was reset",
      message: "An administrator reset your password. Sign in with the temporary password and choose a new one.",
      type: "ACCOUNT_CREATED",
      audience: "USERS",
      createdById: access.user.id,
      sentAt: new Date(),
      recipients: { create: { userId: id, deliveredAt: new Date() } },
    },
  });
  await dispatchPushNotification(notification.id);
  return NextResponse.json({ temporaryPassword });
}

async function DELETEInternal(_request: Request, context: RouteContext) {
  const access = await requirePermission("users.delete");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  if (id === access.user.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  try {
    await prisma.user.delete({ where: { id } });
    await writeAuditLog({ actorId: access.user.id, action: "user.delete", targetType: "User", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "Could not delete the account because it has linked records." }, { status: 409 });
    }
    throw error;
  }
}

export const PATCH = withApiErrorHandling(PATCHInternal, "/api/admin/users/[id]");
export const POST = withApiErrorHandling(POSTInternal, "/api/admin/users/[id]");
export const DELETE = withApiErrorHandling(DELETEInternal, "/api/admin/users/[id]");

import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";
import { getCurrentUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { createImmediateNotification } from "@/lib/notification-delivery";
import { createSessionTransition } from "@/lib/session-transition";

async function POSTInternal(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Use at least 12 characters with uppercase, lowercase, and a number." }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!existing || !(await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }
  const token = await getToken({ req: request as unknown as Parameters<typeof getToken>[0]["req"], secret: process.env.AUTH_SECRET, secureCookie: process.env.NODE_ENV === "production" || process.env.AUTH_URL?.startsWith("https://") === true });
  const sessionJti = typeof token?.sessionJti === "string" ? token.sessionJti : null;
  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true },
    });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    return updated;
  });
  await writeAuditLog({ actorId: user.id, action: "user.password.change", targetType: "User", targetId: user.id });
  await createImmediateNotification({
    title: "Your password was changed",
    message: "Your MT Club account password was updated successfully.",
    link: "/profile",
    type: "PASSWORD_CHANGED",
    audience: "USERS",
    committeeId: null,
    createdById: user.id,
    userIds: [user.id],
  });
  const sessionTransition = sessionJti
    ? createSessionTransition({ userId: user.id, sessionJti, newSessionVersion: updatedUser.sessionVersion })
    : null;
  return NextResponse.json({ ok: true, sessionTransition }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/auth/change-password");

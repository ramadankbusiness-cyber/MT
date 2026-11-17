import { withApiErrorHandling } from "@/lib/api-error-handler";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";

async function POSTInternal(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const invalidToken = parsed.error.issues.some((issue) => issue.path[0] === "token");
    return NextResponse.json({
      error: invalidToken ? "This reset link is invalid or expired." : "Use at least 12 characters with uppercase, lowercase, and a number.",
    }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const now = new Date();
  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, user: { select: { isActive: true } } },
  });
  if (!reset || reset.usedAt || reset.expiresAt <= now || !reset.user.isActive) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const changed = await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;
    const userUpdated = await transaction.user.updateMany({
      where: { id: reset.userId, isActive: true },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    if (userUpdated.count !== 1) return false;
    await transaction.passwordResetToken.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  await writeAuditLog({ action: "user.password.reset.completed", targetType: "User", targetId: reset.userId });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = withApiErrorHandling(POSTInternal, "/api/auth/reset-password");

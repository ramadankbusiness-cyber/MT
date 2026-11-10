import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { createImmediateNotification } from "@/lib/notification-delivery";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Use at least 12 characters with uppercase, lowercase, and a number." }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!existing || !(await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), mustChangePassword: false },
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
  return NextResponse.json({ ok: true });
}

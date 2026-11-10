import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).optional().nullable(),
});

async function GETInternal() {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}

async function PATCHInternal(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your profile details." }, { status: 400 });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, phone: true, photoUrl: true, role: true },
  });
  await writeAuditLog({ actorId: user.id, action: "profile.update", targetType: "User", targetId: user.id });
  return NextResponse.json({ user: updated });
}

export const GET = withApiErrorHandling(GETInternal, "/api/profile");
export const PATCH = withApiErrorHandling(PATCHInternal, "/api/profile");

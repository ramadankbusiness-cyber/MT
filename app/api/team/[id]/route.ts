import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { teamMemberSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

async function PATCHInternal(request: Request, context: RouteContext) {
  const access = await requirePermission("team.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = teamMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the team member details." }, { status: 400 });
  const { id } = await context.params;
  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title,
      committeeId: parsed.data.committeeId,
      bio: parsed.data.bio || null,
      socialLinks: parsed.data.socialLinks ?? undefined,
      photoUrl: parsed.data.photoUrl || null,
      order: parsed.data.order,
      visible: parsed.data.visible,
      userId: parsed.data.userId || null,
    },
    include: { committee: { select: { name: true } } },
  }).catch(() => null);
  if (!member) return NextResponse.json({ error: "Team entry not found." }, { status: 404 });
  await writeAuditLog({ actorId: access.user.id, action: "team.update", targetType: "TeamMember", targetId: id });
  return NextResponse.json({ member });
}

async function DELETEInternal(_request: Request, context: RouteContext) {
  const access = await requirePermission("team.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  try {
    await prisma.teamMember.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Team entry not found." }, { status: 404 });
  }
  await writeAuditLog({ actorId: access.user.id, action: "team.delete", targetType: "TeamMember", targetId: id });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiErrorHandling(PATCHInternal, "/api/team/[id]");
export const DELETE = withApiErrorHandling(DELETEInternal, "/api/team/[id]");

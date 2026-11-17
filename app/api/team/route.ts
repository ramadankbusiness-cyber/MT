import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requirePermission } from "@/lib/auth-guards";
import { teamMemberSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { isClubCommitteeId } from "@/lib/committees";

async function GETInternal() {
  const user = await getCurrentUser();
  const members = await prisma.teamMember.findMany({
    where: user?.role === "ADMIN" && user.isActive && !user.mustChangePassword ? {} : { visible: true },
    include: { committee: { select: { id: true, key: true, name: true, nameAr: true } } },
    orderBy: [{ isMTC: "desc" }, { order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ members });
}

async function POSTInternal(request: Request) {
  const access = await requirePermission("team.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = teamMemberSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the team member details." }, { status: 400 });
  if (parsed.data.committeeId && !(await isClubCommitteeId(parsed.data.committeeId, { includeMTC: true }))) {
    return NextResponse.json({ error: "Choose an existing committee." }, { status: 400 });
  }
  const selectedCommittee = parsed.data.committeeId
    ? await prisma.committee.findUnique({ where: { id: parsed.data.committeeId }, select: { key: true } })
    : null;
  const isMTC = parsed.data.isMTC || selectedCommittee?.key === "mtc";
  const member = await prisma.teamMember.create({
    data: {
      name: parsed.data.name,
      title: parsed.data.title,
      titleAr: parsed.data.titleAr || null,
      position: parsed.data.position,
      isMTC,
      committeeId: parsed.data.committeeId ?? null,
      bio: parsed.data.bio || null,
      bioAr: parsed.data.bioAr || null,
      socialLinks: parsed.data.socialLinks ?? undefined,
      photoUrl: parsed.data.photoUrl || null,
      order: parsed.data.order ?? (await prisma.teamMember.count({ where: { isMTC, committeeId: parsed.data.committeeId ?? null } })),
      visible: parsed.data.visible ?? true,
      userId: parsed.data.userId || null,
    },
    include: { committee: { select: { id: true, key: true, name: true, nameAr: true } } },
  });
  await writeAuditLog({ actorId: access.user.id, action: "team.create", targetType: "TeamMember", targetId: member.id });
  return NextResponse.json({ member }, { status: 201 });
}

async function PATCHInternal(request: Request) {
  const access = await requirePermission("team.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("order" in body) || !Array.isArray(body.order) || !body.order.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Invalid team ordering." }, { status: 400 });
  }
  const orderedIds = body.order as string[];
  const existing = await prisma.teamMember.findMany({ where: { id: { in: orderedIds } }, select: { id: true } });
  if (existing.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: "The team order contains missing or duplicate entries." }, { status: 400 });
  }
  await prisma.$transaction(orderedIds.map((id, order) => prisma.teamMember.update({ where: { id }, data: { order } })));
  await writeAuditLog({ actorId: access.user.id, action: "team.reorder", targetType: "TeamMember", details: { count: orderedIds.length } });
  return NextResponse.json({ ok: true });
}

export const GET = withApiErrorHandling(GETInternal, "/api/team");
export const POST = withApiErrorHandling(POSTInternal, "/api/team");
export const PATCH = withApiErrorHandling(PATCHInternal, "/api/team");

import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { zoneSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { isClubCommitteeId } from "@/lib/committees";

async function GETInternal() {
  const access = await requirePermission("zones.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const zones = await prisma.zone.findMany({
    include: { committee: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ zones });
}

async function POSTInternal(request: Request) {
  const access = await requirePermission("zones.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the zone name, center, and radius." }, { status: 400 });
  if (parsed.data.committeeId && !(await isClubCommitteeId(parsed.data.committeeId))) {
    return NextResponse.json({ error: "Choose an existing committee." }, { status: 400 });
  }
  const zone = await prisma.zone.create({
    data: parsed.data,
    include: { committee: { select: { name: true } } },
  });
  await writeAuditLog({ actorId: access.user.id, action: "zone.create", targetType: "Zone", targetId: zone.id });
  return NextResponse.json({ zone }, { status: 201 });
}

export const GET = withApiErrorHandling(GETInternal, "/api/admin/zones");
export const POST = withApiErrorHandling(POSTInternal, "/api/admin/zones");

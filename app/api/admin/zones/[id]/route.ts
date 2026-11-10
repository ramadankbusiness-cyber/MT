import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { zoneSchema } from "@/lib/schemas";
import { writeAuditLog } from "@/lib/audit";
import { isClubCommitteeId } from "@/lib/committees";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requirePermission("zones.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body: unknown = await request.json().catch(() => null);
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the zone name, center, and radius." }, { status: 400 });
  if (parsed.data.committeeId && !(await isClubCommitteeId(parsed.data.committeeId))) {
    return NextResponse.json({ error: "Choose an existing committee." }, { status: 400 });
  }
  const { id } = await context.params;
  const zone = await prisma.zone.update({
    where: { id },
    data: parsed.data,
    include: { committee: { select: { name: true } } },
  }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return null;
    throw error;
  });
  if (!zone) return NextResponse.json({ error: "Zone not found." }, { status: 404 });
  await writeAuditLog({ actorId: access.user.id, action: "zone.update", targetType: "Zone", targetId: id });
  return NextResponse.json({ zone });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requirePermission("zones.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  try {
    await prisma.zone.delete({ where: { id } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Zone not found." }, { status: 404 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "This zone is in use by an attendance session and cannot be deleted." }, { status: 409 });
    }
    throw error;
  }
  await writeAuditLog({ actorId: access.user.id, action: "zone.delete", targetType: "Zone", targetId: id });
  return NextResponse.json({ ok: true });
}

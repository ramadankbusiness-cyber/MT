import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "./prisma";

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Prisma.InputJsonValue;
  ipHash?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      details: input.details,
      ipHash: input.ipHash ?? null,
    },
  });
}

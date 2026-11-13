import { prisma } from "@/lib/prisma";

export async function listClubCommittees(committeeId?: string | null) {
  const committees = await prisma.committee.findMany({
    where: committeeId ? { id: committeeId } : {},
    select: { id: true, key: true, name: true, nameAr: true, order: true },
    orderBy: { order: "asc" },
  });
  return committees;
}

export async function isClubCommitteeId(committeeId: string) {
  return !!(await prisma.committee.findFirst({
    where: { id: committeeId },
    select: { id: true },
  }));
}

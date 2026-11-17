import { prisma } from "@/lib/prisma";

export async function listClubCommittees(
  committeeId?: string | null,
  options?: { includeMTC?: boolean },
) {
  const includeMTC = options?.includeMTC ?? false;
  const committees = await prisma.committee.findMany({
    where: committeeId ? { id: committeeId } : (includeMTC ? {} : { key: { not: "mtc" } }),
    select: { id: true, key: true, name: true, nameAr: true, type: true, order: true },
    orderBy: { order: "asc" },
  });
  return committees;
}

export async function isClubCommitteeId(committeeId: string, options?: { includeMTC?: boolean }) {
  const includeMTC = options?.includeMTC ?? false;
  return !!(await prisma.committee.findFirst({
    where: includeMTC ? { id: committeeId } : { id: committeeId, key: { not: "mtc" } },
    select: { id: true },
  }));
}

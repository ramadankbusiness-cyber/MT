import { prisma } from "@/lib/prisma";
import { CLUB_COMMITTEES } from "@/data/committees";

export { CLUB_COMMITTEES };

const committeeOrder = new Map<string, number>(CLUB_COMMITTEES.map((name, index) => [name, index]));

export async function listClubCommittees(committeeId?: string | null) {
  const committees = await prisma.committee.findMany({
    where: {
      name: { in: [...CLUB_COMMITTEES] },
      ...(committeeId ? { id: committeeId } : {}),
    },
    select: { id: true, name: true },
  });
  return committees.sort((left, right) => (committeeOrder.get(left.name) ?? Infinity) - (committeeOrder.get(right.name) ?? Infinity));
}

export async function isClubCommitteeId(committeeId: string) {
  return !!(await prisma.committee.findFirst({
    where: { id: committeeId, name: { in: [...CLUB_COMMITTEES] } },
    select: { id: true },
  }));
}

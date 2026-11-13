import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function GETInternal() {
  const committees = await prisma.committee.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      nameAr: true,
      descriptionEn: true,
      descriptionAr: true,
      order: true,
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ committees });
}

export const GET = GETInternal;

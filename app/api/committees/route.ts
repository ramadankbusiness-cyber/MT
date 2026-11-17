import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function GETInternal(request: Request) {
  const url = new URL(request.url);
  const includeMTC = url.searchParams.get("includeMTC") === "true";
  const committees = await prisma.committee.findMany({
    where: includeMTC ? {} : { key: { not: "mtc" } },
    select: {
      id: true,
      key: true,
      name: true,
      nameAr: true,
      type: true,
      descriptionEn: true,
      descriptionAr: true,
      order: true,
    },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ committees });
}

export const GET = GETInternal;

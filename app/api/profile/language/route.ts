import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-error-handler";

const languageSchema = z.object({ preferredLanguage: z.enum(["en", "ar"]) });

async function PATCHInternal(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isActive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = languageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a supported language." }, { status: 400 });
  await prisma.user.update({
    where: { id: user.id },
    data: { preferredLanguage: parsed.data.preferredLanguage },
    select: { id: true },
  });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApiErrorHandling(PATCHInternal, "/api/profile/language");

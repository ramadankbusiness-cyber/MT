import { withApiErrorHandling } from "@/lib/api-error-handler";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guards";
import { ImageUploadError, uploadClubImage } from "@/lib/image-storage";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

async function POSTInternal(request: Request) {
  const access = await requirePermission("profile.update.own");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const formData = await request.formData();
  const image = formData.get("photo");
  if (!(image instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  try {
    const photoUrl = await uploadClubImage(image, "profiles", access.user.id);
    await prisma.user.update({ where: { id: access.user.id }, data: { photoUrl } });
    await writeAuditLog({ actorId: access.user.id, action: "profile.photo.update", targetType: "User", targetId: access.user.id });
    return NextResponse.json({ photoUrl });
  } catch (error) {
    if (error instanceof ImageUploadError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Profile photo] Upload failed", error);
    return NextResponse.json({ error: "Could not upload that photo." }, { status: 500 });
  }
}

export const POST = withApiErrorHandling(POSTInternal, "/api/profile/photo");

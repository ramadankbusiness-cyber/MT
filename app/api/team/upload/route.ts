import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guards";
import { ImageUploadError, uploadClubImage } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requirePermission("team.manage");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const formData = await request.formData();
  const image = formData.get("photo");
  if (!(image instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  try {
    const url = await uploadClubImage(image, "team", access.user.id);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof ImageUploadError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[Team upload] Image processing failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not upload that photo." }, { status: 500 });
  }
}

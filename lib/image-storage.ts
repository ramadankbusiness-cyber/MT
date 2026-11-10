import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageUploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export async function uploadClubImage(file: File, folder: string, ownerId: string) {
  if (!allowedTypes.has(file.type) || file.size > maxBytes || file.size === 0) {
    throw new ImageUploadError("Use a JPG, PNG, or WebP image smaller than 5 MB.", 400);
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) throw new ImageUploadError("Club image storage is not configured.", 503);

  const source = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(source, { limitInputPixels: 24_000_000 }).metadata().catch(() => null);
  if (!metadata || !metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
    throw new ImageUploadError("That image could not be decoded.", 400);
  }
  let optimized: Buffer;
  try {
    optimized = await sharp(source, { limitInputPixels: 24_000_000 })
      .rotate()
      .resize(800, 800, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageUploadError("Could not process that photo.", 400);
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "club-assets";
  const storage = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }).storage.from(bucket);
  const path = `${folder}/${ownerId}/${randomUUID()}.webp`;
  const { error } = await storage.upload(path, optimized, { contentType: "image/webp", upsert: false });
  if (error) {
    console.error("[Image upload] Storage upload failed", error.message);
    throw new ImageUploadError("Photo upload failed.", 502);
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

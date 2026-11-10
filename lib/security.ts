import { createHmac, randomBytes } from "node:crypto";

export function hashIdentifier(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim());
  return request.headers.get("x-real-ip") ?? forwarded?.at(-1) ?? "unknown";
}

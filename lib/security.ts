import { createHmac, randomBytes } from "node:crypto";

export function hashIdentifier(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function secureIndex(maxExclusive: number): number {
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  while (true) {
    const value = randomBytes(4).readUInt32BE(0);
    if (value < limit) return value % maxExclusive;
  }
}

function shuffleChars(chars: string[]): string[] {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = secureIndex(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars;
}

export function createTemporaryPassword(): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = `${uppercase}${lowercase}${digits}`;
  const required = [
    uppercase[secureIndex(uppercase.length)],
    lowercase[secureIndex(lowercase.length)],
    digits[secureIndex(digits.length)],
  ];
  const remaining = Array.from({ length: 13 }, () => all[secureIndex(all.length)]);
  return shuffleChars([...required, ...remaining]).join("");
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim());
  return request.headers.get("x-real-ip") ?? forwarded?.at(-1) ?? "unknown";
}

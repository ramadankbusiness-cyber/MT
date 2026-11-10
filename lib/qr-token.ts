import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type QrPayload = { sessionId: string; jti: string; exp: number; static: boolean };
const rotatingTokenLifetimeSeconds = 25;

function signingSecret() {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("QR_TOKEN_SECRET must contain at least 32 characters");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function issueQrToken(input: { sessionId: string; static: boolean; expiresAt: Date; jti?: string }) {
  const jti = input.jti ?? randomUUID();
  const payload: QrPayload = {
    sessionId: input.sessionId,
    jti,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    static: input.static,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encoded}.${signature(encoded)}`, jti };
}

export function verifyQrToken(token: string, now = Date.now()): QrPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra || token.length > 4096) return null;
  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    const value = payload as Partial<QrPayload>;
    if (
      typeof value.sessionId !== "string" || value.sessionId.length < 1 ||
      typeof value.jti !== "string" || value.jti.length < 1 ||
      typeof value.exp !== "number" || !Number.isSafeInteger(value.exp) ||
      typeof value.static !== "boolean" || value.exp * 1000 <= now
    ) return null;
    return value as QrPayload;
  } catch {
    return null;
  }
}

export function rotatingTokenExpiry(now = Date.now()) {
  return new Date(now + rotatingTokenLifetimeSeconds * 1000);
}

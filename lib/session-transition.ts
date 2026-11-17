import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TRANSITION_TTL_MS = 2 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadEncoded: string): string {
  return createHmac("sha256", getSecret()).update(payloadEncoded).digest("base64url");
}

export type SessionTransitionPayload = {
  uid: string;
  jti: string;
  ver: number;
  exp: number;
  nonce: string;
};

export function createSessionTransition(input: { userId: string; sessionJti: string; newSessionVersion: number; now?: number }): string {
  const payload: SessionTransitionPayload = {
    uid: input.userId,
    jti: input.sessionJti,
    ver: input.newSessionVersion,
    exp: (input.now ?? Date.now()) + TRANSITION_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifySessionTransition(
  tokenValue: unknown,
  expected: { userId: string; sessionJti: string; newSessionVersion: number; now?: number },
): boolean {
  if (typeof tokenValue !== "string" || !tokenValue) return false;
  const parts = tokenValue.split(".");
  if (parts.length !== 2) return false;
  const [encoded, providedSig] = parts;
  const expectedSig = signPayload(encoded);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  let payload: SessionTransitionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded)) as SessionTransitionPayload;
  } catch {
    return false;
  }
  if (payload.uid !== expected.userId) return false;
  if (payload.jti !== expected.sessionJti) return false;
  if (payload.ver !== expected.newSessionVersion) return false;
  if (typeof payload.exp !== "number" || payload.exp <= (expected.now ?? Date.now())) return false;
  if (typeof payload.nonce !== "string" || payload.nonce.length < 8) return false;
  return true;
}

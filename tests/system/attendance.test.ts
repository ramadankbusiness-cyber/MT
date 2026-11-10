import { afterEach, describe, expect, it } from "vitest";
import { haversineMeters, isInsideZone, isLate } from "../../lib/attendance";
import { issueQrToken, verifyQrToken } from "../../lib/qr-token";
import { canAccessCommittee, hasPermission } from "../../lib/permissions";

describe("attendance calculations", () => {
  it("calculates distance between known coordinates", () => {
    expect(haversineMeters(
      { latitude: 30.0444, longitude: 31.2357 },
      { latitude: 30.0544, longitude: 31.2357 },
    )).toBeGreaterThan(1100);
    expect(haversineMeters(
      { latitude: 30.0444, longitude: 31.2357 },
      { latitude: 30.0544, longitude: 31.2357 },
    )).toBeLessThan(1120);
  });

  it("requires the full reported accuracy radius to fit inside the zone", () => {
    expect(isInsideZone(80, 20, 100)).toBe(true);
    expect(isInsideZone(81, 20, 100)).toBe(false);
  });

  it("applies the late threshold after the configured grace period", () => {
    const start = new Date("2026-01-01T10:00:00.000Z");
    expect(isLate(new Date("2026-01-01T10:10:00.000Z"), start, 10)).toBe(false);
    expect(isLate(new Date("2026-01-01T10:10:01.000Z"), start, 10)).toBe(true);
  });
});

describe("signed attendance QR tokens", () => {
  const originalSecret = process.env.QR_TOKEN_SECRET;
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.QR_TOKEN_SECRET;
    else process.env.QR_TOKEN_SECRET = originalSecret;
  });

  it("accepts a signed unexpired token and rejects expiry and tampering", () => {
    process.env.QR_TOKEN_SECRET = "test-qr-secret-that-is-long-enough-123456";
    const now = Date.now();
    const { token } = issueQrToken({
      sessionId: "session-1",
      static: false,
      expiresAt: new Date(now + 25_000),
      jti: "token-1",
    });
    expect(verifyQrToken(token, now)?.sessionId).toBe("session-1");
    expect(verifyQrToken(token, now + 25_000)).toBeNull();
    expect(verifyQrToken(`${token.slice(0, -1)}x`, now)).toBeNull();
  });
});

describe("server permission map", () => {
  const actors = {
    ADMIN: { id: "a", role: "ADMIN" as const, committeeId: null, isActive: true },
    LEADER: { id: "l", role: "LEADER" as const, committeeId: "c1", isActive: true },
    MEMBER: { id: "m", role: "MEMBER" as const, committeeId: "c1", isActive: true },
  };

  it.each([
    ["users.create", ["ADMIN"]],
    ["applications.read", ["ADMIN"]],
    ["team.manage", ["ADMIN"]],
    ["attendance.qr.generate", ["ADMIN"]],
    ["attendance.manualMark", ["ADMIN"]],
    ["permissions.read", ["ADMIN"]],
    ["attendance.read.committee", ["LEADER"]],
    ["events.update", ["ADMIN", "LEADER"]],
    ["notifications.send", ["ADMIN", "LEADER"]],
    ["notifications.send.anyAudience", ["ADMIN"]],
    ["attendance.scan.own", ["ADMIN", "LEADER", "MEMBER"]],
    ["attendance.read.own", ["ADMIN", "LEADER", "MEMBER"]],
    ["profile.update.own", ["ADMIN", "LEADER", "MEMBER"]],
    ["excuses.review", ["ADMIN", "LEADER"]],
  ] as const)("enforces %s by role", (permission, allowedRoles) => {
    for (const role of Object.keys(actors) as (keyof typeof actors)[]) {
      expect(hasPermission(actors[role], permission)).toBe(allowedRoles.includes(role as typeof allowedRoles[number]));
    }
  });

  it("limits committee access to the assigned Leader committee", () => {
    expect(canAccessCommittee(actors.ADMIN, "c2")).toBe(true);
    expect(canAccessCommittee(actors.LEADER, "c1")).toBe(true);
    expect(canAccessCommittee(actors.LEADER, "c2")).toBe(false);
    expect(canAccessCommittee(actors.MEMBER, "c1")).toBe(false);
  });

  it("denies inactive users", () => {
    expect(hasPermission({ ...actors.ADMIN, isActive: false }, "users.create")).toBe(false);
  });
});

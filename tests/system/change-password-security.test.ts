import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getToken: vi.fn(async () => null),
  writeAuditLog: vi.fn(async () => undefined),
  createImmediateNotification: vi.fn(async () => undefined),
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    passwordResetToken: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: any) => unknown) =>
      typeof callback === "function"
        ? callback({
            user: { update: mocks.prisma.user.update },
            passwordResetToken: { deleteMany: mocks.prisma.passwordResetToken.deleteMany },
          })
        : callback),
  },
}));

vi.mock("@/lib/auth-guards", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/lib/notification-delivery", () => ({ createImmediateNotification: mocks.createImmediateNotification }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (current: string) => current === "CurrentPass123!"),
    hash: vi.fn(async () => "new-hash"),
  },
}));

import { POST as changePassword } from "@/app/api/auth/change-password/route";

describe("change password security behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123456";
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", isActive: true });
    mocks.prisma.user.findUnique.mockResolvedValue({ passwordHash: "old-hash" });
    mocks.prisma.user.update.mockResolvedValue({ sessionVersion: 8 });
    mocks.prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
    mocks.getToken.mockResolvedValue(null);
  });

  it("clears temporary expiration, increments sessionVersion atomically with password update, deletes reset tokens, and returns sessionTransition field with no-store", async () => {
    const response = await changePassword(new Request("http://test/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "CurrentPass123!", newPassword: "NewPassword123!" }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sessionTransition).toBeNull(); // no sessionJti in mocked token
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: "new-hash",
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true },
    });
    expect(mocks.prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mocks.writeAuditLog).toHaveBeenCalledWith({ actorId: "user-1", action: "user.password.change", targetType: "User", targetId: "user-1" });
    expect(mocks.createImmediateNotification).toHaveBeenCalled();
  });

  it("returns a session-bound transition proof when current JWT sessionJti is available", async () => {
    mocks.getToken.mockResolvedValue({ sessionJti: "jti-current", id: "user-1" });
    const response = await changePassword(new Request("http://test/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "CurrentPass123!", newPassword: "NewPassword123!" }),
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.sessionTransition).toBe("string");
    expect(body.sessionTransition.length).toBeGreaterThan(20);
  });

  it("rejects incorrect current password without mutating credentials", async () => {
    const response = await changePassword(new Request("http://test/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: "WrongPass123!", newPassword: "NewPassword123!" }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
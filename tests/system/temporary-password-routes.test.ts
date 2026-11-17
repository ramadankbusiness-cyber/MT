import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createTemporaryPassword: vi.fn(() => "TempPass123456"),
  writeAuditLog: vi.fn(async () => undefined),
  dispatchPushNotification: vi.fn(async () => undefined),
  prisma: {
    committee: { findUnique: vi.fn() },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    passwordResetToken: { deleteMany: vi.fn() },
    notification: { create: vi.fn(async () => ({ id: "notif-1" })) },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

vi.mock("@/lib/auth-guards", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/lib/security", () => ({ createTemporaryPassword: mocks.createTemporaryPassword }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: mocks.writeAuditLog }));
vi.mock("@/lib/notification-delivery", () => ({ dispatchPushNotification: mocks.dispatchPushNotification }));
vi.mock("@/lib/committees", () => ({
  isClubCommitteeId: vi.fn(async () => true),
  listClubCommittees: vi.fn(async () => []),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "hashed-temp") } }));

import { POST as createUser } from "@/app/api/admin/users/route";
import { POST as resetUserPassword } from "@/app/api/admin/users/[id]/route";

describe("admin temporary password routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  });

  it("rejects unauthorized create attempts", async () => {
    mocks.requirePermission.mockResolvedValue({ error: "Unauthorized", status: 401 });
    const response = await createUser(new Request("http://test/api/admin/users", { method: "POST", body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it("rejects unauthorized reset attempts", async () => {
    mocks.requirePermission.mockResolvedValue({ error: "Forbidden", status: 403 });
    const response = await resetUserPassword(new Request("http://test/api/admin/users/u1", { method: "POST" }), { params: Promise.resolve({ id: "u1" }) });
    expect(response.status).toBe(403);
  });

  it("returns temporary password once with Cache-Control: no-store on create", async () => {
    mocks.prisma.committee.findUnique.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({ id: "u2", name: "New", email: "new@mt.test", role: "ADMIN", position: "LEADER", isMTC: false, committeeId: null });
    const response = await createUser(new Request("http://test/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New User", email: "new@mt.test", role: "ADMIN", position: "LEADER", isMTC: false }),
    }));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.temporaryPassword).toBe("TempPass123456");
    const createData = mocks.prisma.user.create.mock.calls[0][0].data;
    expect(createData.mustChangePassword).toBe(true);
    expect(createData.temporaryPasswordExpiresAt).toBeInstanceOf(Date);
    expect(createData.temporaryPasswordExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mocks.writeAuditLog).toHaveBeenCalled();
    expect(JSON.stringify(mocks.writeAuditLog.mock.calls)).not.toContain("TempPass123456");
  });

  it("returns temporary password once with Cache-Control: no-store on reset and invalidates previous credentials", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    const response = await resetUserPassword(new Request("http://test/api/admin/users/u1", { method: "POST" }), { params: Promise.resolve({ id: "u1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.temporaryPassword).toBe("TempPass123456");
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    const txOps = mocks.prisma.$transaction.mock.calls[0][0] as any[];
    expect(mocks.prisma.user.update).toHaveBeenCalled();
    const updateArgs = mocks.prisma.user.update.mock.calls[0][0];
    expect(updateArgs.data.mustChangePassword).toBe(true);
    expect(updateArgs.data.sessionVersion).toEqual({ increment: 1 });
    expect(updateArgs.data.temporaryPasswordExpiresAt).toBeInstanceOf(Date);
    expect(mocks.prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(JSON.stringify(mocks.writeAuditLog.mock.calls)).not.toContain("TempPass123456");
  });
});

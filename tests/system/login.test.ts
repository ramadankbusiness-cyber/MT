import { describe, expect, it } from "vitest";
import {
  authenticateCredentials,
  getPostLoginPath,
  LOGIN_MAX_ATTEMPTS,
  safeReturnPath,
  type LoginAccount,
} from "../../lib/login";

const now = Date.parse("2026-11-10T09:00:00.000Z");
const baseAccount: LoginAccount = {
  id: "member-1",
  name: "MT Member",
  email: "member@mtclub.test",
  passwordHash: "hashed-password",
  role: "MEMBER",
  committeeId: "committee-1",
  isActive: true,
  mustChangePassword: false,
  sessionVersion: 0,
};

function createLoginHarness(account: LoginAccount | null, initialFailures: Date[] = []) {
  const failures = [...initialFailures];
  const dependencies = {
    findUser: async () => account,
    recentFailures: async (_email: string, _ipHash: string, since: Date) => failures.filter((date) => date >= since),
    comparePassword: async (password: string, hash: string) => password === "correct-password" && hash === "hashed-password",
    recordAttempt: async (_email: string, _ipHash: string, succeeded: boolean) => {
      if (!succeeded) failures.push(new Date(now));
    },
    dummyPasswordHash: "dummy-hash",
    now: () => now,
  };
  return { dependencies, failures };
}

describe("credential login", () => {
  it.each(["ADMIN", "LEADER", "MEMBER"] as const)("authenticates %s accounts", async (role) => {
    const account = { ...baseAccount, role };
    const { dependencies } = createLoginHarness(account);
    const result = await authenticateCredentials(
      { email: account.email, password: "correct-password", ipHash: "ip-hash", rememberMe: true },
      dependencies,
    );
    expect(result).toEqual({ account, rememberMe: true });
  });

  it("uses the same invalid-credentials result for a wrong password", async () => {
    const { dependencies } = createLoginHarness(baseAccount);
    const result = await authenticateCredentials(
      { email: baseAccount.email, password: "wrong-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ failure: "invalid" });
  });

  it("reports a disabled account only after its password matches", async () => {
    const disabledAccount = { ...baseAccount, isActive: false };
    const { dependencies } = createLoginHarness(disabledAccount);
    const result = await authenticateCredentials(
      { email: baseAccount.email, password: "correct-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ failure: "disabled" });
  });

  it("locks the IP/email pair for the remaining rolling window after five failures", async () => {
    const fourFailures = Array.from({ length: LOGIN_MAX_ATTEMPTS - 1 }, () => new Date(now));
    const { dependencies, failures } = createLoginHarness(baseAccount, fourFailures);
    const result = await authenticateCredentials(
      { email: baseAccount.email, password: "wrong-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ failure: "locked", retryAfterMinutes: 15 });
    expect(failures).toHaveLength(LOGIN_MAX_ATTEMPTS);
  });
});

describe("login destinations", () => {
  it("accepts only safe same-site relative paths", () => {
    expect(safeReturnPath("/attendance?session=next")).toBe("/attendance?session=next");
    expect(safeReturnPath("//example.com")).toBeNull();
    expect(safeReturnPath("/\\example.com")).toBeNull();
    expect(safeReturnPath("https://example.com")).toBeNull();
  });

  it("returns to the requested page or the dashboard and prioritizes forced password changes", () => {
    expect(getPostLoginPath(false, "/profile")).toBe("/profile");
    expect(getPostLoginPath(false, "//example.com")).toBe("/dashboard");
    expect(getPostLoginPath(true, "/profile")).toBe("/change-password");
  });
});

import { describe, expect, it } from "vitest";
import {
  authenticateCredentials,
  getLoginErrorReference,
  isCredentialSignInFailure,
  getPostLoginPath,
  isSignInSuccess,
  LOGIN_MAX_ATTEMPTS,
  removeLocalePrefix,
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
  temporaryPasswordExpiresAt: null,
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
  it("authenticates a temporary password before it expires", async () => {
    const tempAccount = {
      ...baseAccount,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(now + 60_000),
    };
    const { dependencies } = createLoginHarness(tempAccount);
    const result = await authenticateCredentials(
      { email: tempAccount.email, password: "correct-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ account: tempAccount, rememberMe: false });
  });

  it("rejects an expired temporary password with a generic invalid failure", async () => {
    const expiredAccount = {
      ...baseAccount,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(now - 1),
    };
    const { dependencies } = createLoginHarness(expiredAccount);
    const result = await authenticateCredentials(
      { email: expiredAccount.email, password: "correct-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ failure: "invalid" });
  });

  it("authenticates a normal password when no temporary expiration exists", async () => {
    const normalAccount = { ...baseAccount, mustChangePassword: false, temporaryPasswordExpiresAt: null };
    const { dependencies } = createLoginHarness(normalAccount);
    const result = await authenticateCredentials(
      { email: normalAccount.email, password: "correct-password", ipHash: "ip-hash", rememberMe: false },
      dependencies,
    );
    expect(result).toEqual({ account: normalAccount, rememberMe: false });
  });


describe("login destinations", () => {
  it("does not treat an HTTP-success Auth.js response containing a credential error as login success", () => {
    expect(isSignInSuccess({ ok: true })).toBe(true);
    expect(isSignInSuccess({ ok: true, error: "CredentialsSignin" })).toBe(false);
    expect(isSignInSuccess({ ok: false })).toBe(false);
    expect(isSignInSuccess(undefined)).toBe(false);
  });

  it("distinguishes invalid credentials from Auth.js configuration and server errors", () => {
    expect(isCredentialSignInFailure({ error: "CredentialsSignin" })).toBe(true);
    expect(isCredentialSignInFailure({ code: "account-disabled" })).toBe(true);
    expect(isCredentialSignInFailure({ code: "try-again-15" })).toBe(true);
    expect(isCredentialSignInFailure({ error: "Configuration" })).toBe(false);
    expect(isCredentialSignInFailure({ error: "AccessDenied" })).toBe(false);
    expect(isCredentialSignInFailure(undefined)).toBe(false);
  });

  it("extracts only opaque login error references and does not misclassify them as bad credentials", () => {
    expect(getLoginErrorReference("login-error-a1b2c3d4")).toBe("a1b2c3d4");
    expect(getLoginErrorReference("login-error-PrismaClient")).toBeNull();
    expect(getLoginErrorReference(undefined)).toBeNull();
    expect(isCredentialSignInFailure({ error: "CredentialsSignin", code: "login-error-a1b2c3d4" })).toBe(false);
  });

  it("accepts only safe same-site relative paths", () => {
    expect(safeReturnPath("/attendance?session=next")).toBe("/attendance?session=next");
    expect(safeReturnPath("//example.com")).toBeNull();
    expect(safeReturnPath("/\\example.com")).toBeNull();
    expect(safeReturnPath("https://example.com")).toBeNull();
  });

  it("removes an existing locale prefix before locale-aware navigation", () => {
    expect(removeLocalePrefix("/en/dashboard")).toBe("/dashboard");
    expect(removeLocalePrefix("/en/en/dashboard")).toBe("/dashboard");
    expect(removeLocalePrefix("/ar/admin/users?tab=active")).toBe("/admin/users?tab=active");
    expect(removeLocalePrefix("/en")).toBe("/");
    expect(removeLocalePrefix("/dashboard")).toBe("/dashboard");
  });

  it("returns to the requested page or the dashboard and prioritizes forced password changes", () => {
    expect(getPostLoginPath(false, "/profile")).toBe("/profile");
    expect(getPostLoginPath(false, "/en/dashboard")).toBe("/dashboard");
    expect(getPostLoginPath(false, "/ar/admin/reports")).toBe("/admin/reports");
    expect(getPostLoginPath(false, "//example.com")).toBe("/dashboard");
    expect(getPostLoginPath(true, "/profile")).toBe("/change-password");
  });
});

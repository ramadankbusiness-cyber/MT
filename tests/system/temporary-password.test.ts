import { describe, expect, it } from "vitest";
import { createTemporaryPassword } from "../../lib/security";
import { forgotPasswordSchema, passwordSchema, resetPasswordSchema } from "../../lib/schemas";

describe("temporary password generation and compatibility", () => {
  it("generates cryptographically random temporary passwords that satisfy the password policy", () => {
    const samples = Array.from({ length: 50 }, () => createTemporaryPassword());
    for (const password of samples) {
      expect(password.length).toBeGreaterThanOrEqual(12);
      expect(password.length).toBeLessThanOrEqual(128);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(passwordSchema.shape.newPassword.safeParse(password).success).toBe(true);
      expect(resetPasswordSchema.shape.newPassword.safeParse(password).success).toBe(true);
    }
    expect(new Set(samples).size).toBe(samples.length);
  });

  it("keeps existing self-service password reset request validation compatible", () => {
    expect(forgotPasswordSchema.safeParse({ email: "member@example.com" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: "x".repeat(32), newPassword: "StrongPass12345" }).success).toBe(true);
  });
});

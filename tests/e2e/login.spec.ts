import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../lib/generated/prisma/index.js";

dotenv.config({ path: ".env.local" });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@mtclub.local").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MEMBER_EMAIL = "member.e2e@mtclub.local";
const MEMBER_PASSWORD = "MemberE2ePass123!Aa";

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
  throw new Error("Set a 16+ character ADMIN_PASSWORD in .env.local before running the login e2e tests.");
}

const prisma = new PrismaClient();

const slow = { timeout: 55000 };

test.describe("login", () => {
  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        name: "MT Club Admin",
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
      create: {
        name: "MT Club Admin",
        email: ADMIN_EMAIL,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
    });

    const memberPasswordHash = await bcrypt.hash(MEMBER_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: MEMBER_EMAIL },
      update: {
        name: "E2E Member",
        role: "MEMBER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: memberPasswordHash,
      },
      create: {
        name: "E2E Member",
        email: MEMBER_EMAIL,
        role: "MEMBER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: memberPasswordHash,
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  async function goToLogin(page: Parameters<typeof test>[0]["page"]) {
    await page.goto("/en/login", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(500);
  }

  async function submitCredentials(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const submitUrl = page.url();
      await page.getByLabel("Email").fill(email);
      await page.getByRole("textbox", { name: "Password" }).fill(password);
      await page.getByRole("button", { name: "Log in" }).click();
      try {
        await Promise.race([
          page.waitForResponse((response) => response.url().includes("/api/auth/callback/credentials"), { timeout: 6000 }),
          page.locator(".login-message").waitFor({ state: "visible", timeout: 6000 }),
          page.locator(".login-field-error").first().waitFor({ state: "visible", timeout: 6000 }),
        ]);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await page.goto(submitUrl, { waitUntil: "load" }).catch(() => {});
      }
    }
    throw lastError ?? new Error("Login submission did not reach the server.");
  }

  async function logIn(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
    await goToLogin(page);
    await submitCredentials(page, email, password);
  }

  test("wrong password shows the Incorrect email or password error", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, "wrong-password-12345");
    await expect(page.locator(".login-message")).toHaveText("Incorrect email or password");
    await expect(page).toHaveURL(/\/en\/login/, slow);
  });

  test("empty fields show validation errors", async ({ page }) => {
    await goToLogin(page);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("#login-email-error")).toHaveText("Enter a valid email address.");
    await expect(page.locator("#login-password-error")).toHaveText("Enter your password.");
  });

  test("correct admin credentials log in and redirect to the dashboard", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/en\/dashboard$/, slow);
    await expect(page.locator("main h1")).toContainText("Welcome back");
  });

  test("refreshing the page keeps the session", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/en\/dashboard$/, slow);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/dashboard$/, slow);
    await expect(page.locator("main h1")).toContainText("Welcome back");
  });

  test("visiting a protected page while logged out redirects to login and returns to it after login", async ({ page }) => {
    await page.goto("/en/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/login/, slow);
    await submitCredentials(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/en\/admin\/users/, slow);
  });

  test("log out ends the session and blocks protected pages again", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/en\/dashboard$/, slow);
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/en(\?|$)/, slow);
    const sessionResponse = await page.request.get("/api/auth/session");
    let session: { user?: unknown } | null = null;
    try {
      session = await sessionResponse.json();
    } catch {}
    expect(session?.user).toBeUndefined();

    await page.goto("/en/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/login/, slow);
  });

  test("a Member account cannot open admin pages (403)", async ({ page }) => {
    await logIn(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await expect(page).toHaveURL(/\/en\/dashboard$/, slow);
    await page.goto("/en/admin/users", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/en\/forbidden/, slow);
    await expect(page.locator("main h1")).toHaveText("No access here");
    await expect(page.locator(".error-code")).toHaveText("403");
  });
});

import { test, expect } from "@playwright/test";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../lib/generated/prisma/index.js";

dotenv.config({ path: ".env.local" });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@mtclub.local").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16) {
  throw new Error("Set a 16+ character ADMIN_PASSWORD in .env.local before running the login e2e tests.");
}

const prisma = new PrismaClient();

async function goToLogin(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/en/login", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Log in" }).waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(2000);
}

async function submitCredentials(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  try {
    await page.waitForURL(({ pathname }) => !pathname.startsWith("/en/login"), { timeout: 15000 });
  } catch {
    // If URL didn't change, try direct API call
    if (page.url().includes("/en/login")) {
      await page.evaluate(async ({email, password}) => {
        const csrfResponse = await fetch("/api/auth/csrf");
        const csrfData = await csrfResponse.json();
        const response = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email, password, rememberMe: "false",
            callbackUrl: "/en/dashboard", json: "true",
            csrfToken: csrfData.csrfToken
          }).toString()
        });
        if (response.ok) {
          const result = await response.json();
          if (result.ok) {
            window.location.href = "/en/dashboard";
          }
        }
      }, { email, password });
      await page.waitForURL(({ pathname }) => !pathname.startsWith("/en/login"), { timeout: 15000 });
    }
  }
}

async function logIn(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  await goToLogin(page);
  await submitCredentials(page, email, password);
}

test.describe("committee zones", () => {
  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { name: "MT Club Admin", role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash },
      create: { name: "MT Club Admin", email: ADMIN_EMAIL, role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("team admin form: create member with committee and verify it shows", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Go to admin team page
    await page.goto("/en/admin/team", { waitUntil: "domcontentloaded" });

    // Click add team member
    await page.getByRole("button", { name: /add person/i }).click();

    // Fill in team member form
    await page.getByLabel("Full name").fill("E2E Test Member");
    await page.getByLabel("Event title (English)").fill("Test Lead");

    // Select a committee from the dropdown
    await page.getByLabel("Committee").click();
    await page.getByRole("option", { name: "OC", exact: false }).first().click();

    // Save
    await page.getByRole("button", { name: /save person/i }).click();

    // Verify the member appears
    await expect(page.getByText("E2E Test Member")).toBeVisible();
    await expect(page.getByText(/OC/)).toBeVisible();
  });

  test("join form: select committees and submit", async ({ page }) => {
    await page.goto("/en/join", { waitUntil: "domcontentloaded" });

    // Fill in the form
    await page.getByLabel("Full name").fill("Join Test User");
    await page.getByLabel("Email address").fill("jointest@example.com");

    // Select committees via multi-select
    await page.selectOption("#join-committee", ["OC", "Tech"]);

    // Fill message
    await page.getByLabel("A message for us").fill("I want to join the club!");

    // Submit
    await page.getByRole("button", { name: /send your application/i }).click();

    // Verify success
    await expect(page.getByText("Thanks for reaching out!")).toBeVisible();
  });
});

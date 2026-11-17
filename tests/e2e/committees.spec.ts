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

const COMMITTEES = [
  { key: "oc", name: "OC", nameAr: "اللجنة التنظيمية", descriptionEn: "Organizing", descriptionAr: "تنظيمية", order: 1 },
  { key: "hr", name: "HR", nameAr: "الموارد البشرية", descriptionEn: "HR", descriptionAr: "موارد", order: 2 },
  { key: "pr", name: "PR", nameAr: "العلاقات العامة", descriptionEn: "PR", descriptionAr: "علاقات", order: 3 },
  { key: "tech", name: "Tech", nameAr: "اللجنة التقنية", descriptionEn: "Tech", descriptionAr: "تقنية", order: 4 },
  { key: "logistics", name: "Logistics", nameAr: "اللوجستيات", descriptionEn: "Logistics", descriptionAr: "لوجستيات", order: 5 },
  { key: "media", name: "Media", nameAr: "الميديا", descriptionEn: "Media", descriptionAr: "ميديا", order: 6 },
  { key: "firstaid", name: "First Aid", nameAr: "الإسعافات الأولية", descriptionEn: "First Aid", descriptionAr: "إسعافات", order: 7 },
] as const;

async function goToLogin(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/en/login", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Log in" }).waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function submitCredentials(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  try {
    await page.waitForURL(({ pathname }) => !pathname.startsWith("/en/login"), { timeout: 15000 });
  } catch {
    if (page.url().includes("/en/login")) {
      await page.evaluate(async ({ email, password }) => {
        const csrfResponse = await fetch("/api/auth/csrf");
        const csrfData = await csrfResponse.json();
        const response = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            email, password, rememberMe: "false",
            callbackUrl: "/en/dashboard", json: "true",
            csrfToken: csrfData.csrfToken,
          }).toString(),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.ok) window.location.href = "/en/dashboard";
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

test.describe("committees", () => {
  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { name: "MT Club Admin", role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash },
      create: { name: "MT Club Admin", email: ADMIN_EMAIL, role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash },
    });
    for (const committee of COMMITTEES) {
      await prisma.committee.upsert({
        where: { key: committee.key },
        update: { name: committee.name, nameAr: committee.nameAr, descriptionEn: committee.descriptionEn, descriptionAr: committee.descriptionAr, order: committee.order },
        create: committee,
      });
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("team admin form: create regular and MTC members with positions", async ({ page }) => {
    await logIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/en/team", { waitUntil: "domcontentloaded" });

    const ts = Date.now();
    const headName = `E2E Head ${ts}`;
    await page.getByRole("button", { name: "Add person" }).first().click();
    await page.getByLabel("Full name").fill(headName);
    await page.getByLabel("Position").selectOption("HEAD");
    await page.getByLabel("Part of MTC / Club heads").check();
    await expect(page.getByLabel("Title (English)")).toHaveValue(/HEAD MTC/i);
    await page.getByLabel("Title (English)").fill("HEAD MTC");
    await page.getByRole("button", { name: "Save person" }).click();
    await expect(page.getByText(headName)).toBeVisible();
    await expect(page.getByRole("heading", { name: "MTC", exact: true })).toBeVisible();

    const viceName = `E2E Vice ${ts}`;
    await page.getByRole("button", { name: "Add person" }).first().click();
    await page.getByLabel("Full name").fill(viceName);
    await page.getByLabel("Position").selectOption("VICE");
    await page.getByLabel("Part of MTC / Club heads").check();
    await page.getByLabel("Title (English)").fill("VICE MTC");
    await page.getByRole("button", { name: "Save person" }).click();
    await expect(page.getByText(viceName)).toBeVisible();

    const leaderName = `E2E Leader ${ts}`;
    await page.getByRole("button", { name: "Add person" }).first().click();
    await page.getByLabel("Full name").fill(leaderName);
    await page.getByLabel("Position").selectOption("LEADER");
    await page.getByLabel("Committee").selectOption({ label: "OC" });
    await page.getByLabel("Title (English)").fill("Leader of OC");
    await page.getByRole("button", { name: "Save person" }).click();
    await expect(page.getByText(leaderName)).toBeVisible();
  });

  test("join form and about page do not include MTC", async ({ page }) => {
    await page.goto("/en/join", { waitUntil: "domcontentloaded" });
    const options = await page.locator("#join-committee option").allTextContents();
    expect(options.join(" ")).not.toContain("MTC");
    await page.goto("/en/about", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("MTC");
  });

  test("join form: select committees and submit", async ({ page }) => {
    await page.goto("/en/join", { waitUntil: "domcontentloaded" });

    await page.getByLabel("Full name").fill("Join Test User");
    await page.getByLabel("Email address").fill(`jointest+${Date.now()}@example.com`);
    await page.locator("#join-committee").selectOption(["OC", "Tech"]);
    await page.getByLabel("A message for us").fill("I want to join the club!");
    await page.getByRole("button", { name: /send your application/i }).click();

    await expect(page.getByText(/thanks for reaching out/i)).toBeVisible();
  });
});

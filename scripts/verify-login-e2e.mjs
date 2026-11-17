import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const email = process.env.ADMIN_EMAIL || "admin@mtclub.local";
const password = `${randomBytes(32).toString("base64url")}Aa1!`;
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const port = Number(process.env.LOGIN_TEST_PORT || "3002");
const baseUrl = `http://localhost:${port}`;
const checks = [];
let server;
let browser;
let prisma;
let serverOutput = "";
let userId;
let browserDiagnostics = "";

function record(name) {
  checks.push(name);
}

function runSeed() {
  const result = spawnSync(process.execPath, [
    path.join(root, "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(root, "prisma", "seed-admin.ts"),
    "--reset-password",
  ], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_PROVIDER: "sqlite",
      DATABASE_URL: databaseUrl,
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
    },
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Admin seed failed: ${(result.stderr || result.stdout || "").slice(-3000)}`);
  }
}

function setupTestDatabase() {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "setup-database.mjs")], {
    cwd: root,
    env: { ...process.env, DATABASE_PROVIDER: "sqlite", DATABASE_URL: databaseUrl },
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Test database setup failed: ${(result.stderr || result.stdout || "").slice(-3000)}`);
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (server.exitCode !== null) throw new Error("Next.js stopped before becoming ready.");
    try {
      const response = await fetch(`${baseUrl}/en/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for the Next.js login page.");
}

async function warmAuthRoutes() {
  for (const route of ["providers", "csrf"]) {
    const response = await fetch(`${baseUrl}/api/auth/${route}`);
    if (!response.ok) throw new Error(`Auth.js ${route} endpoint returned ${response.status}.`);
  }
}

async function assertPortAvailable() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

async function login(page, submittedPassword) {
  await page.goto(`${baseUrl}/en/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(submittedPassword);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function main() {
  await assertPortAvailable();
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_URL = databaseUrl;
  setupTestDatabase();
  runSeed();
  const { PrismaClient } = await import("../lib/generated/prisma/index.js");
  prisma = new PrismaClient();
  const account = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  userId = account.id;
  await prisma.$disconnect();
  prisma = null;

  server = spawn(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        AUTH_DEBUG_LOGIN: "true",
        AUTH_URL: baseUrl,
        DATABASE_URL: databaseUrl,
        NEXT_DIST_DIR: ".next-login-test",
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [server.stdout, server.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      serverOutput = `${serverOutput}${chunk}`.slice(-12000);
    });
  }

  await waitForServer();
  await warmAuthRoutes();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const authRequests = [];
  const pageErrors = [];
  const consoleErrors = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/auth/")) {
      authRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/api/auth/")) {
      authRequests.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await login(page, `${password}wrong`);
  try {
    await page.locator(".login-message").filter({ hasText: "Incorrect email or password" }).waitFor({ state: "visible", timeout: 30000 });
  } catch {
    const formState = await page.locator("form.login-form").evaluate((form) => ({
      action: form.getAttribute("action"),
      method: form.getAttribute("method"),
      button: form.querySelector("button[type=submit]")?.textContent?.trim(),
      disabled: form.querySelector("button[type=submit]")?.disabled,
      email: form.querySelector("input[name=email]")?.value,
      passwordLength: form.querySelector("input[name=password]")?.value.length,
      fieldErrors: [...form.querySelectorAll(".login-field-error")].map((element) => element.textContent),
    }));
    browserDiagnostics = `URL: ${page.url()}\nAlerts: ${(await page.getByRole("alert").allTextContents()).join(" | ")}\nAuth requests: ${authRequests.join(" | ")}\nForm state: ${JSON.stringify(formState)}\nBrowser errors: ${pageErrors.join(" | ")}\nConsole errors: ${consoleErrors.join(" | ")}`;
    throw new Error("Wrong-password submission did not show the expected inline message.");
  }
  record("wrong password shows Incorrect email or password");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/en/dashboard", { timeout: 30000, waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
  assert.match(new URL(page.url()).pathname, /^\/en\/dashboard$/);
  assert.match(await page.locator("main h1").innerText(), /Welcome/i);
  record("correct Admin credentials open the dashboard");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/en/dashboard", { timeout: 15000, waitUntil: "domcontentloaded" });
  assert.match(await page.locator("main h1").innerText(), /Welcome/i);
  record("refresh preserves the authenticated session");

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((url) => url.pathname === "/en", { timeout: 15000, waitUntil: "domcontentloaded" });
  const sessionAfterLogout = await page.evaluate(async () => {
    const response = await fetch("/api/auth/session");
    return response.json();
  });
  assert.equal(sessionAfterLogout?.user, undefined);
  record("logout clears the Auth.js session");

  await page.goto(`${baseUrl}/en/admin/users`, { waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/en/login", { timeout: 15000, waitUntil: "domcontentloaded" });
  record("logged-out access to protected Admin pages redirects to login");

  const { PrismaClient: TestPrismaClient } = await import("../lib/generated/prisma/index.js");
  prisma = new TestPrismaClient();
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  await login(page, password);
  try {
    await page.locator(".login-message").filter({ hasText: "Your account is disabled, contact the admin." }).waitFor({ state: "visible", timeout: 15000 });
  } catch {
    browserDiagnostics = `URL: ${page.url()}\nAlerts: ${(await page.getByRole("alert").allTextContents()).join(" | ")}\nAuth requests: ${authRequests.join(" | ")}\nBrowser errors: ${pageErrors.join(" | ")}\nConsole errors: ${consoleErrors.join(" | ")}`;
    throw new Error("Disabled-account submission did not show its expected inline message.");
  }
  record("disabled accounts receive their own error message");
}

try {
  await main();
} catch (error) {
  console.error("Playwright login verification failed.");
  if (error instanceof Error) console.error(error.message);
  if (browserDiagnostics) console.error(browserDiagnostics);
  if (serverOutput) console.error("Next.js development output:\n", serverOutput);
  process.exitCode = 1;
} finally {
  if (userId && prisma) {
    try {
      await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    } catch {}
  }
  await browser?.close();
  await prisma?.$disconnect();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  if (process.platform === "win32") {
    const rootPath = root.replaceAll("'", "''");
    const command = `$connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($connection) { $listener = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $connection.OwningProcess); if ($listener.CommandLine -and $listener.CommandLine.Contains('${rootPath}') -and $listener.CommandLine.Contains('next')) { Stop-Process -Id $connection.OwningProcess -Force } }`;
    const cleanup = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", windowsHide: true });
    if (cleanup.error) console.error("Could not stop the dedicated login-test server:", cleanup.error.message);
  }
}

if (process.exitCode !== 1) {
  console.log(`Playwright verification: ${checks.length} passed`);
  for (const check of checks) console.log(`PASS ${check}`);
  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);
}

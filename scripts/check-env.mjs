import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const required = [
  "DATABASE_URL",
  "DATABASE_PROVIDER",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_API_URL",
  "ADMIN_EMAIL",
];

const missing = [];
for (const name of required) {
  const value = process.env[name];
  if (!value) {
    missing.push(name);
    continue;
  }
  if (name === "AUTH_SECRET" && value.length < 32) {
    missing.push(`${name} (must be at least 32 characters)`);
  }
}

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error(`Set them in ${path.join(root, ".env.local")} (see .env.example).`);
  process.exitCode = 1;
}

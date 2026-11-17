import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import dotenv from "dotenv";

const envPath = ".env.local";
let contents = "";

try {
  contents = await readFile(envPath, "utf8");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
    throw error;
  }
}

const localEnv = dotenv.parse(contents);
if (process.env.AUTH_SECRET) {
  if (process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET in the process environment must contain at least 32 characters.");
  }
  process.exit(0);
}

if (localEnv.AUTH_SECRET && localEnv.AUTH_SECRET.length >= 32) {
  process.exit(0);
}

const generatedSecret = randomBytes(32).toString("base64url");
const lines = contents.split(/\r?\n/);
const secretLine = `AUTH_SECRET=${generatedSecret}`;
let replaced = false;
const updatedLines = lines.map((line) => {
  if (/^\s*AUTH_SECRET\s*=/.test(line)) {
    if (replaced) return "";
    replaced = true;
    return secretLine;
  }
  return line;
});

if (!replaced) {
  while (updatedLines.length && updatedLines[updatedLines.length - 1] === "") updatedLines.pop();
  updatedLines.push(secretLine);
}

await writeFile(envPath, `${updatedLines.join("\n")}\n`, { encoding: "utf8" });
console.info("Generated a local Auth.js secret in the ignored .env.local file.");

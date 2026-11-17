import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getDatabaseProvider, withLocalSqliteSchema } from "./prisma-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const provider = getDatabaseProvider();
const schemaPath = provider === "sqlite"
  ? undefined
  : path.join(root, "prisma", "schema.prisma");

function generate(schema) {
  const result = spawnSync(process.execPath, [prismaCli, "generate", "--schema", schema], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (provider === "sqlite") {
  await withLocalSqliteSchema((schema) => generate(schema));
} else {
  generate(schemaPath);
}

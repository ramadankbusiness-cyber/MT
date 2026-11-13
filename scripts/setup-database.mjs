import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getDatabaseProvider, withLocalSqliteSchema } from "./prisma-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const provider = getDatabaseProvider();

function run(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

function runSeed(seedFile) {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join(root, "prisma", seedFile)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

if (provider === "sqlite") {
  await withLocalSqliteSchema((schema) => run(["db", "push", "--schema", schema, "--skip-generate"]));
  await runSeed("seed-committees.ts");
} else {
  run(["migrate", "dev", "--schema", path.join(root, "prisma", "schema.prisma")]);
}

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { getDatabaseProvider, withLocalSqliteSchema } from "./prisma-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const generateScript = path.join(root, "scripts", "generate-prisma.mjs");
const provider = getDatabaseProvider();

function run(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runSeed(seedFile) {
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "tsx", "dist", "cli.mjs"), path.join(root, "prisma", seedFile)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Ensure the generated Prisma Client matches the active provider before any seed runs.
// This allows `npm run db:migrate`/setup-database.mjs to work independently.
runNodeScript(generateScript);

if (provider === "sqlite") {
  await withLocalSqliteSchema((schema) => run(["db", "push", "--schema", schema, "--skip-generate"]));
  await runSeed("seed-committees.ts");
} else {
  const migrateArgs = process.env.PRISMA_MIGRATE_DEV === "1"
    ? ["migrate", "dev", "--schema", path.join(root, "prisma", "schema.prisma")]
    : ["migrate", "deploy", "--schema", path.join(root, "prisma", "schema.prisma")];
  run(migrateArgs);
  // Ensure client is up to date for the current schema/provider before seeding.
  runNodeScript(generateScript);
  await runSeed("seed-committees.ts");
}

import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { applyDatabaseEnv } from "./database-url.cjs";

mkdirSync("data", { recursive: true });
const database = applyDatabaseEnv(process.env, process.cwd());
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/techpodio.db";
}
if (database.filePath) {
  console.log(`SQLite database: ${database.filePath}`);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["tsx", "prisma/seed.ts"]);
run("npx", ["next", "build"]);

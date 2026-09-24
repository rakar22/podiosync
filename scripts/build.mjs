import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("data", { recursive: true });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/techpodio.db";
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["tsx", "prisma/seed.ts"]);
run("npx", ["next", "build"]);

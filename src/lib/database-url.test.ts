import assert from "node:assert/strict";
import test from "node:test";
import { resolveDatabaseConfig } from "../../scripts/database-url.cjs";

const versioned = "/home/u591947527/domains/podiosync.es/hbuilds/versions/abc/nodejs";
const stable = "/home/u591947527/domains/podiosync.es/data/techpodio.db";

test("a relative sqlite url inside a Hostinger version is moved outside hbuilds", () => {
  const resolved = resolveDatabaseConfig({ databaseUrl: "file:../data/techpodio.db", cwd: versioned });
  assert.equal(resolved.kind, "sqlite");
  assert.equal(resolved.filePath, stable);
  assert.equal(resolved.databaseUrl, `file:${stable}`);
});

test("an absolute sqlite url is kept and a versioned absolute path is moved out", () => {
  const kept = resolveDatabaseConfig({ databaseUrl: `file:${stable}`, cwd: "/tmp" });
  assert.equal(kept.filePath, stable);
  const trapped = resolveDatabaseConfig({
    databaseUrl: "file:/home/u591947527/domains/podiosync.es/hbuilds/versions/abc/nodejs/data/techpodio.db",
    cwd: versioned,
  });
  assert.equal(trapped.filePath, stable);
});

test("SQLITE_PATH overrides the url", () => {
  const resolved = resolveDatabaseConfig({
    databaseUrl: "file:../data/techpodio.db",
    sqlitePath: "/var/lib/techpodio.db",
    cwd: versioned,
  });
  assert.equal(resolved.filePath, "/var/lib/techpodio.db");
  assert.equal(resolved.databaseUrl, "file:/var/lib/techpodio.db");
});

test("postgres urls are left untouched", () => {
  const url = "postgresql://user:pass@localhost:5432/techpodio";
  const resolved = resolveDatabaseConfig({ databaseUrl: url, cwd: versioned });
  assert.equal(resolved.kind, "postgres");
  assert.equal(resolved.databaseUrl, url);
  assert.equal(resolved.filePath, null);
});

test("local relative sqlite urls stay relative", () => {
  const resolved = resolveDatabaseConfig({ databaseUrl: "file:../data/techpodio.db", cwd: "/workspace" });
  assert.equal(resolved.databaseUrl, "file:../data/techpodio.db");
  assert.equal(resolved.filePath, null);
});

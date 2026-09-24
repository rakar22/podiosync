import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyDatabaseEnv, bootstrapSqliteFromPublicHtml, resolveDatabaseConfig } from "../../scripts/database-url.cjs";

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

function withTempDomain(fn: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "techpodio-sqlite-"));
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function captureLogs(fn: () => void) {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    fn();
    return logs;
  } finally {
    console.log = original;
  }
}

test("a missing or tiny durable db is restored once from a real public_html file", () => {
  withTempDomain((root) => {
    const durable = path.join(root, "data", "techpodio.db");
    const fallback = path.join(root, "public_html", "data", "techpodio.db");
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    const payload = Buffer.alloc(2048, 7);
    fs.writeFileSync(fallback, payload);

    const logs = captureLogs(() => {
      const first = bootstrapSqliteFromPublicHtml(durable);
      assert.equal(first.copied, true);
      assert.equal(first.bytes, 2048);
    });
    assert.equal(logs.length, 1);
    assert.match(logs[0], /^SQLite bootstrap: copied public_html fallback \(2048 bytes\) to /);
    assert.match(logs[0], /techpodio\.db$/);
    assert.doesNotMatch(logs[0], /postgres|password|SECRET/i);
    assert.deepEqual(fs.readFileSync(durable), payload);

    fs.writeFileSync(fallback, Buffer.alloc(0));
    const again = captureLogs(() => {
      assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, false);
    });
    assert.deepEqual(again, []);
    assert.deepEqual(fs.readFileSync(durable), payload);
  });
});

test("a healthy durable db is never replaced by public_html, including an empty one", () => {
  withTempDomain((root) => {
    const durable = path.join(root, "data", "techpodio.db");
    const fallback = path.join(root, "public_html", "data", "techpodio.db");
    fs.mkdirSync(path.dirname(durable), { recursive: true });
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    const healthy = Buffer.alloc(1024, 3);
    fs.writeFileSync(durable, healthy);
    fs.writeFileSync(fallback, Buffer.alloc(0));
    assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, false);
    assert.deepEqual(fs.readFileSync(durable), healthy);

    fs.writeFileSync(fallback, Buffer.alloc(8192, 9));
    assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, false);
    assert.deepEqual(fs.readFileSync(durable), healthy);
  });
});

test("an unusable public_html file does not create or replace the durable db", () => {
  withTempDomain((root) => {
    const durable = path.join(root, "data", "techpodio.db");
    const fallback = path.join(root, "public_html", "data", "techpodio.db");
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    fs.writeFileSync(fallback, Buffer.alloc(1023, 1));
    assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, false);
    assert.equal(fs.existsSync(durable), false);

    fs.mkdirSync(path.dirname(durable), { recursive: true });
    fs.writeFileSync(durable, Buffer.alloc(0));
    fs.writeFileSync(fallback + "-wal", Buffer.alloc(40, 2));
    assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, false);
    assert.equal(fs.statSync(durable).size, 0);
    assert.equal(fs.statSync(fallback + "-wal").size, 40);
  });
});

test("a 0-byte durable db is replaced and a stale wal is not kept", () => {
  withTempDomain((root) => {
    const durable = path.join(root, "data", "techpodio.db");
    const fallback = path.join(root, "public_html", "data", "techpodio.db");
    fs.mkdirSync(path.dirname(durable), { recursive: true });
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    fs.writeFileSync(durable, Buffer.alloc(0));
    fs.writeFileSync(`${durable}-wal`, Buffer.alloc(30, 1));
    fs.writeFileSync(fallback, Buffer.alloc(1500, 6));
    fs.writeFileSync(`${fallback}-wal`, Buffer.alloc(80, 6));

    assert.equal(bootstrapSqliteFromPublicHtml(durable).copied, true);
    assert.equal(fs.statSync(durable).size, 1500);
    assert.equal(fs.readFileSync(durable)[0], 6);
    assert.equal(fs.statSync(`${durable}-wal`).size, 80);
    assert.equal(fs.readFileSync(`${durable}-wal`)[0], 6);
    assert.equal(fs.existsSync(`${durable}-shm`), false);
  });
});

test("applyDatabaseEnv restores the public_html fallback before Prisma would open the durable path", () => {
  withTempDomain((root) => {
    const versioned = path.join(root, "hbuilds", "versions", "abc", "nodejs");
    const durable = path.join(root, "data", "techpodio.db");
    const fallback = path.join(root, "public_html", "data", "techpodio.db");
    fs.mkdirSync(versioned, { recursive: true });
    fs.mkdirSync(path.dirname(fallback), { recursive: true });
    fs.mkdirSync(path.dirname(durable), { recursive: true });
    fs.writeFileSync(fallback, Buffer.alloc(2048, 4));
    fs.writeFileSync(durable, Buffer.alloc(100));

    const env: { DATABASE_URL?: string } = { DATABASE_URL: "file:../data/techpodio.db" };
    const resolved = applyDatabaseEnv(env, versioned);
    assert.equal(resolved.filePath, durable);
    assert.equal(env.DATABASE_URL, `file:${durable}`);
    assert.equal(fs.statSync(durable).size, 2048);
    assert.equal(fs.readFileSync(durable)[0], 4);

    fs.writeFileSync(fallback, Buffer.alloc(0));
    applyDatabaseEnv(env, versioned);
    assert.equal(fs.statSync(durable).size, 2048);
    assert.equal(fs.readFileSync(durable)[0], 4);
  });
});

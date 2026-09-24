const fs = require("fs");
const path = require("path");

const DEFAULT_HOSTINGER_SQLITE = "/home/u591947527/domains/podiosync.es/data/techpodio.db";

function isPostgresUrl(url) {
  return /^postgres(ql)?:\/\//i.test(url);
}

function fileUrlToPath(url) {
  let spec = url.slice("file:".length);
  if (spec.startsWith("//")) spec = spec.replace(/^\/\/(?:localhost)?/, "");
  return spec;
}

function isAbsoluteFile(spec) {
  return spec.startsWith("/") || /^[A-Za-z]:[\\/]/.test(spec);
}

function domainSqliteFromVersionedDir(start) {
  if (!start) return null;
  const parts = path.resolve(start).split(path.sep);
  const hbuilds = parts.lastIndexOf("hbuilds");
  if (hbuilds <= 0 || parts[hbuilds + 1] !== "versions") return null;
  const domainRoot = parts.slice(0, hbuilds).join(path.sep) || path.sep;
  return path.join(domainRoot, "data", "techpodio.db");
}

function resolveDatabaseConfig({ databaseUrl = "", sqlitePath = "", cwd = "" } = {}) {
  const raw = String(databaseUrl || "").trim();
  const override = String(sqlitePath || "").trim();

  if (!override && isPostgresUrl(raw)) {
    return { kind: "postgres", databaseUrl: raw, filePath: null };
  }

  let filePath = null;
  if (override) {
    filePath = path.resolve(override);
  } else if (raw.startsWith("file:")) {
    const spec = fileUrlToPath(raw);
    if (isAbsoluteFile(spec)) {
      filePath = spec;
    } else {
      const outside = domainSqliteFromVersionedDir(cwd);
      if (!outside) return { kind: "sqlite", databaseUrl: raw, filePath: null };
      filePath = outside;
    }
  } else if (!raw) {
    const outside = domainSqliteFromVersionedDir(cwd);
    if (!outside) return { kind: "sqlite", databaseUrl: "file:../data/techpodio.db", filePath: null };
    filePath = outside;
  } else {
    return { kind: "other", databaseUrl: raw, filePath: null };
  }

  const outside = domainSqliteFromVersionedDir(cwd);
  if (!override && outside && filePath.split(path.sep).includes("hbuilds")) {
    filePath = outside;
  }

  if (!filePath) filePath = DEFAULT_HOSTINGER_SQLITE;
  return { kind: "sqlite", databaseUrl: `file:${filePath}`, filePath };
}

function applyDatabaseEnv(env = process.env, cwd = process.cwd()) {
  const resolved = resolveDatabaseConfig({
    databaseUrl: env.DATABASE_URL,
    sqlitePath: env.SQLITE_PATH,
    cwd,
  });
  if (resolved.filePath) {
    fs.mkdirSync(path.dirname(resolved.filePath), { recursive: true });
  }
  if (resolved.databaseUrl) env.DATABASE_URL = resolved.databaseUrl;
  return resolved;
}

module.exports = {
  DEFAULT_HOSTINGER_SQLITE,
  resolveDatabaseConfig,
  applyDatabaseEnv,
  domainSqliteFromVersionedDir,
};

const fs = require("fs");
const path = require("path");

const DEFAULT_HOSTINGER_SQLITE = "/home/u591947527/domains/podiosync.es/data/techpodio.db";
const SQLITE_FILENAME = "techpodio.db";
// A real Prisma SQLite file is many KB. 0-byte and header-only files are not.
const MIN_SQLITE_BYTES = 1024;

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

function sqliteFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? stat.size : -1;
  } catch (error) {
    if (error && error.code === "ENOENT") return -1;
    throw error;
  }
}

function publicHtmlSqliteFallback(filePath) {
  if (!filePath) return null;
  const resolved = path.resolve(String(filePath));
  if (path.basename(resolved) !== SQLITE_FILENAME) return null;
  const segments = resolved.split(path.sep);
  if (segments.includes("hbuilds") || segments.includes("public_html")) return null;
  if (path.basename(path.dirname(resolved)) !== "data") return null;
  const domainRoot = path.dirname(path.dirname(resolved));
  const fallback = path.join(domainRoot, "public_html", "data", SQLITE_FILENAME);
  if (path.resolve(fallback) === resolved) return null;
  return fallback;
}

function syncSqliteSidecar(source, dest) {
  for (const suffix of ["-wal", "-shm"]) {
    const from = `${source}${suffix}`;
    const to = `${dest}${suffix}`;
    if (sqliteFileSize(from) > 0) fs.copyFileSync(from, to);
    else fs.rmSync(to, { force: true });
  }
}

// Copy <domainRoot>/public_html/data/techpodio.db onto the durable file only
// when the durable file is missing or under 1KB and the fallback has real size.
// A healthy durable database is never replaced.
function bootstrapSqliteFromPublicHtml(filePath) {
  const fallback = publicHtmlSqliteFallback(filePath);
  if (!fallback) return { copied: false };
  if (sqliteFileSize(filePath) >= MIN_SQLITE_BYTES) return { copied: false };

  const fallbackSize = sqliteFileSize(fallback);
  if (fallbackSize < MIN_SQLITE_BYTES) return { copied: false };

  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const tmp = path.join(directory, `.${SQLITE_FILENAME}.${process.pid}.partial`);
  let copied = false;
  try {
    fs.copyFileSync(fallback, tmp);
    if (sqliteFileSize(tmp) < MIN_SQLITE_BYTES) return { copied: false };
    fs.renameSync(tmp, filePath);
    copied = true;
  } finally {
    if (!copied) fs.rmSync(tmp, { force: true });
  }
  syncSqliteSidecar(fallback, filePath);
  console.log(`SQLite bootstrap: copied public_html fallback (${fallbackSize} bytes) to ${filePath}`);
  return { copied: true, bytes: fallbackSize };
}

function applyDatabaseEnv(env = process.env, cwd = process.cwd()) {
  const resolved = resolveDatabaseConfig({
    databaseUrl: env.DATABASE_URL,
    sqlitePath: env.SQLITE_PATH,
    cwd,
  });
  if (resolved.filePath) {
    fs.mkdirSync(path.dirname(resolved.filePath), { recursive: true });
    bootstrapSqliteFromPublicHtml(resolved.filePath);
  }
  if (resolved.databaseUrl) env.DATABASE_URL = resolved.databaseUrl;
  return resolved;
}

module.exports = {
  DEFAULT_HOSTINGER_SQLITE,
  MIN_SQLITE_BYTES,
  resolveDatabaseConfig,
  applyDatabaseEnv,
  bootstrapSqliteFromPublicHtml,
  domainSqliteFromVersionedDir,
};

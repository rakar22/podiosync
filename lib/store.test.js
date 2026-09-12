import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { SEED_CREATORS } from "./seed.js";
import {
  asMoney,
  categorySummaries,
  claimRank,
  formatUsd,
  getStats,
  parseUsdInput,
  fulfillPaid,
  listBoard,
  quoteClaim,
} from "./store.js";

function withTempBoard(opts, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  const prevDir = process.env.DATA_DIR;
  const prevEmpty = process.env.EMPTY_BOARD;
  const prevKey = process.env.STRIPE_SECRET_KEY;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "podio-store-"));
  process.env.DATA_DIR = dir;
  if (opts.empty) process.env.EMPTY_BOARD = "1";
  else delete process.env.EMPTY_BOARD;
  if (opts.stripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = opts.stripeKey;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      fs.rmSync(dir, { recursive: true, force: true });
      if (prevDir == null) delete process.env.DATA_DIR;
      else process.env.DATA_DIR = prevDir;
      if (prevEmpty == null) delete process.env.EMPTY_BOARD;
      else process.env.EMPTY_BOARD = prevEmpty;
      if (prevKey == null) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = prevKey;
    });
}

test("every seeded creator has a finite positive USD amount", () => {
  for (const c of SEED_CREATORS) {
    assert.equal(Number.isFinite(c.amount), true, c.handle);
    assert.equal(c.amount > 0, true, c.handle);
    const label = formatUsd(c.amount);
    assert.match(label, /^\$/);
    assert.equal(label.includes("NaN"), false);
    assert.notEqual(label.trim(), "");
  }
});

test("formatUsd never returns a blank or NaN price", () => {
  assert.equal(formatUsd(8000), "$8,000");
  assert.equal(formatUsd("7800"), "$7,800");
  assert.equal(formatUsd(25005), "$25,005");
  assert.equal(formatUsd(undefined), "$0");
  assert.equal(formatUsd(NaN), "$0");
  assert.equal(formatUsd(null), "$0");
  assert.equal(asMoney("nope"), 0);
});

test("parseUsdInput reads $ and thousands separators back to an integer", () => {
  assert.equal(parseUsdInput("$25,005"), 25005);
  assert.equal(parseUsdInput("25005"), 25005);
  assert.equal(parseUsdInput("$10"), 10);
  assert.equal(Number.isNaN(parseUsdInput("")), true);
  assert.equal(Number.isNaN(parseUsdInput("$")), true);
});

test("listBoard exposes numeric prices for the seeded roster", async () => {
  await withTempBoard(() => {
    const rows = listBoard("all");
    assert.ok(rows.length >= SEED_CREATORS.length);
    for (const row of rows) {
      assert.equal(Number.isFinite(row.amount), true, row.handle);
      assert.equal(Number.isFinite(row.window_amount), true, row.handle);
      const label = formatUsd(row.window_amount ?? row.amount);
      assert.match(label, /^\$/);
      assert.equal(label.includes("NaN"), false);
    }
    const named = ["@fernanfloo", "@folagorlives", "@lelepons", "@enchufetv", "@dulceida", "@domelipa"];
    for (const handle of named) {
      const row = rows.find((r) => r.handle.toLowerCase() === handle);
      assert.ok(row, handle);
      assert.ok(row.amount > 0, handle);
    }
    const cats = categorySummaries().filter((c) => c.count > 0);
    assert.ok(cats.length > 0);
    for (const c of cats) {
      assert.ok(c.leader);
      assert.equal(Number.isFinite(c.leader.amount), true, c.slug);
    }
  });
});

test("quoteClaim validates handle, amount and category", async () => {
  await withTempBoard({ empty: true }, () => {
    assert.equal(quoteClaim({ handle: "", displayName: "X", category: "belleza", targetTotal: 10 }).ok, false);
    assert.equal(quoteClaim({ handle: "@", displayName: "X", category: "belleza", targetTotal: 10 }).ok, false);
    assert.match(
      quoteClaim({ handle: "@luna", displayName: "", category: "belleza", targetTotal: 10 }).error,
      /nombre/,
    );
    assert.match(
      quoteClaim({ handle: "@luna", displayName: "Luna", category: "nope", targetTotal: 10 }).error,
      /Categoría/,
    );
    assert.match(
      quoteClaim({ handle: "@luna", displayName: "Luna", category: "belleza", targetTotal: "" }).error,
      /monto válido/,
    );
    assert.match(
      quoteClaim({ handle: "@luna", displayName: "Luna", category: "belleza", targetTotal: 9 }).error,
      /entre \$10/,
    );
    const ok = quoteClaim({
      handle: "@lunavarela",
      displayName: "Luna Varela",
      category: "belleza",
      targetTotal: 12,
      url: "instagram.com/lunavarela",
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.charged, 12);
    assert.equal(ok.payload.url, "https://instagram.com/lunavarela");
  });
});

test("fulfillPaid is idempotent and keeps outbid pricing", async () => {
  await withTempBoard({ empty: true }, () => {
    const payload = {
      handle: "@lunavarela",
      displayName: "Luna Varela",
      tagline: "glow",
      description: "bio",
      url: "https://instagram.com/lunavarela",
      platform: "instagram",
      country: "MX",
      category: "belleza",
      targetTotal: 12,
    };
    const first = fulfillPaid("cs_store_1", payload);
    assert.equal(first.ok, true);
    assert.equal(first.rank, 1);
    const again = fulfillPaid("cs_store_1", payload);
    assert.equal(again.ok, true);
    assert.equal(listBoard("all").length, 1);
    assert.equal(listBoard("all")[0].amount, 12);

    const tooLow = claimRank({ ...payload, targetTotal: 12 });
    assert.equal(tooLow.ok, false);
    const raise = claimRank({ ...payload, targetTotal: 13 });
    assert.equal(raise.ok, true);
    assert.equal(listBoard("all")[0].amount, 13);
  });
});

test("getStats exposes only real counters (no fake online)", async () => {
  await withTempBoard(() => {
    const stats = getStats();
    assert.equal("online" in stats, false);
    assert.equal(typeof stats.visitors, "number");
    assert.equal(stats.listings, listBoard("all").length);
    assert.equal(Number.isFinite(stats.revenue), true);
    assert.equal(stats.listings >= SEED_CREATORS.length, true);
  });
});

test("EMPTY_BOARD still starts a wiped ranking", async () => {
  await withTempBoard({ empty: true }, () => {
    const rows = listBoard("all");
    assert.equal(rows.length, 0);
    const stats = getStats();
    assert.equal(stats.listings, 0);
    assert.equal(stats.visitors, 0);
    assert.equal(stats.revenue, 0);
    assert.ok(stats.launched_at);
  });
});

test("launched_at is stamped once when Stripe is live and the field is missing", async () => {
  await withTempBoard({ empty: true, stripeKey: "sk_live_honest_launch" }, () => {
    getStats();
    const file = path.join(process.env.DATA_DIR, "board.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    delete raw.launched_at;
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    const first = getStats().launched_at;
    assert.ok(first);
    const again = getStats().launched_at;
    assert.equal(again, first);
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(saved.launched_at, first);
  });
});

test("launched_at stays missing when Stripe is not live", async () => {
  await withTempBoard({ empty: true }, () => {
    getStats();
    const file = path.join(process.env.DATA_DIR, "board.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    delete raw.launched_at;
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    const stats = getStats();
    assert.equal(stats.launched_at, undefined);
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(saved.launched_at, undefined);
  });
});

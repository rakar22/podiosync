import assert from "node:assert/strict";
import { test } from "node:test";
import {
  creatorsIndex,
  deriveTrending,
  filterRegion,
  parseRegion,
  paymentSeries,
  polarizationIndex,
  polarizationLabel,
  searchListings,
  withPaid24h,
} from "./insights.js";

test("polarizationIndex is 100 on a tie and 0 on consensus", () => {
  assert.equal(polarizationIndex(50, 50), 100);
  assert.equal(polarizationIndex(100, 0), 0);
  assert.equal(polarizationIndex(0, 80), 0);
  assert.equal(polarizationIndex(75, 25), 50);
  assert.equal(polarizationIndex(0, 0), null);
  assert.equal(polarizationLabel(80), "Alta");
  assert.equal(polarizationLabel(40), "Media");
  assert.equal(polarizationLabel(10), "Baja");
  assert.equal(polarizationLabel(null), null);
});

test("filterRegion remaps ranks from existing country codes", () => {
  assert.equal(parseRegion("LATAM"), "latam");
  assert.equal(parseRegion("españa"), "es");
  assert.equal(parseRegion(""), "all");
  const rows = [
    { slug: "a", country: "ES", amount: 3 },
    { slug: "b", country: "MX", amount: 2 },
    { slug: "c", country: "AR", amount: 1 },
  ].map((l, i) => ({ ...l, rank: i + 1 }));
  const es = filterRegion(rows, "es");
  assert.equal(es.length, 1);
  assert.equal(es[0].slug, "a");
  assert.equal(es[0].rank, 1);
  const latam = filterRegion(rows, "latam");
  assert.equal(latam.length, 2);
  assert.equal(latam[0].slug, "b");
  assert.equal(latam[0].rank, 1);
  assert.equal(filterRegion(rows, "all").length, 3);
});

test("trending and search derive from existing vote/total fields", () => {
  const all = [
    {
      slug: "old",
      display_name: "Viejo",
      handle: "@old",
      love: 10,
      hate: 1,
      amount: 100,
      created_at: "2020-01-01T00:00:00.000Z",
      category_slug: "musica",
      country: "ES",
    },
    {
      slug: "hot",
      display_name: "Hot",
      handle: "@hot",
      love: 80,
      hate: 70,
      amount: 50,
      created_at: new Date().toISOString(),
      category_slug: "streaming",
      country: "MX",
    },
  ];
  const today = [{ slug: "hot", window_amount: 12, display_name: "Hot" }];
  const t = deriveTrending({ all, today });
  assert.equal(t.rising[0].slug, "hot");
  assert.equal(t.voted[0].slug, "hot");
  assert.equal(t.newest[0].slug, "hot");
  assert.equal(t.polarized[0].slug, "hot");
  const withPay = withPaid24h(all, today);
  assert.equal(withPay.find((l) => l.slug === "hot").paid_24h, 12);
  const hits = searchListings(all, "hot");
  assert.equal(hits.length, 1);
  assert.equal(searchListings(all, "").length, 0);
  assert.equal(creatorsIndex(all)[0].s, "old");
  const series = paymentSeries([
    { amount: 10, created_at: "2026-01-02T00:00:00.000Z" },
    { amount: 5, created_at: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.equal(series[0].v, 5);
  assert.equal(series[1].v, 15);
});

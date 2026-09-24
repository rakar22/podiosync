import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { editorialCompanies, websiteHostKey } from "./editorial-companies";

const BANNED = /cif|nif|vat|empleado|plantilla|facturac|ingreso|ronda|revenue|funding|headcount|valoraci[oó]n|€|\$|%/i;

function sliceConst(source: string, name: string) {
  const start = source.indexOf(`const ${name}`);
  const end = source.indexOf("];", start);
  assert.ok(start >= 0 && end > start, `missing ${name} in seed.ts`);
  return source.slice(start, end);
}

test("editorial profiles stay inside public directory fields", () => {
  const seed = readFileSync("prisma/seed.ts", "utf8");
  assert.match(seed, /seedEditorialCompanies/);
  const categorySlugs = new Set([...sliceConst(seed, "categories").matchAll(/\["([^"]+)"/g)].map((match) => match[1]));
  const spainCities = new Set(
    [...sliceConst(seed, "cities").matchAll(/\["([^"]+)", "[^"]+", "ES"/g)].map((match) => match[1]),
  );

  assert.ok(editorialCompanies.length >= 20 && editorialCompanies.length <= 25);
  const slugs = new Set<string>();
  const hosts = new Set<string>();

  for (const company of editorialCompanies) {
    assert.deepEqual(Object.keys(company).sort(), ["categorySlugs", "citySlug", "name", "shortDescription", "slug", "website"]);
    assert.equal(slugs.has(company.slug), false);
    slugs.add(company.slug);
    const host = websiteHostKey(company.website);
    assert.equal(hosts.has(host), false);
    hosts.add(host);
    assert.match(company.website, /^https:\/\/[^/]+$/);
    assert.equal(company.shortDescription.length >= 80 && company.shortDescription.length <= 240, true);
    assert.match(company.shortDescription, /Ficha editorial del directorio a partir del sitio público de/);
    assert.match(company.shortDescription, /No incluye métricas ni datos que ese sitio no publique/);
    assert.equal(BANNED.test(company.shortDescription), false);
    assert.equal(/\d/.test(company.shortDescription), false);
    assert.ok(company.categorySlugs.length > 0);
    for (const slug of company.categorySlugs) assert.ok(categorySlugs.has(slug), slug);
    if (company.citySlug) assert.ok(spainCities.has(company.citySlug), company.citySlug);
  }
});

test("website host keys ignore a leading www", () => {
  assert.equal(websiteHostKey("https://www.perk.com"), "perk.com");
  assert.equal(websiteHostKey("https://glovoapp.com"), "glovoapp.com");
});

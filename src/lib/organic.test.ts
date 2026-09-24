import assert from "node:assert/strict";
import test from "node:test";
import { organicScore, rankOrganic } from "./organic";

test("verified profiles rank above bare names", () => {
  const ranked = rankOrganic([
    {
      id: "a",
      name: "A",
      verificationStatus: "UNCLAIMED",
      claimed: false,
      website: null,
      description: null,
      shortDescription: null,
      logo: null,
      technologyCount: 0,
      productCount: 0,
      serviceCount: 0,
      isDemo: false,
    },
    {
      id: "b",
      name: "B",
      verificationStatus: "VERIFIED",
      claimed: true,
      website: "https://b.example",
      description: "x".repeat(90),
      shortDescription: null,
      logo: null,
      technologyCount: 0,
      productCount: 0,
      serviceCount: 0,
      isDemo: false,
    },
  ]);
  assert.equal(ranked[0]?.company.id, "b");
  assert.ok((ranked[0]?.score || 0) > (ranked[1]?.score || 0));
});

test("demo profiles are excluded from the organic list", () => {
  const ranked = rankOrganic([
    {
      id: "demo",
      name: "Demo",
      verificationStatus: "VERIFIED",
      claimed: true,
      website: "https://demo.example",
      description: "x".repeat(90),
      shortDescription: null,
      logo: "logo",
      technologyCount: 3,
      productCount: 1,
      serviceCount: 1,
      isDemo: true,
    },
  ]);
  assert.equal(ranked.length, 0);
});

test("score uses only declared profile facts", () => {
  const score = organicScore({
    id: "c",
    name: "C",
    verificationStatus: "PENDING",
    claimed: false,
    website: "https://c.example",
    description: null,
    shortDescription: null,
    logo: null,
    technologyCount: 0,
    productCount: 0,
    serviceCount: 0,
    isDemo: false,
  });
  assert.deepEqual(score.factors, ["website"]);
  assert.equal(score.score, 10);
});

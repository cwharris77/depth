import { describe, it, expect } from "vitest";
import { TEAMS } from "../teams";
import { contrastRatio, DARK_BG, readableTextOn } from "../colors";

// The contrast guarantee: every team's curated uiAccent must read on the dark UI,
// and on-accent text must read on top of uiAccent. WCAG AA for normal text is 4.5:1.
// This is the test that stops "every 5th team looks broken" when 32 teams are added.
const AA = 4.5;

describe("team uiAccent contrast safety", () => {
  for (const [id, roster] of Object.entries(TEAMS)) {
    const { uiAccent, onAccent } = roster.team.colors;

    it(`${id}: uiAccent reads on the dark background`, () => {
      expect(contrastRatio(uiAccent, DARK_BG)).toBeGreaterThanOrEqual(AA);
    });

    it(`${id}: onAccent reads on top of uiAccent`, () => {
      expect(contrastRatio(onAccent, uiAccent)).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe("readableTextOn(primary) contrast safety", () => {
  // uiAccent is only curated to read on DARK_BG, not on a team's own primary —
  // components that paint text directly onto a primary-filled surface (e.g. the
  // active offense/defense/special toggle) must use readableTextOn(primary)
  // instead, or red-primary teams like the Chiefs render red-on-red (~1.45:1).
  // readableTextOn just picks the better of black/white for an arbitrary brand
  // color, so it can land just under strict AA on a borderline hue (Chargers'
  // #0080C6 blue is ~4.50:1) — the bar here is "not catastrophically bad", not
  // full AA on every possible hex.
  const MIN_ACCEPTABLE = 4;
  for (const [id, roster] of Object.entries(TEAMS)) {
    const { primary } = roster.team.colors;

    it(`${id}: readableTextOn(primary) reads on top of primary`, () => {
      expect(contrastRatio(readableTextOn(primary), primary)).toBeGreaterThanOrEqual(
        MIN_ACCEPTABLE,
      );
    });
  }
});

describe("contrastRatio sanity", () => {
  it("black on white is maximal (21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  it("same color is minimal (1:1)", () => {
    expect(contrastRatio("#69BE28", "#69BE28")).toBeCloseTo(1, 5);
  });
});

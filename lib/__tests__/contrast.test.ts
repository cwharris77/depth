import { describe, it, expect } from "vitest";
import { TEAMS } from "../teams";
import { contrastRatio, readableTextOn } from "../colors";

// uiAccent is now the team's real brand primary (no curated/derived contrast color),
// so we no longer assert every team's accent clears the dark UI — a dark primary that's
// hard to read is a field-background call, not a reason to fake the team's color. What
// still matters: text painted ON a team color must stay legible, so readableTextOn has
// to pick a readable black/white for any brand color.

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

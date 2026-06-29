import { describe, it, expect } from "vitest";
import { TEAMS } from "../teams";
import { contrastRatio, DARK_BG } from "../colors";

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

describe("contrastRatio sanity", () => {
  it("black on white is maximal (21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  it("same color is minimal (1:1)", () => {
    expect(contrastRatio("#69BE28", "#69BE28")).toBeCloseTo(1, 5);
  });
});

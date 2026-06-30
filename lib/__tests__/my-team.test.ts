import { describe, it, expect } from "vitest";
import { resolveHomeTeam } from "../my-team";

const VALID = ["seahawks", "eagles", "49ers"];

describe("resolveHomeTeam", () => {
  it("returns the saved team when it is a known id", () => {
    expect(resolveHomeTeam("eagles", VALID, "seahawks")).toBe("eagles");
  });

  it("falls back to the default when nothing is saved", () => {
    expect(resolveHomeTeam(null, VALID, "seahawks")).toBe("seahawks");
  });

  it("falls back to the default when the saved id is unknown (stale/removed team)", () => {
    expect(resolveHomeTeam("oilers", VALID, "seahawks")).toBe("seahawks");
  });
});

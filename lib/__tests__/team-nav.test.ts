import { describe, it, expect } from "vitest";
import { adjacentTeamId } from "../team-nav";

const ids = ["49ers", "bears", "seahawks"];

describe("adjacentTeamId", () => {
  it("steps forward and backward", () => {
    expect(adjacentTeamId(ids, "bears", "next")).toBe("seahawks");
    expect(adjacentTeamId(ids, "bears", "prev")).toBe("49ers");
  });

  it("wraps around both ends", () => {
    expect(adjacentTeamId(ids, "seahawks", "next")).toBe("49ers");
    expect(adjacentTeamId(ids, "49ers", "prev")).toBe("seahawks");
  });

  it("returns null when the current id isn't in the list", () => {
    expect(adjacentTeamId(ids, "nope", "next")).toBeNull();
  });

  it("returns the same single team rather than stepping off a one-team list", () => {
    expect(adjacentTeamId(["seahawks"], "seahawks", "next")).toBe("seahawks");
    expect(adjacentTeamId(["seahawks"], "seahawks", "prev")).toBe("seahawks");
  });
});

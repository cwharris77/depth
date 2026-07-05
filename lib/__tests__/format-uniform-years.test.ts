import { describe, it, expect } from "vitest";
import { formatUniformYears } from "../uniforms";
import type { TeamColors, Uniform } from "../types";

const COLORS: TeamColors = {
  primary: "#000000",
  secondary: "#ffffff",
  accent: "#888888",
  uiAccent: "#ffffff",
  onAccent: "#000000",
};

function u(partial: Partial<Uniform>): Uniform {
  return {
    id: "t-x",
    teamId: "t",
    name: "X",
    yearStart: null,
    yearEnd: null,
    isCurrent: false,
    colors: COLORS,
    ...partial,
  };
}

describe("formatUniformYears", () => {
  it("shows Current for the open-ended Home kit", () => {
    expect(formatUniformYears(u({ yearStart: null, yearEnd: null }))).toBe("Current");
  });

  it("shows a closed range for a retired kit", () => {
    expect(formatUniformYears(u({ yearStart: 1976, yearEnd: 2001 }))).toBe("1976–2001");
  });

  it("shows the era range for a reintroduced throwback", () => {
    expect(formatUniformYears(u({ yearStart: 1976, yearEnd: 1996, isCurrent: true }))).toBe(
      "1976–1996",
    );
  });

  it("shows present when there is no end year", () => {
    expect(formatUniformYears(u({ yearStart: 2020, yearEnd: null }))).toBe("2020–present");
  });

  it("shows a single year when start equals end", () => {
    expect(formatUniformYears(u({ yearStart: 1994, yearEnd: 1994 }))).toBe("1994");
  });

  it("shows Through when only an end year is known", () => {
    expect(formatUniformYears(u({ yearStart: null, yearEnd: 1975 }))).toBe("Through 1975");
  });
});

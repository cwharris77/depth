import { describe, it, expect } from "vitest";
import { mapDepthchartPosition, mapSpecialPosition, classifyItem } from "./positions";

describe("mapDepthchartPosition", () => {
  it("maps offense keys", () => {
    expect(mapDepthchartPosition("lt")).toBe("LT");
    expect(mapDepthchartPosition("rt")).toBe("RT");
    expect(mapDepthchartPosition("qb")).toBe("QB");
  });
  it("collapses defensive variants", () => {
    expect(mapDepthchartPosition("lde")).toBe("DE");
    expect(mapDepthchartPosition("rde")).toBe("DE");
    expect(mapDepthchartPosition("nt")).toBe("DT");
    expect(mapDepthchartPosition("lilb")).toBe("LB");
    expect(mapDepthchartPosition("fs")).toBe("S");
    expect(mapDepthchartPosition("nb")).toBe("CB");
  });
  it("drops positions not in our enum", () => {
    expect(mapDepthchartPosition("fb")).toBeNull();
    expect(mapDepthchartPosition("h")).toBeNull();
  });
});

describe("mapSpecialPosition", () => {
  it("maps special keys, dropping holder", () => {
    expect(mapSpecialPosition("pk")).toBe("k");
    expect(mapSpecialPosition("kr")).toBe("kr");
    expect(mapSpecialPosition("h")).toBeNull();
  });
});

describe("classifyItem", () => {
  it("classifies by key membership", () => {
    expect(classifyItem(["wr", "lt", "qb", "rb"])).toBe("offense");
    expect(classifyItem(["lde", "nt", "ss", "fs"])).toBe("defense");
    expect(classifyItem(["pk", "p", "kr", "pr"])).toBe("special");
  });
});

import type { Position } from "../types";

const DEPTH_POSITION: Record<string, Position> = {
  qb: "QB",
  rb: "RB",
  wr: "WR",
  te: "TE",
  lt: "LT",
  lg: "LG",
  c: "C",
  rg: "RG",
  rt: "RT",
  lde: "DE",
  rde: "DE",
  nt: "DT",
  dt: "DT",
  wlb: "LB",
  lilb: "LB",
  rilb: "LB",
  slb: "LB",
  lb: "LB",
  mlb: "LB",
  lcb: "CB",
  rcb: "CB",
  cb: "CB",
  nb: "CB",
  ss: "S",
  fs: "S",
  s: "S",
  pk: "K",
  k: "K",
  p: "P",
  ls: "LS",
};

export function mapDepthchartPosition(key: string): Position | null {
  return DEPTH_POSITION[key.toLowerCase()] ?? null;
}

const SPECIAL: Record<string, "k" | "p" | "ls" | "kr" | "pr"> = {
  pk: "k",
  k: "k",
  p: "p",
  ls: "ls",
  kr: "kr",
  pr: "pr",
};

export function mapSpecialPosition(key: string): "k" | "p" | "ls" | "kr" | "pr" | null {
  return SPECIAL[key.toLowerCase()] ?? null;
}

export function classifyItem(
  positionKeys: string[],
): "offense" | "defense" | "special" | "unknown" {
  const keys = positionKeys.map((k) => k.toLowerCase());
  if (keys.some((k) => k === "kr" || k === "pr" || k === "pk")) return "special";
  if (keys.includes("qb")) return "offense";
  if (keys.some((k) => ["lde", "rde", "nt", "ss", "fs", "lcb", "rcb"].includes(k)))
    return "defense";
  return "unknown";
}

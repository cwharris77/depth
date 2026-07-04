import { describe, it, expect } from "vitest";
import { playerDeepLinkPath } from "../share";

describe("playerDeepLinkPath", () => {
  it("builds the team page path with the player as a query param", () => {
    expect(playerDeepLinkPath("seahawks", "abc123")).toBe(
      "/team/seahawks?player=abc123",
    );
  });

  it("url-encodes ids so odd characters can't break the link", () => {
    expect(playerDeepLinkPath("a b", "x&y=z")).toBe("/team/a%20b?player=x%26y%3Dz");
  });
});

import type { MetadataRoute } from "next";

// Web app manifest for the mobile-first app: when added to a home screen it launches
// standalone (no browser chrome) with the dark brand colors, matching the theme-color
// set in the root layout's viewport. Icon reuses the SVG served from app/icon.svg.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Depth · NFL Depth Charts",
    short_name: "Depth",
    description:
      "Interactive, mobile-first NFL depth charts. Pick a team and explore the roster on the field.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e1a",
    theme_color: "#0a0e1a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

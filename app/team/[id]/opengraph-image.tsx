import { ImageResponse } from "next/og";
import { dbRosterSource } from "@/lib/roster-source.db";
import { readableTextOn } from "@/lib/colors";
import { featuredStarters } from "@/lib/og";

export const alt = "Team depth chart";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Prerender one card per team alongside the page (statically optimized + cached).
export async function generateStaticParams() {
  const teams = await dbRosterSource.listTeams();
  return teams.map((team) => ({ id: team.id }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roster = await dbRosterSource.getTeam(id);

  // Unknown id: a clean generic card rather than a broken/blank image.
  if (!roster) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0e1a",
            color: "#f0f4ff",
            fontSize: 72,
            fontWeight: 800,
          }}
        >
          NFL Depth Charts
        </div>
      ),
      { ...size },
    );
  }

  const { team } = roster;
  const bg = team.colors.primary;
  const text = readableTextOn(bg);
  const onLight = text !== "#ffffff";
  const panelBg = onLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)";
  const subtle = onLight ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.72)";
  const starters = featuredStarters(roster);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: bg,
          color: text,
          padding: "76px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 12,
              borderRadius: 6,
              background: team.colors.secondary,
              marginRight: 20,
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 8,
              color: subtle,
            }}
          >
            DEPTH CHART
          </div>
        </div>

        {/* Team name */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: 4,
              color: subtle,
            }}
          >
            {team.city.toUpperCase()}
          </div>
          <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 1 }}>
            {team.name}
          </div>
        </div>

        {/* Featured starters */}
        <div style={{ display: "flex", gap: 20 }}>
          {starters.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                background: panelBg,
                borderRadius: 18,
                padding: "18px 26px",
                minWidth: 220,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: subtle }}>
                {s.label}
              </div>
              <div style={{ fontSize: 38, fontWeight: 700 }}>{s.name}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

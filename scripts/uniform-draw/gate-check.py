#!/usr/bin/env python3
"""Gate-check the fetched mark references against the decal resolution gate.

Implements the two-part gate from the composable-uniform-parts spec (decision
6), exactly as measured for Bears and Seahawks:

  1. Thinnest stroke >= 2px — the 5th-percentile horizontal run length of the
     mark's non-background pixels at the test size.
  2. Component count stable under a 0.75x downscale — a feature one pixel from
     vanishing shows itself as a changed component count when shrunk.

Each reference is tested at 600px and, if that fails, at 1200px, so the report
records the render size a vision model must trace at. Runs shorter than 2px are
treated as anti-alias tips rather than structure (a curved stroke tapers to
1px rows regardless of its true width), matching the spec's p5 measurement.

Run after fetch-mark-refs.py. Read-only; writes nfl-uniform-refs/MARKS-GATE.md
and MARKS-GATE.json.
"""

from __future__ import annotations

import json
import statistics
from pathlib import Path

from PIL import Image

from drawkit import crop_to_art, regions, render_flat

REFS = Path("/Users/cwharris/Documents/GitHubProjects/nfl-uniform-refs")
SIZES = (600, 1200)
SHRINK = 0.75
BG = 245


def load(team: str, size: int) -> tuple[Image.Image, str]:
    """Render the team's mark at `size`; returns (cropped RGB image, kind)."""
    for ext in (".svg", ".png"):
        p = REFS / team / f"{team}-mark{ext}"
        if not p.exists():
            continue
        if ext == ".svg":
            im = render_flat(p.read_text(), size=size)
            return crop_to_art(im, bg=BG), "svg"
        im = Image.open(p).convert("RGBA")
        white = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(white, im).convert("RGB")
        w, h = im.size
        scale = size / max(w, h)
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        return crop_to_art(im, bg=BG), "png"
    raise FileNotFoundError(team)


def p5_run_length(im: Image.Image, pred) -> float:
    """5th-percentile horizontal run length of pixels matching pred (px).

    Runs shorter than 2px are anti-alias tips (any curved stroke tapers to 1px
    rows), not structure, so they are excluded from the statistic.
    """
    p = im.load()
    w, h = im.size
    runs: list[int] = []
    for y in range(h):
        start = None
        for x in range(w):
            hit = pred(p[x, y])
            if hit and start is None:
                start = x
            elif not hit and start is not None:
                if x - start >= 2:
                    runs.append(x - start)
                start = None
        if start is not None and w - start >= 2:
            runs.append(w - start)
    if not runs:
        return 0.0
    return statistics.quantiles(runs, n=20)[0]  # 5th percentile


def component_count(im: Image.Image, pred) -> int:
    return len(regions(im, pred, minsize=15))


def at_size(im: Image.Image, kind: str) -> dict:
    not_bg = lambda rgb: not (rgb[0] > BG and rgb[1] > BG and rgb[2] > BG)  # noqa: E731
    w, h = im.size
    p5 = p5_run_length(im, not_bg)
    comps_full = component_count(im, not_bg)
    shrunk = im.resize((max(1, round(w * SHRINK)), max(1, round(h * SHRINK))), Image.LANCZOS)
    comps_shrunk = component_count(shrunk, not_bg)
    return {
        "px": f"{w}x{h}",
        "p5_run_px": round(p5, 2),
        "components": comps_full,
        "components_at_0.75x": comps_shrunk,
        "thinnest_ok": p5 >= 2.0,
        "stable_ok": comps_full == comps_shrunk,
        "pass": p5 >= 2.0 and comps_full == comps_shrunk,
    }


# Known exceptions, each verified against the team's helmet decal in
# lib/uniforms/teams/*.parts.ts rather than the full logo.
NOTES = {
    "chargers": "DONE 2026-09-08. The fetched logo traces clean and IS the club's bolt, but it "
                "is NOT the decal: flat, it is 2.48 aspect with blunt tails against the shell "
                "decal's 1.71 and swept ones, and fitting it to the decal's box thickens every "
                "stroke. The shipped mark is traced from the GUD helmet itself (93px, upsampled "
                "8x) instead. The logo's OUTER keyline is white - invisible on the white shell, "
                "needed if the navy alternate is ever curated. The pant bolt is a different, "
                "straight bolt and is not drawn at all: it lives on the side seam, which a "
                "front-on figure cannot show. See scripts/uniform-draw/chargers_bolt.py.",
    "steelers": "gate pass requires >=1200px render. The helmet decal is the hypocycloid lockup's "
                "disc + 3 lobes ONLY - no wordmark (a substitute mark was installed 2026-09-06).",
    "raiders": "gate pass requires >=1200px render; the fine 'RAIDERS' text is the fragile part, "
               "and the helmet decal is the shield only (no text). Trace the shield region.",
    "patriots": "pass requires >=900px render; two elements merge below that. Use >=1200px.",
    "rams": "DONE 2026-09-08. The fetched file is the LA lockup and the helmet decal is the horn "
            "alone, which is not in it. Linework came from Commons File:Los Angeles Rams Uniforms "
            "2025.png (~400px helmet, faces left so it is mirrored); placement from the GUD helmet "
            "composite. See scripts/uniform-draw/rams_horn.py.",
    "broncos": "the fetched logo is the horse (current shell). The orange-crush shell wears the "
               "1990s D, which is NOT in this logo - use the era sheet "
               "(nfl-uniform-refs/broncos/broncos-orange-crush-era-1990.png).",
    "titans": "the search resolved the 2026 logo; verify it still matches the circle-T helmet "
              "decal (ring/T/stars) against the GUD helmet composite before tracing.",
    "dolphins": "thinnest strokes are 3px at 600 (the sunburst rays) and the mark only stays "
                "component-stable at 600, not 1200. Trace at >=600px and watch the rays.",
}

# Teams whose decal re-authoring is already complete (no Phase 3 ticket / worked
# example); their reference is fetched for completeness, not for a vision pass.
DONE = {"seahawks"}


def main() -> int:
    results = []
    teams = sorted(
        p.name for p in REFS.iterdir()
        if (p / f"{p.name}-mark.svg").exists() or (p / f"{p.name}-mark.png").exists()
    )
    for team in teams:
        rec = {"team": team}
        for size in SIZES:
            try:
                im, kind = load(team, size)
            except Exception as e:  # noqa: BLE001
                rec.update({"error": str(e), "pass": False, "size_tested": size})
                break
            rec["kind"] = kind
            rec[f"@{size}"] = at_size(im, kind)
            if size == 1200 and not rec[f"@{size}"]["pass"]:
                break
        r600 = rec.get("@600", {})
        r1200 = rec.get("@1200", {})
        if r600.get("pass"):
            rec["pass_size"] = 600
            rec["pass"] = True
        elif r1200.get("pass"):
            rec["pass_size"] = 1200
            rec["pass"] = True
        else:
            rec["pass_size"] = None
            rec["pass"] = False
        rec["note"] = NOTES.get(team, "")
        rec["status"] = "done" if team in DONE else "re-author"
        results.append(rec)
        status = f"PASS@600" if r600.get("pass") else (f"PASS@1200" if rec.get("pass") else "FAIL")
        print(
            f"{team}: {status}"
            f"  p5={r600.get('p5_run_px')}px comps={r600.get('components')}->{r600.get('components_at_0.75x')}"
            f"  art={r600.get('px')}"
        )
        if rec["note"]:
            print(f"        note: {rec['note'][:90]}...")

    (REFS / "MARKS-GATE.json").write_text(json.dumps(results, indent=2))

    def status(r: dict) -> str:
        r6 = r.get("@600", {})
        r12 = r.get("@1200", {})
        if r6.get("pass"):
            return "PASS @600px"
        if r12.get("pass"):
            return "PASS @1200px"
        return "**FAIL**"

    rows = [
        "| team | status | kind | @600 art | p5(600) | comps 600 | comps @0.75x | @1200 stable | gate | note |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        r6 = r.get("@600", {})
        r12 = r.get("@1200", {})
        note = r.get("note", "").replace("|", "\\|")[:100]
        rows.append(
            f"| {r['team']} | {r.get('status', '-')} | {r.get('kind', '-')} | {r6.get('px', '-')} | {r6.get('p5_run_px', '-')} | "
            f"{r6.get('components', '-')} | {r6.get('components_at_0.75x', '-')} | {r12.get('stable_ok', '-')} | "
            f"{status(r)} | {note} |"
        )
    (REFS / "MARKS-GATE.md").write_text("\n".join(rows) + "\n")
    return 0 if all(r.get("pass") for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
#!/usr/bin/env python3
"""Fetch Wikimedia mark references for every team with a helmet decal.

Each team's helmet mark is re-authored (Stage B / Phase 3) from a gate-passing
reference; this script resolves and downloads that reference so the vision pass
only has to place it. Part of the uniform-accuracy workflow: a human runs
gate-check.py after this to record which references clear the resolution gate.

Files are saved as nfl-uniform-refs/<team>/<team>-mark.<ext> — the sibling
reference folder, never the repo. The file's licence metadata is recorded
alongside it, because Stage B's provenance note is per-team.

Resolution order per team: the canonical `File:<City> <Name> logo.svg` on
Commons, then en.wikipedia, then an allimages prefix search on whichever host
actually holds the mark. The three teams whose audit filename never resolved
(Titans, Cowboys, Rams) fall through to search and are recorded as such.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

USER_AGENT = "depth-uniform-gate/1.0 (internal tool; contact cwharris)"
REFS = Path("/Users/cwharris/Documents/GitHubProjects/nfl-uniform-refs")

# teamId -> primary candidate filename (the audit's `<City> <Name> logo.svg`
# pattern). Host preference is decided per team by the licence audit in the
# vault Decisions (2026-09-03): 11 public-domain teams on Commons, the rest on
# en.wikipedia, and the three unresolved ones searched.
TEAMS = {
    "bears": "Chicago Bears logo.svg",
    "bills": "Buffalo Bills logo.svg",
    "broncos": "Denver Broncos logo.svg",
    "buccaneers": "Tampa Bay Buccaneers logo.svg",
    "cardinals": "Arizona Cardinals logo.svg",
    "chargers": "Los Angeles Chargers logo.svg",
    "chiefs": "Kansas City Chiefs logo.svg",
    "colts": "Indianapolis Colts logo.svg",
    "commanders": "Washington Commanders logo.svg",
    "cowboys": "Dallas Cowboys.svg",
    "dolphins": "Miami Dolphins logo.svg",
    "eagles": "Philadelphia Eagles logo.svg",
    "falcons": "Atlanta Falcons logo.svg",
    "giants": "New York Giants logo.svg",
    "jaguars": "Jacksonville Jaguars logo.svg",
    "jets": "New York Jets logo.svg",
    "lions": "Detroit Lions logo.svg",
    "niners": "San Francisco 49ers logo.svg",
    "packers": "Green Bay Packers logo.svg",
    "panthers": "Carolina Panthers logo.svg",
    "patriots": "New England Patriots logo.svg",
    "raiders": "Las Vegas Raiders logo.svg",
    "rams": "Los Angeles Rams Logo.png",
    "ravens": "Baltimore Ravens logo.svg",
    "saints": "New Orleans Saints logo.svg",
    "seahawks": "Seattle Seahawks logo.svg",
    "steelers": "Pittsburgh Steelers logo.svg",
    "texans": "Houston Texans logo.svg",
    "titans": "Tennessee Titans logo.svg",
    "vikings": "Minnesota Vikings logo.svg",
}

HOSTS = ["https://commons.wikimedia.org", "https://en.wikipedia.org"]


def _open(url: str, timeout: int = 60) -> urllib.request.Response:
    """GET with 429 backoff — Wikimedia throttles unauthenticated bursts."""
    delay = 2.0
    for _ in range(6):
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("still rate-limited after backoff")


def api(host: str, params: dict) -> dict:
    params.setdefault("format", "json")
    params.setdefault("formatversion", "2")
    url = host + "/w/api.php?" + urllib.parse.urlencode(params)
    time.sleep(1.0)
    with _open(url, timeout=40) as r:
        return json.load(r)


def imageinfo(host: str, title: str) -> dict | None:
    d = api(host, {
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "redirects": "1",
    })
    for page in d.get("query", {}).get("pages", []):
        if page.get("missing"):
            return None
        ii = page.get("imageinfo", [{}])[0]
        em = ii.get("extmetadata", {})
        return {
            "host": host.split("/")[2],
            "title": page.get("title", title),
            "url": ii.get("url", "").split("?")[0],
            "width": ii.get("width"),
            "height": ii.get("height"),
            "licence": em.get("LicenseShortName", {}).get("value", ""),
            "usage": em.get("UsageTerms", {}).get("value", ""),
        }
    return None


def search_images(host: str, prefix: str) -> list[str]:
    d = api(host, {
        "action": "query",
        "list": "allimages",
        "aiprefix": prefix,
        "ailimit": "50",
    })
    return [im["name"] for im in d.get("query", {}).get("allimages", [])]


def resolve(team: str, candidate: str) -> dict | None:
    # Prefer the host the audit pinned; fall back to the other.
    ordered = HOSTS
    if team in {
        "bears", "bengals", "steelers", "colts", "chiefs", "chargers",
        "giants", "commanders", "packers", "saints", "niners",
    }:
        ordered = [HOSTS[0], HOSTS[1]]
    else:
        ordered = [HOSTS[1], HOSTS[0]]

    for host in ordered:
        info = imageinfo(host, "File:" + candidate)
        if info:
            info["via"] = "canonical"
            return info

    # Search fallback: find any *_logo.svg / logo.svg in the prefix namespace.
    city = candidate.split()[0]
    name = candidate.split()[1] if len(candidate.split()) > 1 else ""
    for host in ordered:
        names = search_images(host, f"{city} {name}")
        picks = [n for n in names if "logo" in n.lower() and (n.lower().endswith(".svg") or n.lower().endswith(".png"))]
        if not picks:
            picks = [n for n in names if n.lower().endswith(".svg")]
        if picks:
            info = imageinfo(host, "File:" + picks[0])
            if info:
                info["via"] = "search:" + picks[0]
                return info
    return None


def main() -> int:
    results = []
    for team, candidate in TEAMS.items():
        info = resolve(team, candidate)
        if not info:
            print(f"{team}: NOT RESOLVED ({candidate})", file=sys.stderr)
            results.append({"team": team, "ok": False})
            continue
        outdir = REFS / team
        outdir.mkdir(parents=True, exist_ok=True)
        ext = Path(info["url"].split("?")[0]).suffix or ".svg"
        dest = outdir / f"{team}-mark{ext}"
        try:
            with _open(info["url"], timeout=60) as r:
                dest.write_bytes(r.read())
        except Exception as e:  # noqa: BLE001
            print(f"{team}: download failed {e}", file=sys.stderr)
            results.append({"team": team, "ok": False, "error": str(e)})
            continue
        rec = {
            "team": team,
            "ok": True,
            "file": dest.name,
            "via": info["via"],
            "host": info["host"],
            "licence": info["licence"],
            "usage": info["usage"][:60],
            "size": f"{info['width']}x{info['height']}",
        }
        results.append(rec)
        print(f"{team}: {dest.name}  [{info['host']} via {info['via']}]  {info['width']}x{info['height']}  {info['licence']}")

    (REFS / "MARKS-FETCH.json").write_text(json.dumps(results, indent=2))
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
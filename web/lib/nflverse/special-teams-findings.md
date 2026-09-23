# Special-teams formations — research spike (2026-09-23)

Findings for the epic ticket `Special teams formations on the field`. Answers the six-unit
feasibility question with real 2025 regular-season row counts. This spike changed no schema,
ingest, or iOS code.

> **Canonical copy lives in the vault** (`Projects/depth/Reference/nflverse.md`). This file is the
> same content committed alongside the spike so the findings travel with the branch; if the two
> ever disagree, the vault copy is authoritative.

## 1. Participation source — confirmed columns

`pbp_participation_<season>.csv` (tag `pbp_participation`), 2025 header:

```
nflverse_game_id,old_game_id,play_id,possession_team,offense_formation,offense_personnel,
defenders_in_box,defense_personnel,number_of_pass_rushers,players_on_play,offense_players,
defense_players,n_offense,n_defense,ngs_air_yards,time_to_throw,was_pressure,route,
defense_man_zone_type,defense_coverage_type,offense_names,defense_names,offense_positions,
defense_positions,offense_numbers,defense_numbers
```

- On-field player ids for both teams: `offense_players` / `defense_players` — semicolon-delimited
  `gsis_id` lists, one per side; `players_on_play` is their union; `n_offense`/`n_defense` are the
  counts (both 11 on a healthy special-teams play). `offense_names`/`defense_names` (and the
  `*_positions` / `*_numbers` arrays) were added later — the 2016–2022 header stops at
  `defense_coverage_type`, so names for older seasons must come from the `players.csv` crosswalk.
- **Special-teams plays are present, not filtered upstream.** For 2025 REG every
  `special_teams_play = 1` play in play-by-play had a matching participation row: 5,995 / 5,995 =
  100%.
- `offense_formation` is blank on special-teams rows, which is exactly why the existing offense
  and defense `FormationAccumulator`s already discard them as noise — their personnel-sum gates
  (`rb+te+wr === 5`, `dl+lb+db === 11`) fail on ST personnel.

## 2. Play-by-play source — unit / kicking-team / join columns

`play_by_play_<season>.csv` (tag `pbp`):

- **Play level:** `special_teams_play` (string `0`/`1`, not a boolean literal) + `play_type_nfl`.
  For 2025 REG, `special_teams_play=1` covers `KICK_OFF` (2,794), `PUNT` (1,933), `XP_KICK`
  (1,268). **`FIELD_GOAL` is `special_teams_play=0`** even though it is a kicking play — its unit
  is identified by `field_goal_attempt=1`, not the ST flag.
- **`st_play_type` exists but is empty in the 2025 file** (every row blank). Do not build on it;
  use `special_teams_play` + `play_type_nfl`.
- **Attempt flags:** `kickoff_attempt`, `punt_attempt`, `field_goal_attempt`, `extra_point_attempt`.
- **Kicking / return sides:** `posteam`, `defteam`, `return_team`. On a `KICK_OFF` the possession
  team is the **receiving** side (`posteam == return_team`; the kicking team is `defteam`). On a
  `PUNT` the possession team is the **punting** side (`posteam` punts; `defteam`/`return_team`
  returns). This orientation flip is the easiest thing to get wrong when assembling units.
- **Onside:** there is no clean onside flag. `own_kickoff_recovery` (1/0) marks only the plays
  where the kicking team recovered its own kick — 5 such plays league-wide in 2025 REG. The only
  reliable "onside attempt" signal is the human-readable `desc` containing `onside`: 52 such
  `KICK_OFF` rows in 2025 REG across 26 kicking teams. So onside *attempts* must be parsed from
  `desc`; `own_kickoff_recovery` is the successful-recovery subset.
- **Join key:** play-by-play `game_id` + `play_id` == participation `nflverse_game_id` + `play_id`.
  Confirmed exact on `2025_01_ARI_NO` (all 20 of its ST plays joined by that key).

## 3. Worked team-season — Detroit Lions, 2025 REG (all six units)

Player ids are `gsis_id`; names come from the 2025 participation `*_names` arrays. "≥50%" = on
the field for at least half that unit's charted plays.

| Unit | plays | games | distinct players | ≥50% | ≥80% |
| --- | --- | --- | --- | --- | --- |
| kickoff (coverage) | 98 | 17 | 28 | 9 | 6 |
| kick return | 86 | 17 | 32 | 9 | 4 |
| punt (coverage) | 56 | 16 | 25 | 10 | 6 |
| punt return | 66 | 17 | 47 | 10 | 4 |
| onside kick | 1 | 1 | 11 | 11 | 11 |
| onside recovery | 5 | 4 | 20 | 9 | 7 |

Top of each unit (plays, pct of unit):

- **kickoff:** Jake Bates 98 (100%), Grant Stuard 98 (100%), Tyrus Wheat 86 (88%), Trevor Nowaske
  86 (88%), Jacob Saylors 85 (87%), Jack Campbell 79 (81%), Daniel Thomas 70 (71%), Sione Vaki 59
  (60%), Khalil Dorsey 51 (52%).
- **kick return:** Grant Stuard 86 (100%), Jacob Saylors 81 (94%), Trevor Nowaske 77 (90%), Tyrus
  Wheat 72 (84%), Sione Vaki 60 (70%), Daniel Thomas 55 (64%), Rock Ya-Sin 53 (62%).
- **punt:** Hogan Hatten, Derrick Barnes, Grant Stuard, Jack Fox, Jacob Saylors — all 56 (100%);
  Trevor Nowaske 50 (89%), Khalil Dorsey 34 (61%), Sione Vaki 31 (55%), Brock Wright 29 (52%).
- **punt return:** Kalif Raymond 60 (91%), Grant Stuard 59 (89%), Jacob Saylors 55 (83%), Trevor
  Nowaske 54 (82%), Avonte Maddox 39 (59%), then a long rotating tail.
- **onside kick:** one charted play, 11 players — not a stable unit.
- **onside recovery:** the "hands team" is visible — Jack Campbell, Grant Stuard, Brock Wright,
  Sam LaPorta, Amon-Ra St. Brown, Isaac TeSlaa all 5 (100%) — but only across 5 plays in 4 games.

Read: the four main units have a real, mostly stable core (~6–10 players clear 50%), with heavy
depth rotation (25–47 distinct players). Receiving units rotate more than kicking units. Onside
samples are an order of magnitude smaller.

## 4. Onside viability (2025 REG, league-wide)

- 52 onside attempts, 26 kicking teams, 22 receiving teams. Per kicking team: max 4 (WAS, NYJ),
  typically 1; six teams had none.
- Only 5 attempts were recovered by the kicking team (NO, CHI, CAR, CLE, CIN — one each).
- **Verdict: per-team onside units are not viable as a first slice.** No team-season has enough
  onside snaps to build a stable 11. Recommend league-standard personnel for onside unless a team
  clears a small sample bar (e.g. ≥4 charted onside plays; only WAS/NYJ reached that in 2025), and
  label any fallback as league-standard, never as the team's own.

## 5. Season coverage + rule versioning

- The participation release exists from **2016** (matches `source-coverage.ts`'s
  `pbp_participation: { minSeason: 2016 }`); 2016–2025 files all resolve.
- **ST membership does not depend on the FTN formation vocabulary**, so it is not FTN-era bound:
  the derivation reads only the player lists plus the pbp ST flags, so it can use the full 2016+
  range (the existing formation fold is the FTN-era-bound piece). The pbp ST columns are present
  back to at least 2018; pbp publishes from 1999.
- **Kickoff geometry must be versioned by season.** The rule changed materially in 2024 (dynamic
  kickoff) and again in 2025. The data shows it plainly (REG):

  | season | kickoffs | returns | return rate | touchbacks (desc) | avg return yds |
  | --- | --- | --- | --- | --- | --- |
  | 2023 | 2,698 | 679 | 25% | 1,970 | 19.9 |
  | 2024 | 2,809 | 922 | 33% | 1,803 | 27.5 |
  | 2025 | 2,794 | 2,078 | 74% | 577 | 25.9 |

  Three regimes, so the geometry module needs at least pre-2024 / 2024 / 2025+ variants (per the
  ticket's framing: 2024+ kicking team at the receiving 40, setup zone 30–35, landing zone;
  pre-2024 the traditional 5-and-5; 2025 onside rules). Punt geometry has no comparable rule break
  and can be a single variant.

## 6. What the data answers vs what it cannot

- **Who plays each unit — yes, derivable** for all six units, from the participation player lists
  classified by the joined play's `play_type_nfl` + kicking side.
- **Where they line up — no.** Public nflverse has no per-player alignment (that is NGS / Big Data
  Bowl tracking, not generally available). Every one of the six units' *alignment* is rule-based
  geometry; only *who* and *how often* (e.g. onside rate) is team-specific.
- **Coverage window:** 2016+. Historical seasons outside it stay on the static SPECIAL-tab dots.

## 7. Recommended schema shape (for the child spec — not written here)

`team_formations`' `(alignment, personnel)` shape does not fit — a ST unit has no alignment string,
and its identity is a set of players, not a personnel count. Recommend a membership table shaped
like the existing formation usage rows:

```
special_teams_unit_members(
  team_id, season, unit, player_id, plays, pct, rank,
  primary key (team_id, season, unit, player_id)
)
```

- `unit` check: `kickoff`, `kick_return`, `punt`, `punt_return`, `onside_kick`, `onside_recovery`
  (extend only by decision — see the optional FG/XP note below).
- `plays` = charted plays the player was on for that unit; `pct` = `plays / unit total` (integer,
  matching `team_formations.pct`); `rank` orders a team's unit by usage.
- Same coverage gate as formations: a team-season below half its games gets no rows.
- Alignment stays in code (rule-based, season-versioned); it is not stored per team.

## 8. Proposed child tickets (for Cooper to approve — not filed)

1. **Spec + schema: special-teams unit membership** (epic step 2) — locks the table above, the unit
   enum, the coverage gate, FTN attribution, and which units ship first (the four main units;
   onside behind the sample bar).
2. **Ingest: derive per-team ST unit membership** (step 3) — join participation ↔ pbp on
   `game_id`+`play_id`, classify by `play_type_nfl` + kicking side, detect onside via `desc` +
   `own_kickoff_recovery`, REG-only, coverage gate, idempotent upsert. Pure fold in
   `lib/nflverse/` with a colocated test, per house style.
3. **iOS: rule-based unit geometry + SPECIAL-tab unit switcher** (step 4) — `Formations.swift`
   gains special-teams slots with kickoff season variants (pre-2024 / 2024 / 2025+) and punt
   geometry; a unit switcher on the SPECIAL tab; falls back to the static dots when the team has no
   stored unit.
4. **iOS: special-teams true-scale mode** (step 5) — reuses the generalized `TrueScaleFieldLayout`
   from DEP-572.

Optional / Cooper's call: field-goal, extra-point, and FG/XP-block units beyond the six. FG is
`special_teams_play=0` but still has a participation row and a `field_goal_attempt` flag, so it is
derivable the same way if wanted; XP is already `special_teams_play=1`.

## Related

- DEP-572 (defense true-scale field mode) — step 5 reuses its generalized layout.
- DEP-435 (returner data so past seasons can seat KR/PR) — same participation source; a stored ST
  membership table would also answer the KR/PR seat for 2016+.
- DEP-571 (verify nflverse formations completeness) — same participation file.

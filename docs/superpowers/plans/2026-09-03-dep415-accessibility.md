# DEP-415 implementation and verification

Implements the vault ticket `Projects/depth/Tickets/Accessibility XXXL text breaks layouts across the app.md`, including its September 2 findings.

Status: implementation and simulator verification in progress. Physical-device acceptance remains outstanding; do not close DEP-415 or declare Larger Text support.

## Observed inventory and repairs

Baseline screenshots cover default, AX1, AX3, and AX5 on iPhone 17 / iOS 26.5. AX1 already breaks the player vitals into word fragments; AX3 and AX5 compound this with truncated page segments, field labels, comparison names, fixed-height archive cards, and narrow stat columns.

| Surface | Accessibility repair | Default behavior |
| --- | --- | --- |
| Player card | Stack vitals and depth rows; label each season statistic; wrap reorder header | Original columns and stat table |
| Roster | Stack page/unit controls; put team selector in content; scroll full-width formation slots with unchanged player actions | Original field geometry and toolbar |
| Schedule / Stats | Single-column games and metric cells; stack record and leader content | Original grid and rows |
| Compare | Stack team slots, rank pairs, metric labels/values, room grid; wrap exact-role chips | Original paired columns |
| Uniform archive | Flexible-height one-column team cards, wider era cards, stacked kit detail/badges; scroll picker | Original grid and compact cards |
| Settings / onboarding / auth | Wrap settings rows, scroll welcome and coachmark, use native OTP field at AX sizes | Original rows, welcome, digit boxes |

No font caps, new dependencies, backend writes, or web changes. Removed the field's existing AX1 cap; the accessible formation list uses the same resolved slots and player actions.

## Shared caller inventory

- DepthSegmentedControl: TeamDetailView page switcher, TeamListView conference picker, CompareView mode, UniformsTab mode.
- DepthUnitTabBar: TeamDetailView roster, CompareView position picker, CompareLensesView metrics.
- DepthSearchField: UniformsTab search.
- SeasonPickerTrigger: ScheduleView, TeamStatsView, CompareView, TeamDetailView historical roster.
- DepthRowContent: PlayerDetailView normal depth list and DepthReorderList.
- UniformKitBadges: UniformTeamDetailView and UniformKitSheet.
- OtpCodeField: AuthSheet only. Actual OTP entry requires an authorized account; no codes sent during this audit.

## Simulator evidence

Tests run serially with `-parallel-testing-enabled NO` on one simulator. The earlier runner kill was retried after the user identified simulator resource contention.

- Baseline inventory: `/tmp/dep415-baseline-full.xcresult`, 1 test passed; 68 default/AX1/AX3/AX5 screenshots.
- Initial edited inventory: `/tmp/dep415-after-first.xcresult`, 1 test passed; same 68 captures, visually inspected.
- Default comparison excluded status/home bars: 15 reviewed surfaces had no changed pixels above the comparison threshold; team picker differed 0.02%, era archive 1.11% while artwork loaded. This is simulator evidence, not physical-device acceptance.
- Secondary baseline uses the real system AX5 setting so modal sheets are covered independently of launch overrides: `/tmp/dep415-system-before.xcresult`. Captured formations, uniform picker, populated Compare, and uniform team detail. Its kit-close assertion used an identifier overridden by the parent; corrected to the visible Close label.
- Vitals geometry: `testVitalsReflowAtAccessibilitySizes` passed for AX1/AX3/AX5 in `/tmp/dep415-secondary-final.xcresult`. The other test in that bundle failed on a welcome-button identifier; the corrected complete system-AX5 journey passed separately in `/tmp/dep415-system-verified.xcresult` (1 test).
- System AX5 captures verified formations, uniform picker, populated Compare, archive drill-in, kit/filter actions, Settings, sign-in, welcome scrolling, and coachmark Next/Skip. The final safe-area correction keeps the second coachmark bubble clear of the status bar; `testSystemSizeSecondaryScreens` passed again in `/tmp/dep415-coachmark-final.xcresult`.
- Normalized images: `/tmp/dep415-evidence/{before,after,final-after,coachmark-final}`.

## Remaining simulator / PR gates

- [x] Final vitals geometry and secondary-sheet targeted tests.
- [x] Final inventory after follow-up fixes; inspect captures and default comparison.
- [x] Record unauthenticated sign-in inspection separately; authenticated favorite-team and OTP entry remain device checks.
- [x] Full diff review and formatting.
- [ ] Screenshot upload and draft PR, blocked on explicit approval for Cloudinary upload.
- [ ] Physical-device checklist below; keep PR draft until acceptance.

## Exact physical-device checklist (all outstanding)

Record device model, iOS version, build/commit, orientation, and test date. Use the same team and content across before/after builds. Start in portrait, then repeat the largest-size pass in landscape and on the narrowest supported device available.

Set Settings → Accessibility → Display & Text Size → Larger Text. Enable Larger Accessibility Sizes. Test the first accessibility step (AX1), middle step (AX3), and far-right maximum (AX5), plus default text size with accessibility enlargement off. Relaunch between sizes, then also change the size while the app is open to check live reflow.

At EACH size:

1. Open Depth Charts. Read the full team-switcher name, including Jacksonville Jaguars/Tampa Bay Buccaneers. Open switcher, change AFC/NFC, search, select a long-name team, clear search, dismiss with keyboard open.
2. Select Roster, Schedule, Stats in both directions. All labels must be complete and controls reachable without reducing the chosen type size.
3. On the roster, select Offense, Defense, Special; read field position/player labels, tap players at both edges and in the backfield. Open formations, uniform picker, historical season, and return to current. Check overflow and dismissal controls.
4. Open a player with a long name. Read jersey number, name, position/status, all four vitals, college/bio, position depth and stats. Scroll to the bottom and close. Enter depth editing and check reorder/reset controls without saving unwanted edits.
5. Schedule: read long opponent names, date/time and scores; scroll to last week, choose a past season, return to current; open a matchup in Compare and return.
6. Stats: read coach, full record, streak/rank, breakdown, metrics, leaders and next game; open/close season picker and return from a historical season.
7. Compare: pick two long-name teams, read both full names and records, clear each slot, switch By team/By position, exercise every unit/lens, scroll to last row and read the paired values in order.
8. Uniforms: focus/type/clear search, switch By team/By era, read team cards and full kit names/years, open team drill-in and kit detail, scroll to Open depth chart. Open Filters; reach every sort/kind/current-only option and Show kits dismissal.
9. Settings from each root tab: read every row/value, open the Player Names menu, reach About/legal links, close. With an authorized signed-in test account, inspect Favorite Team, its toggle, email and account controls; do not delete the account. Inspect sign-in and OTP layouts without sending unsolicited codes.
10. Replay welcome/tour: read all copy and reach Take the Tour, Skip, Next and dismissal controls at each step.

For every failure record screen, size, orientation, exact clipped text/control, screenshot, and whether scrolling reaches it. Pass requires complete readable labels, sensible order, no overlap, all controls reachable, and no default-size appearance regression. Recheck repaired failures at AX3 and AX5 on the physical device before closing DEP-415.

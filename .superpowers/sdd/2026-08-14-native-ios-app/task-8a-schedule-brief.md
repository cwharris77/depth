# Task 8A — Native schedule

## Outcome

Add one focused native iOS schedule PR that reads the existing public `schedules`, `games`, and `teams` data through the native repository seam and presents the same regular-season behavior as the web schedule view.

## Requirements

- Follow the approved native plan/spec/QA constraints in:
  - `docs/superpowers/plans/2026-08-14-native-ios-app.md` T8
  - `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-design.md` Milestone 2B
  - `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-qa-plan.md`
- Use the current web implementation as the behavioral oracle:
  - `lib/utils/schedule/schedule.ts`
  - `lib/roster-source.db.ts` `getTeamSchedule`
  - `components/TeamScheduleView.tsx`
  - `app/api/teams/[id]/schedule/[season]/route.ts`
- Add immutable schedule domain models and explicit DTO mapping. The repository query must use explicit projected columns, never `select(*)`.
- Extend `DepthRepository`, `SupabaseDepthRepository`, and `CachingDepthRepository` minimally. The caching decorator may delegate this new read; do not restructure or weaken the existing snapshot cache.
- Default to the latest available season for the selected team. Support selecting past seasons from the existing data floor of 1999 through the default season.
- Match web semantics:
  - regular-season games only;
  - one week card per week through the maximum represented week;
  - missing week becomes a bye;
  - opponent resolves to the other team;
  - played games show W/L/T and score from the selected team's perspective;
  - unplayed games show date and home/away;
  - a past-season null result says no result rather than presenting an upcoming game;
  - malformed or unavailable data produces typed loading/empty/offline/error/retry states, never a crash or zero-filled fiction.
- Add a native Schedule destination from team detail using standard SwiftUI navigation and controls. Keep feature-local observable state. Preserve anonymous browsing.
- Add accessibility labels/identifiers, Dynamic Type-safe layouts, and 44x44 controls.
- Do not add uniforms, public share links, analytics, dependencies, schema changes, or unrelated refactors.
- Use TDD: add focused schedule mapping/resolution/view-model tests, run them red before production code, then green. Add a live XCUITest journey that opens a team schedule and verifies schedule content on production-shaped staging/local data.
- Regenerate the Xcode project with `xcodegen generate` only if required by repository conventions, and include generated changes when sources change.
- Before commit: self-review, run the full live-simulator suite on the booted iPhone 17 Pro, and commit with a Conventional Commit subject.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`


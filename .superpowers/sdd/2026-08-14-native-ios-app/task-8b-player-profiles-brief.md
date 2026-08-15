# Task 8B — Complete player profiles

## Outcome

Turn the T6 basic player sheet into the complete native version 1 player profile by mapping the already-projected bio fields and loading existing `player_stats` through the repository seam.

## Requirements

- Follow T8 in `docs/superpowers/plans/2026-08-14-native-ios-app.md` and Milestone 2B/QA player-detail requirements in the authoritative vault specs.
- Use the web player card as the behavior oracle:
  - `components/PlayerCard.tsx`
  - `components/PlayerCardHeader.tsx`
  - `components/PlayerCardSeasonStats.tsx`
  - `lib/utils/format.ts` (`experienceLabel`)
  - `lib/utils/stat-table.ts`
  - `lib/roster-source.db.ts` (`getPlayerStats` / `toPlayerSeasonStats`)
- Complete the immutable `Player` domain shape from fields already present in `PlayerDTO`: status, age, college, experience, height, weight, bio, and photo URL. Mapping is explicit and tested. Preserve formation fixture ergonomics with sensible initializer defaults; do not weaken validation for position, jersey number, or depth rank.
- Add immutable player-season-stat domain models and explicit DTO mapping for existing public `player_stats` data. Query explicit columns only, filter REG, sort newest first, and resolve the season team to text/abbreviation only; do not introduce team-logo imagery while rights remain unresolved.
- Extend `DepthRepository`, `SupabaseDepthRepository`, and `CachingDepthRepository` minimally for player stats. The cache decorator delegates this independent on-demand read; do not restructure snapshot caching.
- The profile must show:
  - player name, jersey number, granular position plus a human-readable full position name, and status;
  - age, humanized experience (`Rookie`, `1 yr`, `N yrs`), height, and weight with `—` for absent/zero source values;
  - college and bio only when meaningful;
  - a position-appropriate season-stat table matching the web column vocabulary and formatting, newest first, dropping rows with no games rather than showing zeros.
- Profile states must be intentional: reserve layout while stats load, show a distinct no-stats state once resolved empty, retain the profile if stats fail, and expose typed Retry for a stats read failure. A slow/stale response for a dismissed or different player must never overwrite the current profile.
- Preserve the existing photo/number fallback behavior; do not add image storage, new remote asset sources, or sports-mark imagery.
- Use standard SwiftUI sheets, semantic Dynamic Type, scrolling through Accessibility XXXL, VoiceOver order/labels, and minimum 44x44 controls.
- Add no dependencies, schema changes, uniforms, sharing, settings, analytics, or unrelated refactors.
- Use TDD: focused failing tests for all new player mappings, formatting/stat-column behavior, missing/partial values, stats load success/empty/failure/retry, and stale response protection before production code. Strengthen the live XCUITest to verify complete profile content beyond the existing Close button.
- Regenerate the Xcode project with `xcodegen generate` when source membership changes.
- Before commit: self-review, full live-simulator suite on the booted iPhone 17 Pro, Conventional Commit.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`


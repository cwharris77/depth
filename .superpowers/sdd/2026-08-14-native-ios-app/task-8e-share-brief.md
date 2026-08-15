# Task 8E — Local image/text sharing

## Outcome

Add one focused native iOS PR that lets a user share a depth chart from team detail through the
standard iOS share sheet: a locally rendered image plus text. No public link, URL, or backend
write is created — design spec locked decision #10 retires public live share links entirely.

## Requirements

- Follow the approved native plan/spec/QA constraints in:
  - `docs/superpowers/plans/2026-08-14-native-ios-app.md` T8, Milestone 2B item 25
  - `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-design.md` locked decision #10
  - `../obsidian/Projects/depth/specs/2026-08-14-native-ios-app-qa-plan.md` ("Native share sheet
    — rendered image/text, cancellation, missing-image fallback")
- Use the web share card as the visual/copy oracle (behavior, not implementation — the web card
  is server-rendered JSX/`ImageResponse`, not portable code):
  - `app/team/[id]/og-image/route.tsx` (layout: eyebrow "DEPTH CHART", city/name, team-primary
    background, featured-starter panels)
  - `lib/utils/og.ts` (`featuredStarters`: QB, then RB, then WR, silently skipping any position
    the roster lacks)
  - `lib/utils/colors.ts` (`readableTextOn`: WCAG contrast pick between white and the dark app
    background for text on an arbitrary brand-primary background)
  - `lib/hooks/overrides/use-share-roster.ts` (share title copy: `"<city> <name> depth chart ·
    Depth"`) — drop the URL portion; there is no link in v1.
- Port `readableTextOn`/`contrastRatio` as pure, hex-string-based Swift functions (no SwiftUI
  dependency) so they're unit-testable against the same known values as the TS version.
- Port `featuredStarters` as a pure function over `TeamSnapshot`/`[Player]` using the existing
  `byDepthOrder` sort — QB/RB/WR top starter each, skip a missing position, never crash on an
  incomplete roster.
- Build a SwiftUI share-card view (team-primary background, readable text, eyebrow, city/name,
  starter panels) and render it off-screen with `ImageRenderer` at the environment's display
  scale to get a `UIImage`.
- Add a Share entry point to `TeamDetailView`'s toolbar for the **live** snapshot only (not
  historical — no cache/consistent snapshot to render there in the same visual contract). Use
  `ShareLink` with the rendered `Image` (`Image` is `Transferable` since iOS 16) plus a
  `SharePreview` and the title copy above; if rendering fails (`ImageRenderer.uiImage` is `nil`),
  fall back to a text-only `ShareLink` rather than hiding the entry point or crashing.
- No public link, URL, `shared_boards` write, Supabase call, or network request of any kind —
  everything is synchronous, local, and derived only from the already-loaded snapshot.
- Add accessibility identifier(s) for the share entry point and 44×44 minimum tap target,
  consistent with the other toolbar items in `TeamDetailView`.
- Do not add uniforms, telemetry, dependencies, schema changes, or unrelated refactors.
- Use TDD: add focused `readableTextOn`/`featuredStarters` tests (including a team missing
  WR/RB, and a background where each contrast branch wins) red before production code, then
  green. Add a live XCUITest journey that opens a team, taps Share, and verifies the system share
  sheet presents (then dismisses it) — cancellation must leave the app state unchanged.
- Regenerate the Xcode project with `xcodegen generate` (new `Features/Share/` files).
- Before commit: self-review, run the full live-simulator suite on the booted iPhone 17 Pro
  Staging config, and commit with a Conventional Commit subject.

## Verification command

`xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test`

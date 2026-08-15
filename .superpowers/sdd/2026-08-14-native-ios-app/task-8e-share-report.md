# Task 8E — Local image/text sharing Report

## Implementation

Added a Share entry point to `TeamDetailView`'s toolbar for the live snapshot: it renders a
depth-chart card off-screen and hands the result to the native iOS share sheet. No public link,
URL, or backend write is created anywhere in this feature.

- `readableTextOn`/`contrastRatio` ported to Swift as pure, hex-string functions
  (`ios/Depth/Domain/ReadableText.swift`) — exact port of `lib/utils/colors.ts`'s WCAG
  relative-luminance algorithm, so the same known values (black-on-white ≈21:1, white on
  `#002244`, dark text on `#ffffff`) hold in both languages.
- `featuredStarters(from:)` ported to Swift (`ios/Depth/Domain/FeaturedStarters.swift`) —
  QB/RB/WR top starter each via the existing `byDepthOrder` sort, silently skipping a position
  the roster lacks, mirroring `lib/utils/og.ts`.
- `ShareCardView` (`ios/Depth/Features/Share/ShareCardView.swift`) is a fixed-size SwiftUI layout
  mirroring the web OG card's visual contract (`app/team/[id]/og-image/route.tsx`): team-primary
  background, `readableTextOn` text, "DEPTH CHART" eyebrow, city/name, and featured-starter
  panels — a native reinterpretation, not a port of the JSX/`next/og` implementation.
- `DepthChartShareButton` (`ios/Depth/Features/Share/DepthChartShareButton.swift`) renders that
  view off-screen with `ImageRenderer` at the environment's display scale and shares it via
  `ShareLink` (`Image` is `Transferable`), with the web's exact title copy pattern (`"<city>
  <name> depth chart · Depth"`, from `lib/hooks/overrides/use-share-roster.ts`, minus the URL —
  there is none in v1). A `nil` render (`ImageRenderer.uiImage` failure) falls back to a
  text-only `ShareLink` rather than hiding the entry point.
- Wired into `TeamDetailView`'s toolbar gated on `!historyViewModel.isHistorical` — historical
  rosters have no share-card visual contract yet, same guard shape as the existing Edit-Order
  menu.

## Files

- `ios/Depth/Domain/ReadableText.swift` (new)
- `ios/Depth/Domain/FeaturedStarters.swift` (new)
- `ios/Depth/Features/Share/ShareCardView.swift` (new)
- `ios/Depth/Features/Share/DepthChartShareButton.swift` (new)
- `ios/Depth/Features/TeamDetail/TeamDetailView.swift`
- `ios/DepthTests/ShareCardContentTests.swift` (new)
- `ios/DepthUITests/ShareUITests.swift` (new)
- `ios/Depth.xcodeproj/project.pbxproj` (regenerated with `xcodegen generate`)

## TDD evidence

### RED — pure content tests before production code existed

`ShareCardContentTests.swift` (contrast-ratio sanity, `readableTextOn` light/dark branches,
`featuredStarters` QB/RB/WR selection + depth-order tiebreak + missing-position skip + fully
missing) failed at compilation as intended — no `contrastRatio`, `readableTextOn`,
`featuredStarters`, or `FeaturedStarter` existed yet:

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' \
  -only-testing:DepthTests test
```

### GREEN — focused unit suite

Same command passed after adding `ReadableText.swift`/`FeaturedStarters.swift`:
`Test run with 96 tests in 0 suites passed after 1.352 seconds.` (all 6 new cases green).

### Live share journey

`ShareUITests.testShareDepthChartPresentsTheNativeShareSheet` opens the Bills, taps Share, and
asserts the system share sheet (`ActivityListView`) presents with the expected title
(`"Buffalo Bills depth chart · Depth"` as the popover's navigation-bar title, confirming the
rendered preview/title reached the sheet). It then cancels via the popover's
`PopoverDismissRegion` and asserts the sheet is gone and team detail is unchanged. Iterated on
the dismiss mechanism during development: `app.swipeDown()` and a coordinate tap on the dimmed
area both failed to dismiss (this presentation is a `Popover`, not a bottom sheet, on this
device class); a debug dump of `app.debugDescription` at that point in the journey found the real
elements (`PopoverDismissRegion`, no "Close" button) and fixed the test.

## Full verification

Required command:

```sh
xcodebuild -project ios/Depth.xcodeproj -scheme Depth -configuration Staging \
  -destination 'platform=iOS Simulator,id=736575DC-2DBD-4F28-85FC-D00C9E75D6F9' test
```

Result: exit code `0`, `** TEST SUCCEEDED **`. `96` Swift Testing cases passed in `1.280` seconds;
all `6` XCUITest journeys passed (auth/history/schedule/team-search/share), `0` failures.

## Self-review and concerns

No blocking findings.

- No network request, Supabase call, `shared_boards` write, or public URL anywhere in this
  feature — `ShareCardView`/`DepthChartShareButton` are pure functions of the already-loaded
  `TeamSnapshot` passed in from `TeamDetailView`.
- The share button only renders for the live snapshot (`!historyViewModel.isHistorical`), same
  guard pattern the existing Edit-Order menu already uses.
- `renderedImage` recomputes on each `DepthChartShareButton` body evaluation rather than caching
  in `@State` — acceptable for now: the card is a small fixed-size off-screen render, the button
  only appears in a toolbar that re-renders infrequently, and caching would add state-invalidation
  complexity (refresh on snapshot/override change) for a cost that hasn't shown up as measurable
  in the live journey. Worth revisiting if T9's performance budgets flag it.
- `git diff --check` passes; `xcodegen generate` was rerun (new `Features/Share/` files).
- No uniforms, telemetry, dependency, or schema change — verified by re-reading the full diff.

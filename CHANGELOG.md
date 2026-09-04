# Changelog

All notable changes to The Sticks will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Features

- add auto-labeling and changelog automation (#661) (ci)
- team-specific facemask color, and retire the parity gate to a one-time proof (#660) (uniforms)
- attribute app events to marketing versions (#650) (ios)
- re-author the Seahawks helmet decal from a gate-passing reference (#659) (uniforms)
- filter the release monitor and notify into the vault, not GitHub issues (#651) (uniforms)
- rework the jersey numeral's hashtag and scale (#614) (player)
- draw the depth chart in real yards (#611) (field)
- make the forced-update gate resolve before any other fetch (DEP-425) (#603) (ios)
- outlined jersey numeral on the player card (#602) (card)
- add loading skeleton for favorite team row on settings page (#585) (ios)
- local diff-driven PR screenshots with visual diff + CI gate (#583) (ios)
- switch to Compare tab on schedule-card tap (DEP-405) (#579) (ios)
- reselect the App Store screenshot sequence (#575) (ios)
- ground privacy and terms in actual app behavior (#573) (legal)
- rebuild the archive as search + By team / By era (#563) (uniforms)
- add native roster leaders card to the Stats page (#560) (stats)
- render the team metrics on the native Stats page (#555) (stats)
- disclose terms and privacy before sign-in (#547) (auth)
- iOS league ranks, coach, streak and seed on the Stats page (#552) (stats)
- show the nflverse team metrics on the Stats page (#553) (stats)
- league ranks for the nflverse team metrics (#551) (stats)
- season picker and grouped metric tables (#541) (compare)
- redesign unit-metrics table and position picker (#536) (compare)
- remove the Position Depth section header (#537) (player)
- add native forecast and matchup lenses (#534) (compare)
- redesign iOS Settings page layout (#533) (settings)
- rebrand in-app copy and metadata from Depth to The Sticks (#531) (web)
- rebrand magic-link email to The Sticks (#526) (supabase)
- add matchup room picker to compare (#524) (ios)
- add favorite team and start-on-favorite settings (#521) (ios)
### Bug Fixes

- repair the changelog workflow (#663) (ci)
- repair dead tap areas (DEP-395) (#657) (ios)
- forbid two current home or away kits per team (#655) (uniforms)
- resolve historical roster espn_id via crosswalk (#617) (ingest)
- fill the historical defense from position groups (#615) (field)
- re-send a UI-test tap that never registered, and time focus from after the tap (#616) (ios)
- fix three UI-test race conditions behind flaky CI (#610) (ios)
- rename exported screenshot PNGs to their manifest names (#608) (ios)
- keep position tags clear of neighboring dots (#607) (ios)
- cache PR screenshot baselines and capture against the local stack (#600) (ios)
- restore legible legacy accents for shipped iOS builds (#591) (uniforms)
- use real team colors for UI accents (#590) (uniforms)
- make season-picker UI tests tolerant of prod latency and available data (#582) (ios)
- make the shared OTP email wording neutral (#578) (auth)
- retarget App Store screenshot capture to 1284×2778 (#577) (ios)
- pass uniform id through navigation to depth chart so it shows the originating kit (#570) (ios)
- restore iOS/web linebacker parity (#574) (formations)
- fix LB/DT overlap in 4-2-5 formations and persist formation across unit tabs (#568) (ios)
- use shared CloseButton on formations sheet (#569) (ios)
- align roster historical controls with stats/schedule and fix field height (#567) (ios)
- correct Jaguars teal throwback dates and rename to Prowler Throwback (#566) (uniforms)
- simplify home kit names, drop redundant status line, fix keyboard dismiss (#565) (uniforms)
- make the calendar the one canonical season definition (#564) (ingest)
- never write a zero playoff seed to team_stats (#562) (ingest)
- stop claiming a playoff seed a team never earned (#556) (stats)
- spread sparse iOS stat columns (#548) (player)
- fit iOS share preview without cropping (#549) (share)
- remove active uniform badge (#543) (ios)
- spell out the season-picker back-to-current control (#558) (ios)
- move season-picker back-to-current beside trigger, fix low-contrast text (#550) (ios)
- pin the Broncos badge background to navy (#542) (teams)
- unblock the launch team-list read from session restore (#538) (ios)
- stop leader lines running through other players (#540) (field)
- restore inline formation attribution (#530) (ios)
- use the signed-in user's id when writing favorite settings (#529) (settings)
- expand AuthSheet to large presentation detent (#528) (auth)
- pin the FTN attribution to the screen bottom (#527) (field)
- keep receiver callout tags clear of their own position label (#525) (field)
### Documentation

- reconcile the stale team-color claims (#604) (general)
- rewrite the team-color plan against what shipped (#599) (specs)
- implementation plan for team color surface rules (#592) (uniforms)
- add default iOS search scope guidance to CLAUDE.md (general)
- reorient to iOS-first, freeze web to legal hosting (DEP-417) (#580) (depth)
- rewrite App Store screenshot captions as ASO copy (#576) (ios)
- point CLAUDE.md and ship-pr at the PR template + screenshots section (pr)
- add house pull-request template with screenshots section (#572) (pr)
- action task-observer review — 2026-08-28 (#571) (skills)
- clarify GitHub stack workflow and remove manual retarget instructions (general)
### Refactoring

- compose kits from helmet/jersey/pants parts (#656) (uniforms)
- stop reading the legacy accent columns (#601) (ios)
- consolidate every sheet onto shared DepthSheet (DEP-420) (#581) (ios)
- one shared close button on web and iOS (#539) (ui)
- update TeamStatsViewModel guard and add .claude settings to .gitignore (general)
### Performance

- reconcile worktree deps in place instead of a from-scratch npm ci (#654) (scripts)
- parallelize UI suite + cut redundant launch prologue (#532) (ios-ci)
### Tests

- correct the 2025 season-picker rationale comments (runs under both prod and local stacks) (#589) (ios)
- harden group-slot preferredPosition invariant across nflverse joins (#586) (depth)
- make season-stats a11y test tolerant of absent prod data (#561) (ios)
- rework field geometry invariants (#546) (field)
### CI

- exempt Depth/Data from the screenshots gate (#605) (ios)
- exempt Depth/Domain from the screenshots gate (#597) (ios)
### Chores

- replace stale trace markers with per-team mark provenance (#658) (uniforms)
- bootstrap node_modules and .env.local in fresh worktrees (#653) (scripts)
- log two skill observations from the uniform monitor redesign (#652) (specs)
- make AGENTS.md a symlink to CLAUDE.md (#613) (general)
- move shared seasons-arg parser to lib/utils/ingest/ (#588) (ingest)
- action task-observer review — no applicable observations (#535) (depth)
### Style

- draw the yard lines as white chalk (#612) (field)

## [Unreleased] - 2026-09-04

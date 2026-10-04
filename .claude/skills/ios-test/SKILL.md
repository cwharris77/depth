---
name: ios-test
description: Use to run targeted iOS tests (xcodebuild -only-testing) for the suites a diff touches. Never run the full suite. Fails loudly when a filter matches zero tests.
disable-model-invocation: true
---

# Targeted iOS test run

Run `.claude/skills/ios-test/scripts/ios-test.sh <id>...` with one `-only-testing` identifier per argument.

- `DepthTests` uses Swift Testing: suite `DepthTests/MySuite`, free function `'DepthTests/myTest()'` — keep the `()` and quote it.
- `DepthUITests`, `AccessibilityUITests`, `ShareUITests` use XCTest: `DepthUITests/MyTests/testFoo`.
- Pick only the suites the diff touches; the full run takes minutes.
- Simulator defaults to the first available iPhone; override with `DEPTH_SIM_NAME='iPhone 17 Pro'`.

The script exits non-zero on test failure, and also when `Executed 0 tests` is printed (xcodebuild still prints `TEST SUCCEEDED` in that case). Report the failing output verbatim.

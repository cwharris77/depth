---
name: vitest-testing
description: Modern TypeScript/JavaScript testing with Vitest. Fast unit and integration tests, native ESM support, Vite-powered HMR, and comprehensive mocking. Use for testing TS/JS projects.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, TodoWrite
license: MIT
---

# Vitest Testing

Expert knowledge for testing JavaScript/TypeScript projects using Vitest - a blazingly fast testing framework powered by Vite.

## Quick Start

### Installation

```bash
# Using Bun (recommended)
bun add -d vitest

# Using npm
npm install -D vitest
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom'
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
})
```

## Running Tests

```bash
# Run all tests (prefer bun)
bun test

# Watch mode (default)
bun test --watch

# Run once (CI mode)
bun test --run

# With coverage
bun test --coverage

# Specific file
bun test src/utils/math.test.ts

# Pattern matching
bun test --grep="calculates sum"

# UI mode (interactive)
bun test --ui

# Verbose output
bun test --reporter=verbose
```

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { add, subtract } from './math'

describe('Math utilities', () => {
  beforeEach(() => {
    // Setup before each test
  })

  it('adds two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('subtracts two numbers correctly', () => {
    expect(subtract(5, 3)).toBe(2)
  })
})
```

### Parametrized Tests

```typescript
describe.each([
  { input: 2, expected: 4 },
  { input: 3, expected: 9 },
])('square function', ({ input, expected }) => {
  it(`squares ${input} to ${expected}`, () => {
    expect(square(input)).toBe(expected)
  })
})
```

## Assertions

```typescript
// Equality
expect(value).toBe(expected)
expect(value).toEqual(expected)

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeNull()
expect(value).toBeDefined()

// Numbers
expect(number).toBeGreaterThan(3)
expect(number).toBeCloseTo(0.3, 1)

// Strings/Arrays
expect(string).toMatch(/pattern/)
expect(array).toContain(item)

// Objects
expect(object).toHaveProperty('key')
expect(object).toMatchObject({ a: 1 })

// Exceptions
expect(() => throwError()).toThrow('message')

// Promises
await expect(promise).resolves.toBe(value)
await expect(promise).rejects.toThrow()
```

## Mocking

### Function Mocks

```typescript
import { vi } from 'vitest'

const mockFn = vi.fn()
mockFn.mockReturnValue(42)
mockFn.mockResolvedValue('async result')
mockFn.mockImplementation((x) => x * 2)

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg')
```

### Module Mocking

```typescript
vi.mock('./api', () => ({
  fetchUser: vi.fn(() => ({ id: 1, name: 'Test User' })),
}))

import { fetchUser } from './api'

beforeEach(() => {
  vi.clearAllMocks()
})
```

### Timers

```typescript
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.restoreAllMocks())

it('advances timers', () => {
  const callback = vi.fn()
  setTimeout(callback, 1000)
  vi.advanceTimersByTime(1000)
  expect(callback).toHaveBeenCalledOnce()
})

it('mocks dates', () => {
  const date = new Date('2024-01-01')
  vi.setSystemTime(date)
  expect(Date.now()).toBe(date.getTime())
})
```

## Coverage

```bash
# Generate coverage report
bun test --coverage

# HTML report
bun test --coverage --coverage.reporter=html
open coverage/index.html

# Check against thresholds
bun test --coverage --coverage.thresholds.lines=90
```

## Integration Testing

```typescript
import request from 'supertest'
import { app } from './app'

describe('API endpoints', () => {
  it('creates a user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John' })
      .expect(201)

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'John',
    })
  })
})
```

## Best Practices

- One test file per source file: `math.ts` → `math.test.ts`
- Group related tests with `describe()` blocks
- Use descriptive test names
- Mock only external dependencies
- Use `concurrent` tests for independent async tests
- Share expensive fixtures with `beforeAll()`
- Aim for 80%+ coverage but don't chase 100%

## depth-specific gotchas (Next.js / Supabase)

These are recurring, non-obvious failure modes hit while testing this repo's
Next.js App Router routes and Supabase-backed modules. Each cost real debugging
time; check this list before writing a test that hits one of these shapes.

- **`'use cache'` + `cacheLife()` cannot run under vitest.** `cacheLife()` throws
  `E887` without `process.env.__NEXT_USE_CACHE` set, and then throws `E818`
  ("can only be called inside a use cache function") because vitest has no cache
  work-unit store — even `vi.mock('next/cache', () => ({ cacheLife: () => {} }))`
  only neutralizes the throw, it doesn't make the caching behavior observable.
  If a ticket needs both caching AND a test proving "repeated calls stop hitting
  the DB," prefer a hand-rolled in-memory TTL cache (observable, testable) over
  `'use cache'`. A framework caching primitive that's invisible outside the
  framework's runtime is not unit-testable — pick testability at the cache layer
  you own, or accept it as integration-only and say so in the test file.

- **Module-scoped mutable state (a cache `Map`, a singleton store) leaks across
  `it()` blocks in the same file.** A cache populated by an earlier test is a
  cache hit for a later test that expects a miss — this shows up as a confusing
  TTL-expiry failure where `Date.now()` at a mocked time is still "within window"
  of an entry cached at real time. Isolate with `vi.resetModules()` + a dynamic
  `await import(...)` in `beforeEach` so each test gets a fresh module instance
  (and therefore a fresh cache/store). Hoisted `vi.hoisted` mock state survives
  `resetModules`, so recording mocks keep working across the reset. Don't try to
  work around this with "unique query strings per test" — a reorder or shared
  fixture silently re-breaks it.

- **Mocking a module doesn't bypass a real guard that runs before the mocked
  call.** E.g. `supabase()` in `lib/roster-source.db.ts` throws on missing env
  vars before `createClient` is ever invoked — `vi.mock('@supabase/supabase-js')`
  only replaces the imported module, it can't skip a pre-mock guard in the code
  under test. Stub the guarded state too: `vi.stubEnv(...)` in `beforeAll`,
  `vi.unstubAllEnvs()` in `afterAll`. A mock replaces a dependency, not the code
  around its call site.

- **Testing a module-scoped external store (e.g. `useSyncExternalStore`-backed
  singletons like `lib/use-user.ts`) needs the store's own interface, not a React
  render.** This repo has no `@testing-library/react`, and SSR-rendering a hook
  built on `useSyncExternalStore` only reads the *server* snapshot — async state
  transitions are invisible to a render. Export the store's `subscribe`/
  `getSnapshot` functions from the hook module (with a header-comment note that
  they're the store's interface, not React's) and drive the store directly in
  tests. Combine with `vi.resetModules()` + dynamic `import()` per test, same as
  the module-scoped-cache case above.

- **Testing Next.js app-dir route handlers:** colocate `route.test.ts` next to
  `route.ts` (the app router only recognizes its special file names, so a
  colocated test file is never mistaken for a route, and vitest's default glob
  picks it up regardless of location). `vi.mock('@/lib/supabase/server', ...)`
  and the data-access module (e.g. `@/lib/roster-source.db`) with a factory
  returning `vi.fn()` — this sidesteps loading `next/headers`/`next/cache` at
  module scope, which the real supabase client modules pull in. Build a
  chainable fake for the supabase query builder where the terminal method
  resolves the result (`maybeSingle()` returns `{ data, error }`; a terminal
  `.eq()` on a builder can just return the plain object). Always prefer the
  repo's local `npm test` / `./node_modules/.bin/vitest` over `npx vitest`,
  which can silently resolve a different globally-cached version and fail with
  "Cannot find module 'vitest/config'".

## See Also

- `test-quality-analysis` - Detecting test smells
- `playwright-testing` - E2E testing
- `mutation-testing` - Validate test effectiveness

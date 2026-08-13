// The one semantic-intent vocabulary behind every components/ui/ primitive's `variant` prop.
//
// `variant` answers the same question on every primitive — *what intent does this control
// express?* — never what it looks like. That contract was drifting: IconButton's
// `chrome`/`plain` were placement names and Badge called the prop `kind`, so the same
// concept (the quiet, borderless style) ended up named differently across primitives
// (audit 2026-08-11 #14, #18). This list is the single documented vocabulary, and each
// primitive's `variant` type is the subset of `Intent` it can express. Intents that span
// primitives share a name and a meaning: `primary` is the emphasized default everywhere,
// `ghost` is the quiet borderless style everywhere. Add a new intent here before reaching
// for a fresh name at a call site.
export type Intent =
  | 'primary' // emphasized default — the control a user should reach for first
  | 'secondary' // neutral alternative (e.g. Button cancel)
  | 'ghost' // quiet and borderless — sits on its surface (Button text-only, IconButton sheet close)
  | 'danger' // destructive
  | 'danger-outline' // destructive, outlined
  | 'position' // Badge: roster position-code pill
  | 'status' // Badge: player roster status — colored text, no background
  | 'tag'; // Badge: small meta-flag pill (CUSTOM, HOME/AWAY, UPCOMING)

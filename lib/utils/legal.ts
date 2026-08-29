// Single source of truth for the values the static legal/support pages all quote, so
// /privacy, /terms and /support can never disagree about the contact address or the date a
// policy took effect (they previously hard-coded a personal address in three places and
// carried two different "last updated" months).
//
// SUPPORT_EMAIL is mirrored in Swift as AppBuildInfo.supportEmail — the iOS Settings → About
// "Send Feedback" row and the App Store Connect Support URL both publish it, so the two must
// change together. There is no build-time check binding them; this comment is the coupling.
export const SUPPORT_EMAIL = 'support@cooper-harris.site';

// Bump when a change materially affects how user information is handled — both legal pages
// render this, and the policies promise the date moves when they do.
export const LEGAL_EFFECTIVE_DATE = 'August 28, 2026';

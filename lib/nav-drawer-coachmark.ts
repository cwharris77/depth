// Pure localStorage gate for the nav-drawer first-load coachmark (components/DepthMark).
// Mirrors lib/ios-install-hint.ts's storage-wrapper shape: reads/writes are wrapped because
// Safari private browsing and other storage-blocked contexts throw on access rather than
// returning null, and this hint must degrade (never crash the page) if that happens — worst
// case it just reappears next visit instead of staying gone forever.

import { STORAGE_KEY_DEPTH_NAV_DRAWER_DISMISSED } from './storage-keys';

const DISMISSED_KEY = STORAGE_KEY_DEPTH_NAV_DRAWER_DISMISSED;

export function hasDismissedNavDrawerCoachmark(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissNavDrawerCoachmark(storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(DISMISSED_KEY, '1');
  } catch {
    // ignore — storage unavailable, nothing to persist
  }
}

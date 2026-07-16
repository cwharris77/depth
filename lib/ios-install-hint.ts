// Pure UA/environment checks for the iOS "Add to Home Screen" hint (components/IOSInstallHint).
// iOS Safari never fires `beforeinstallprompt` (that event is Chromium-only), so there's no
// native install affordance there — this hint is the only way visitors learn about
// Share -> Add to Home Screen. Kept pure and testable rather than inlined in the component:
// the iOS-vs-other-iOS-browser and iPadOS-UA-spoofing checks are easy to get subtly wrong.

const DISMISSED_KEY = 'depth:ios-install-hint-dismissed';

// True only for Safari on iOS/iPadOS — not Chrome/Firefox/Edge/Opera on iOS. Those ship their
// own UI shell over WebKit and tag it in the UA; several either hide "Add to Home Screen" or
// put it somewhere else, so pointing them at Safari's Share icon would be wrong. iPadOS 13+
// Safari reports a plain Mac UA ("Macintosh; Intel Mac OS X..."), so a touch-capable "Macintosh"
// UA is treated as an iPad too — real Macs report maxTouchPoints === 0.
export function isIOSSafari(userAgent: string, maxTouchPoints: number): boolean {
  const isIOSDevice =
    /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!isIOSDevice) return false;

  const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|mercury/i.test(userAgent);
  return !isOtherIOSBrowser;
}

// True when the app is already running standalone (launched from the home screen).
// `navigator.standalone` is iOS Safari's own flag; `display-mode: standalone` is the
// standards-track equivalent other engines (and iOS in some versions) expose.
export function isStandaloneDisplay(
  navigatorStandalone: boolean | undefined,
  matchesStandaloneMedia: boolean
): boolean {
  return navigatorStandalone === true || matchesStandaloneMedia;
}

// localStorage reads/writes are wrapped: Safari private browsing and storage-blocked contexts
// throw on access rather than just returning null, and this hint must degrade (never crash the
// page) if that happens — worst case it just reappears next visit.
export function hasDismissedInstallHint(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    return storage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallHint(storage: Pick<Storage, 'setItem'>): void {
  try {
    storage.setItem(DISMISSED_KEY, '1');
  } catch {
    // ignore — storage unavailable, nothing to persist
  }
}

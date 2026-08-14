// Validates a `?next=` return-path param so it can't become an open redirect. Only same-origin
// relative paths are honored — a protocol-relative (`//host`) or absolute URL falls back to
// home. Shared by /signin (back arrow, land-here-after-sign-in) and the magic-link confirm page
// — both need the identical safety check, previously duplicated inline in each.
export function safeNext(raw: string | string[] | undefined): string {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

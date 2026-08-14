// Public share-link handles (Phase C, share pass). A slug is the opaque, unguessable id in a
// /team/[id]?board=<slug> link -- 10 chars of [A-Za-z0-9] from a CSPRNG (62^10 ≈ 8.4e17 of
// space, so collisions are not a practical concern and links are not enumerable). Pure and
// dependency-free; the tiny modulo bias across 62 symbols is irrelevant for a random handle.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function newSlug(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

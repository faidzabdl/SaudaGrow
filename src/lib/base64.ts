const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decode base64 -> bytes tanpa bergantung pada atob/paket tambahan.
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = CHARS.indexOf(clean[i]);
    const b = CHARS.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? CHARS.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? CHARS.indexOf(clean[i + 3]) : -1;
    if (p < len) bytes[p++] = (a << 2) | (b >> 4);
    if (c >= 0 && p < len) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0 && p < len) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

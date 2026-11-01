// File name for a recording: FNV-1a hash of the text. Must match Native.clipKey() in js/native.js.
export function narrationKey(text) {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

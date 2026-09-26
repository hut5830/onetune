const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function toAscii(bytes: Uint8Array): string {
  return Array.from(bytes, b => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
}

/** Accepts "A5 50 02", "a5:50:02", "A55002" or "0xA5,0x50". Returns null when invalid. */
export function parseHex(input: string): Uint8Array | null {
  const s = input.trim().replace(/0x/gi, '');
  if (!s) return null;
  let parts = s.split(/[\s,:;-]+/).filter(Boolean);
  if (parts.length === 1 && parts[0].length > 2) {
    if (parts[0].length % 2) return null;
    parts = parts[0].match(/.{2}/g) ?? [];
  }
  if (!parts.every(p => /^[0-9a-f]{1,2}$/i.test(p))) return null;
  return Uint8Array.from(parts.map(p => parseInt(p, 16)));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += b === undefined ? '=' : B64[(n >> 6) & 63];
    out += c === undefined ? '=' : B64[n & 63];
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map(k => (i + k < clean.length ? B64.indexOf(clean[i + k]) : 0));
    const v = (n[0] << 18) | (n[1] << 12) | (n[2] << 6) | n[3];
    out.push((v >> 16) & 255);
    if (i + 2 < clean.length) out.push((v >> 8) & 255);
    if (i + 3 < clean.length) out.push(v & 255);
  }
  return Uint8Array.from(out);
}

/** 16-bit UUIDs inside the Bluetooth base UUID are shown in short form, e.g. FFE1. */
export function shortUuid(uuid: string): string {
  const m = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid);
  return m ? m[1].toUpperCase() : uuid.toUpperCase();
}

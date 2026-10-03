/**
 * Framing observed on XYV122UE (docs/protocols/xyv122.md):
 * [7E][LEN = whole frame][CMD][data…][SUM hi][SUM lo], SUM = 16-bit sum of every preceding byte.
 */
export const FRAME7E_MAX_BODY = 255 - 4;

/** Wraps CMD + data into a full frame. */
export function frame7e(body: ArrayLike<number>): Uint8Array {
  if (body.length > FRAME7E_MAX_BODY) throw new Error(`frame7e: body ${body.length} > ${FRAME7E_MAX_BODY} bytes`);
  const out = new Uint8Array(body.length + 4);
  out[0] = 0x7e;
  out[1] = out.length;
  out.set(Array.from(body), 2);
  const sum = out.subarray(0, out.length - 2).reduce((a, x) => a + x, 0) & 0xffff;
  out[out.length - 2] = sum >> 8;
  out[out.length - 1] = sum & 0xff;
  return out;
}

/** true when `b` is one complete, well-formed frame (start byte, length and checksum all match). */
export function check7e(b: Uint8Array): boolean {
  if (b.length < 5 || b[0] !== 0x7e || b[1] !== b.length) return false;
  const sum = b.subarray(0, b.length - 2).reduce((a, x) => a + x, 0) & 0xffff;
  return b[b.length - 2] === sum >> 8 && b[b.length - 1] === (sum & 0xff);
}

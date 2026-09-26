export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const fmtF = (f: number) =>
  f >= 1000 ? (f / 1000).toFixed(f >= 10000 ? 1 : 2).replace(/\.?0+$/, '') + 'k' : String(Math.round(f * 10) / 10);
export const fmtDb = (g: number) => (g > 0 ? '+' : '') + (Math.round(g * 10) / 10).toFixed(1);
export const snap = (v: number, step: number) => +(Math.round(v / step) * step).toFixed(4);
/** "3150", "3.15k", "-4,5" → number; NaN if not a number. */
export function parseNumber(raw: string): number {
  const s = raw.trim().replace(',', '.').replace(/k$/i, 'e3');
  return s ? Number(s) : NaN;
}

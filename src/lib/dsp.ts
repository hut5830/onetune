import { Band, Channel, Xover } from '../model/tuning';

const FS = 48000;

function mag(c0: number, c1: number, c2: number, w: number) {
  const re = c0 + c1 * Math.cos(w) + c2 * Math.cos(2 * w);
  const im = -(c1 * Math.sin(w) + c2 * Math.sin(2 * w));
  return Math.hypot(re, im);
}

/** RBJ biquad magnitude (peaking / low shelf / high shelf) in dB at frequency f. */
export function bandDb(b: Band, f: number): number {
  if (!b.g) return 0;
  const A = Math.pow(10, b.g / 40), w0 = (2 * Math.PI * Math.min(b.f, FS * 0.49)) / FS;
  const c = Math.cos(w0), al = Math.sin(w0) / (2 * b.q), w = (2 * Math.PI * f) / FS, sA = 2 * Math.sqrt(A) * al;
  let n: number[], d: number[];
  if (b.t === 'ls') {
    n = [A * (A + 1 - (A - 1) * c + sA), 2 * A * (A - 1 - (A + 1) * c), A * (A + 1 - (A - 1) * c - sA)];
    d = [A + 1 + (A - 1) * c + sA, -2 * (A - 1 + (A + 1) * c), A + 1 + (A - 1) * c - sA];
  } else if (b.t === 'hs') {
    n = [A * (A + 1 + (A - 1) * c + sA), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - sA)];
    d = [A + 1 - (A - 1) * c + sA, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - sA];
  } else {
    n = [1 + al * A, -2 * c, 1 - al * A];
    d = [1 + al / A, -2 * c, 1 - al / A];
  }
  return 20 * Math.log10(mag(n[0], n[1], n[2], w) / mag(d[0], d[1], d[2], w));
}

/** Crossover magnitude. Bessel is drawn with a Butterworth shape (approximation, display only). */
export function xoDb(x: Xover, f: number, highPass: boolean): number {
  if (!x.on) return 0;
  const r = highPass ? x.freq / f : f / x.freq;
  if (x.type === 'LR') return -20 * Math.log10(1 + Math.pow(r, 2 * (x.slope / 12)));
  return -10 * Math.log10(1 + Math.pow(r, 2 * (x.slope / 6)));
}

export function responseDb(c: Channel, f: number): number {
  let d = c.gain + xoDb(c.hpf, f, true) + xoDb(c.lpf, f, false);
  if (!c.eqBypass) for (const b of c.eq) if (b.g) d += bandDb(b, f);
  return d;
}

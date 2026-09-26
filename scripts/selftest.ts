// Pure-logic checks that run in Node (no React Native): npx tsx scripts/selftest.ts
import assert from 'node:assert/strict';
import { parseHex, toHex, bytesToBase64, base64ToBytes, shortUuid } from '../src/lib/hex';
import { bandDb, xoDb } from '../src/lib/dsp';
import { initialState, fitXover } from '../src/model/tuning';
import { profileById } from '../src/drivers/profiles';
import { encodeDemo } from '../src/drivers/demo';
import { WriteQueue } from '../src/ble/writeQueue';

assert.equal(toHex(parseHex('a5 50 02')!), 'A5 50 02');
assert.equal(toHex(parseHex('A55002')!), 'A5 50 02');
assert.equal(toHex(parseHex('0xA5,0x50')!), 'A5 50');
assert.equal(parseHex('zz'), null);
assert.equal(parseHex('A55'), null);
for (const n of [0, 1, 2, 3, 4, 5, 20]) {
  const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
  assert.deepEqual(base64ToBytes(bytesToBase64(b)), b);
}
assert.equal(bytesToBase64(Uint8Array.from([0xa5, 0x50, 0x02])), 'pVAC');
assert.equal(shortUuid('0000ffe1-0000-1000-8000-00805f9b34fb'), 'FFE1');

const near = (a: number, b: number, tol = 0.05) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);
near(bandDb({ f: 1000, g: 6, q: 4.32, t: 'pk' }, 1000), 6);
near(bandDb({ f: 1000, g: -4.5, q: 2, t: 'pk' }, 1000), -4.5);
near(xoDb({ on: true, freq: 80, slope: 24, type: 'LR' }, 80, true), -6.02);
near(xoDb({ on: true, freq: 80, slope: 12, type: 'BW' }, 80, true), -3.01);

const r500 = profileById('r500')!;
const x = fitXover({ on: true, freq: 100, slope: 18, type: 'LR' }, r500);
assert.equal(x.type, 'LR'); assert.ok([12, 24].includes(x.slope));
const axx = fitXover({ on: true, freq: 100, slope: 48, type: 'LR' }, profileById('axx')!);
assert.deepEqual([axx.type, axx.slope], ['BW', 24]);

const st = initialState(r500);
assert.equal(st.channels.length, 6);
const f = encodeDemo({ kind: 'master' }, st)[0];
assert.equal(f.bytes[0], 0xa5);
assert.equal(f.bytes[f.bytes.length - 1], f.bytes.slice(0, -1).reduce((a, v) => a + v, 0) & 0xff);

// queue coalesces frames with the same key and keeps only the last one
(async () => {
  const sent: string[] = [];
  const q = new WriteQueue(async fr => { sent.push(fr.label); }, () => {}, 10);
  q.push([{ key: 'g', label: 'g1', bytes: new Uint8Array() }, { key: 'g', label: 'g2', bytes: new Uint8Array() }, { key: 'h', label: 'h1', bytes: new Uint8Array() }]);
  q.start(); await new Promise(r => setTimeout(r, 40)); q.stop();
  assert.deepEqual(sent, ['g2', 'h1']);
  console.log('selftest ok');
})();

// Pure-logic checks that run in Node (no React Native): npx tsx scripts/selftest.ts
import assert from 'node:assert/strict';
import { parseHex, toHex, bytesToBase64, base64ToBytes, shortUuid } from '../src/lib/hex';
import { bandDb, xoDb } from '../src/lib/dsp';
import { initialState, fitXover, guardXover, LAYOUTS, CHANNELS, layoutsFor, defaultLayout, delaysFromDistances, MIN_HPF } from '../src/model/tuning';
import { PROFILES, profileById } from '../src/drivers/profiles';
import { driverFor } from '../src/drivers/registry';
import { encodeDemo } from '../src/drivers/demo';
import { TuningSession } from '../src/model/session';
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

// layouts: every channel id exists and is used once; each profile has a layout per scene
for (const l of LAYOUTS) {
  assert.equal(new Set(l.channels).size, l.channels.length, l.id);
  for (const id of l.channels) assert.ok(CHANNELS[id], `${l.id}: ${id}`);
}
for (const p of PROFILES) for (const sc of p.scenes) {
  assert.ok(layoutsFor(p, sc).length > 0, `${p.id} has no ${sc} layout`);
  assert.equal(initialState(p, sc).scene, sc);
  // speaker protection holds in every default channel set
  for (const l of layoutsFor(p, sc)) for (const c of initialState(p, sc, l.id).channels) {
    const min = MIN_HPF[c.kind];
    if (min !== undefined) assert.ok(c.hpf.on && c.hpf.freq >= min && c.hpf.slope >= 12, `${p.id}/${l.id}/${c.id} HPF unsafe`);
  }
}
assert.equal(defaultLayout(profileById('demo-spk')!, 'speaker').id, 'spk-2w');
assert.equal(defaultLayout(profileById('gh810')!, 'car').id, 'car-3w');

// guard: a tweeter HPF cannot be switched off, pulled below 1 kHz or made shallower than 12 dB/oct
const g = guardXover('tw', true, { on: false, freq: 20, slope: 6, type: 'BW' }, r500);
assert.deepEqual([g.on, g.freq >= 1000, g.slope >= 12], [true, true, true]);
assert.equal(guardXover('tw', false, { on: false, freq: 20000, slope: 24, type: 'LR' }, r500).on, false);
assert.equal(guardXover('lf', true, { on: false, freq: 20, slope: 12, type: 'LR' }, r500).freq, 20);

// the session enforces the guard for edits and for loaded presets
const ses = new TuningSession(driverFor('demo-spk')!, null);
ses.setXover('HF_L', true, { on: false, freq: 50 });
const hf = ses.state.channels.find(c => c.id === 'HF_L')!;
assert.ok(hf.hpf.on && hf.hpf.freq >= 1000);
const bad = JSON.parse(JSON.stringify(ses.state));
bad.channels.find((c: { id: string }) => c.id === 'HF_R').hpf = { on: false, freq: 20, slope: 6, type: 'BW' };
assert.ok(ses.loadState(bad));
const hfr = ses.state.channels.find(c => c.id === 'HF_R')!;
assert.ok(hfr.hpf.on && hfr.hpf.freq >= 1000 && hfr.hpf.slope >= 12);
assert.equal(ses.loadState({ ...bad, profileId: 'r500' }), false);
assert.equal(ses.live, false);
ses.setLayout('speaker', 'spk-fr-sub');
assert.deepEqual(ses.state.channels.map(c => c.id), ['FR_L', 'FR_R', 'SW']);
ses.dispose();

// time alignment: farthest speaker gets 0 ms, nearer ones wait for the extra path (34.3 cm/ms)
const dspk = profileById('demo-spk')!;
const spk = initialState(dspk, 'speaker', 'spk-2w');
const dl = delaysFromDistances(spk.channels, { HF_L: 300, LF_L: 300, HF_R: 334.3, LF_R: 334.3 }, dspk);
near(dl.HF_R.ms, 0); near(dl.HF_L.ms, 1, 0.011);
const far = delaysFromDistances(spk.channels, { HF_L: 100, HF_R: 900 }, dspk);
assert.ok(far.HF_L.clipped && far.HF_L.ms === dspk.delayMs[1]);

// queue coalesces frames with the same key and keeps only the last one
(async () => {
  const sent: string[] = [];
  const q = new WriteQueue(async fr => { sent.push(fr.label); }, () => {}, 10);
  q.push([{ key: 'g', label: 'g1', bytes: new Uint8Array() }, { key: 'g', label: 'g2', bytes: new Uint8Array() }, { key: 'h', label: 'h1', bytes: new Uint8Array() }]);
  q.start(); await new Promise(r => setTimeout(r, 40)); q.stop();
  assert.deepEqual(sent, ['g2', 'h1']);
  console.log('selftest ok');
})();

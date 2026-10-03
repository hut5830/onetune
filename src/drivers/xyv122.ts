import { BleTarget, Change, Frame } from './types';
import { TuningState } from '../model/tuning';
import { frame7e } from './frame7e';
import { clamp } from '../lib/format';

/**
 * Xinyi XY-HT21MAX (advertises as XYV122…). Bytes observed on our own unit: docs/protocols/xyv122.md.
 * Only commands verified on hardware are encoded; every other change returns no frames, so nothing
 * unverified ever reaches the board.
 */
export const XYV122_BLE: BleTarget = {
  service: '0000ae00-0000-1000-8000-00805f9b34fb',
  write: '0000ae03-0000-1000-8000-00805f9b34fb',
  notify: '0000ae04-0000-1000-8000-00805f9b34fb',
  withResponse: false,
};

export const XYV122_VOLUME_MAX = 30;
/** Bytes after the volume in the unit's own 1F report: "1234" and four zeros. Meaning unknown; sent back unchanged. */
const VOLUME_TAIL = [0x31, 0x32, 0x33, 0x34, 0x00, 0x00, 0x00, 0x00];

export function volumeFrame(level: number): Frame {
  const v = clamp(Math.round(level), 0, XYV122_VOLUME_MAX);
  return { key: 'mv', label: `VOLUME ${v}`, bytes: frame7e([0x1f, 0x01, 0x00, v, ...VOLUME_TAIL]) };
}

export function encodeXyv122(change: Change, s: TuningState): Frame[] {
  return change.kind === 'master' ? [volumeFrame(s.master)] : [];
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scene } from '../drivers/types';
import { TuningState } from './tuning';

export interface Preset { id: string; name: string; profileId: string; savedAt: number; state: TuningState }

const PRESETS = 'onetune.presets.v1';
const LAST = (profileId: string) => `onetune.last.v1.${profileId}`;
const SCENE = 'onetune.scene.v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try { const raw = await AsyncStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
async function writeJson(key: string, v: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or unavailable: presets are a convenience */ }
}

export const store = {
  async presets(profileId?: string): Promise<Preset[]> {
    const all = await readJson<Preset[]>(PRESETS, []);
    return (profileId ? all.filter(p => p.profileId === profileId) : all).sort((a, b) => b.savedAt - a.savedAt);
  },
  async savePreset(name: string, state: TuningState): Promise<Preset> {
    const all = await readJson<Preset[]>(PRESETS, []);
    const p: Preset = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, profileId: state.profileId, savedAt: Date.now(), state };
    await writeJson(PRESETS, [p, ...all]);
    return p;
  },
  async overwritePreset(id: string, state: TuningState) {
    const all = await readJson<Preset[]>(PRESETS, []);
    await writeJson(PRESETS, all.map(p => (p.id === id ? { ...p, state, savedAt: Date.now() } : p)));
  },
  async renamePreset(id: string, name: string) {
    const all = await readJson<Preset[]>(PRESETS, []);
    await writeJson(PRESETS, all.map(p => (p.id === id ? { ...p, name } : p)));
  },
  async deletePreset(id: string) {
    const all = await readJson<Preset[]>(PRESETS, []);
    await writeJson(PRESETS, all.filter(p => p.id !== id));
  },
  last: (profileId: string) => readJson<{ savedAt: number; state: TuningState } | null>(LAST(profileId), null),
  saveLast: (state: TuningState) => writeJson(LAST(state.profileId), { savedAt: Date.now(), state }),
  scene: () => readJson<Scene>(SCENE, 'speaker'),
  saveScene: (s: Scene) => writeJson(SCENE, s),
};

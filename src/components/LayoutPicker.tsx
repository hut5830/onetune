import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CapabilityProfile, Scene } from '../drivers/types';
import { CHANNELS, KIND_COLOR, LayoutDef, defaultLayout, layoutsFor } from '../model/tuning';
import { haptic } from '../lib/haptics';
import { C, F, R, S, alpha } from '../theme';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Btn, Note, Segmented, T } from './ui';

export const SCENE_NAME: Record<Scene, string> = { speaker: 'ลำโพง', car: 'รถยนต์' };

/** Choose installation (speaker / car) and how the DSP outputs are assigned to drivers. */
export function LayoutPicker({ visible, profile, scene, layoutId, onClose, onApply }: {
  visible: boolean; profile: CapabilityProfile; scene: Scene; layoutId: string; onClose: () => void; onApply: (scene: Scene, layoutId: string) => void;
}) {
  const [sc, setSc] = useState<Scene>(scene);
  const [pick, setPick] = useState(layoutId);
  useEffect(() => { if (visible) { setSc(scene); setPick(layoutId); } }, [visible]);
  const list = layoutsFor(profile, sc);
  const changed = pick !== layoutId;

  return (
    <Sheet visible={visible} onClose={onClose} title="การจัดวางลำโพง" sub={`${profile.brand} ${profile.model} · ${profile.outputs} ช่องขาออก`}
      footer={
        <View style={{ gap: S.sm }}>
          {changed && <Note icon="warn" color={C.warn}>ค่าจูนทุกช่องจะกลับเป็นค่าเริ่มต้นที่ปลอดภัย (กดย้อนกลับได้)</Note>}
          <Btn kind="primary" label={changed ? 'ใช้การจัดวางนี้' : 'ปิด'} onPress={() => { if (changed) onApply(sc, pick); onClose(); }} />
        </View>
      }>
      {profile.scenes.length > 1 && (
        <Segmented full options={profile.scenes} value={sc} format={x => SCENE_NAME[x]} onChange={x => { setSc(x); setPick(x === scene ? layoutId : defaultLayout(profile, x).id); }} />
      )}
      {list.map(l => <Row key={l.id} l={l} on={l.id === pick} current={l.id === layoutId} outputs={profile.outputs} onPress={() => { haptic.tick(); setPick(l.id); }} />)}
    </Sheet>
  );
}

function Row({ l, on, current, outputs, onPress }: { l: LayoutDef; on: boolean; current: boolean; outputs: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.row, on && { borderColor: C.accent, backgroundColor: alpha(C.accent, 0.08) }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.name}>{l.name}</Text>
          {current && <Text style={s.now}>ใช้อยู่</Text>}
        </View>
        <T v="small">{l.desc} · ใช้ {l.channels.length}/{outputs} ช่อง</T>
        <View style={s.outs}>
          {l.channels.map((id, i) => {
            const d = CHANNELS[id];
            return (
              <View key={id} style={s.out}>
                <View style={[s.dot, { backgroundColor: KIND_COLOR[d.kind] }]} />
                <Text style={s.outT}>{i + 1} {d.short}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={[s.radio, on && { borderColor: C.accent, backgroundColor: C.accent }]}>{on && <Icon name="check" size={14} color={C.onAccent} width={2.8} />}</View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel2 },
  name: { fontFamily: F.semi, fontSize: 15.5, color: C.ink },
  now: { fontFamily: F.medium, fontSize: 11.5, color: C.ok, backgroundColor: alpha(C.ok, 0.14), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  outs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  out: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.panel3, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  outT: { fontFamily: F.medium, fontSize: 11, color: C.ink2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
});

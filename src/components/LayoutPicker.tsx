import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CapabilityProfile, Scene } from '../drivers/types';
import { CHANNELS, KIND_COLOR, LayoutDef, defaultLayout, layoutsFor } from '../model/tuning';
import { haptic } from '../lib/haptics';
import { C, F, R, S, alpha } from '../theme';
import { Icon } from './Icon';
import { Btn, IconBtn, Segmented, T } from './ui';

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={s.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="ปิด" />
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <View style={s.grab} />
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <T v="label">การจัดวางลำโพง</T>
              <T v="title">{profile.brand} {profile.model} · {profile.outputs} OUT</T>
            </View>
            <IconBtn name="close" label="ปิด" onPress={onClose} />
          </View>
          {profile.scenes.length > 1 && (
            <Segmented full options={profile.scenes} value={sc} format={x => SCENE_NAME[x]} onChange={x => { setSc(x); setPick(x === scene ? layoutId : defaultLayout(profile, x).id); }} />
          )}
          <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: S.sm, paddingVertical: S.md }}>
            {list.map(l => <Row key={l.id} l={l} on={l.id === pick} current={l.id === layoutId} outputs={profile.outputs} onPress={() => { haptic.tick(); setPick(l.id); }} />)}
          </ScrollView>
          {changed && <T v="small" style={{ color: C.amber }}>เปลี่ยนการจัดวางแล้ว ค่าจูนทุกช่องจะกลับเป็นค่าเริ่มต้นที่ปลอดภัย (บันทึกเป็นพรีเซ็ตไว้ก่อนได้)</T>}
          <Btn kind="primary" icon="check" label={changed ? 'ใช้การจัดวางนี้' : 'ปิด'} onPress={() => { if (changed) onApply(sc, pick); onClose(); }} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Row({ l, on, current, outputs, onPress }: { l: LayoutDef; on: boolean; current: boolean; outputs: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[s.row, on && { borderColor: alpha(C.cyan, 0.7), backgroundColor: alpha(C.cyan, 0.08) }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.name}>{l.name}</Text>
          {current && <Text style={s.now}>ใช้อยู่</Text>}
        </View>
        <T v="small">{l.desc} · ใช้ {l.channels.length}/{outputs} OUT</T>
        <View style={s.outs}>
          {l.channels.map((id, i) => {
            const d = CHANNELS[id];
            return (
              <View key={id} style={[s.out, { borderColor: alpha(KIND_COLOR[d.kind], 0.6) }]}>
                <Text style={s.outN}>{i + 1}</Text>
                <Text style={[s.outT, { color: KIND_COLOR[d.kind] }]}>{d.short}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={[s.radio, on && { borderColor: C.cyan }]}>{on && <Icon name="check" size={14} color={C.cyan} width={2.6} />}</View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,4,10,0.72)' },
  sheet: { backgroundColor: C.panel, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderWidth: 1, borderColor: C.line2, paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.lg, gap: S.sm },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.panel2, 0.6) },
  name: { fontFamily: F.head, fontSize: 15.5, color: C.ink },
  now: { fontFamily: F.head, fontSize: 10.5, color: C.ok, borderWidth: 1, borderColor: alpha(C.ok, 0.5), borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  outs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  out: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 },
  outN: { fontFamily: F.head, fontSize: 9, color: C.muted },
  outT: { fontFamily: F.head, fontSize: 10.5 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
});

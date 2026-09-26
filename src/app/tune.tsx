import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverFor } from '../drivers/registry';
import { Scene } from '../drivers/types';
import { TuningSession, useSessionState } from '../model/session';
import { openSession } from '../model/current';
import { TuningState, layoutById } from '../model/tuning';
import { store } from '../model/store';
import { ble } from '../ble/client';
import { connection, useConnection } from '../ble/connection';
import { fmtDb, fmtF } from '../lib/format';
import { haptic } from '../lib/haptics';
import { CarView } from '../components/CarView';
import { SpeakerStage } from '../components/SpeakerStage';
import { ChannelSheet } from '../components/ChannelSheet';
import { LayoutPicker, SCENE_NAME } from '../components/LayoutPicker';
import { ResponseGraph } from '../components/ResponseGraph';
import { Knob } from '../components/Knob';
import { Icon, IconName } from '../components/Icon';
import { useToast } from '../components/Toast';
import { useAskNumber } from '../components/NumberPrompt';
import { Btn, Card, Chip, Header, IconBtn, Mode, Screen, SectionTitle, StatusPill, T, Toggle, st } from '../components/ui';
import { C, F, R, S, alpha } from '../theme';

export default function Tune() {
  const { profile = 'demo', device, name, scene } = useLocalSearchParams<{ profile?: string; device?: string; name?: string; scene?: Scene }>();
  const driver = driverFor(profile);
  const session = useMemo(() => {
    if (!driver) return null;
    const sc = scene && driver.profile.scenes.includes(scene) ? scene : undefined;
    return openSession(driver, device ?? null, name || null, sc);
  }, [driver, device]);
  if (!driver || !session) return <Screen><Header title="ไม่พบรุ่นนี้" sub={profile} /></Screen>;
  return <Studio session={session} />;
}

function Studio({ session }: { session: TuningSession }) {
  const router = useRouter();
  const inset = useSafeAreaInsets();
  const state = useSessionState(session);
  const conn = useConnection();
  const toast = useToast();
  const ask = useAskNumber();
  const p = session.profile;
  const [sel, setSel] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [last, setLast] = useState<{ savedAt: number; state: TuningState } | null>(null);
  const first = useRef(state);

  // Connect for mapped drivers only; unmapped ones never touch the hardware.
  useEffect(() => { if (session.deviceId && session.driver.mapped && ble.available()) void connection.connect(session.deviceId, session.deviceName); }, [session]);
  // Offer the previous session only while nothing has been changed yet.
  useEffect(() => { void store.last(p.id).then(l => { if (l && session.state === first.current) setLast(l); }); }, [p.id]);
  // Autosave the working state (skipping the untouched initial one so it can't overwrite the previous session).
  useEffect(() => {
    if (state === first.current) return;
    setLast(null);
    const t = setTimeout(() => void store.saveLast(state), 700);
    return () => clearTimeout(t);
  }, [state]);

  const mode: Mode = session.live ? 'live' : session.driver.mapped ? 'sim' : 'preview';
  const layout = layoutById(state.layoutId);
  const tools: { icon: IconName; name: string; sub: string; go: () => void; color: string }[] = [
    { icon: 'ruler', name: 'จัดเวลา', sub: 'ดีเลย์จากระยะ', go: () => router.push('/align'), color: C.cyan },
    { icon: 'route', name: 'สัญญาณเข้า', sub: 'แหล่งเสียง · Routing', go: () => router.push('/inputs'), color: C.lime },
    { icon: 'layers', name: 'พรีเซ็ต', sub: 'บันทึก · โหลด', go: () => router.push('/presets'), color: C.violet },
    { icon: 'terminal', name: 'Log คำสั่ง', sub: 'ไบต์ที่ส่งออก', go: () => router.push('/inspector'), color: C.amber },
  ];

  return (
    <Screen>
      <Header title={`${p.brand} ${p.model}`}
        sub={<View style={[st.row, { gap: 8, marginTop: 2 }]}><StatusPill mode={mode} />{session.deviceId && <T v="small" numberOfLines={1} style={{ flex: 1 }}>{conn.deviceId === session.deviceId ? { idle: 'ไม่ได้เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว', error: 'เชื่อมต่อไม่สำเร็จ' }[conn.status] : session.deviceName ?? ''}</T>}</View>}
        right={<IconBtn name="layers" label="พรีเซ็ต" onPress={() => router.push('/presets')} />} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: inset.bottom + 40, gap: S.md }}>
        {mode !== 'live' && (
          <View style={[s.banner, { borderColor: alpha(mode === 'sim' ? C.cyan : C.amber, 0.35), backgroundColor: alpha(mode === 'sim' ? C.cyan : C.amber, 0.07) }]}>
            <Icon name={mode === 'sim' ? 'sparkle' : 'info'} size={18} color={mode === 'sim' ? C.cyan : C.amber} />
            <T v="small" style={{ flex: 1, color: C.ink2 }}>
              {mode === 'sim' ? 'โหมดจำลอง · ปรับได้ทุกอย่าง คำสั่งไปอยู่ใน Log' : `พรีวิวตามสเปก ${p.brand} ${p.model} (${p.source}) · ยังไม่มีไดรเวอร์จริง คำสั่งไม่ถูกส่งไปเครื่อง`}
            </T>
          </View>
        )}

        {last && (
          <View style={[s.banner, { borderColor: alpha(C.violet, 0.4), backgroundColor: alpha(C.violet, 0.08) }]}>
            <Icon name="refresh" size={18} color={C.violet} />
            <T v="small" style={{ flex: 1, color: C.ink2 }}>มีค่าจูนจากครั้งก่อน · {new Date(last.savedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</T>
            <Btn small kind="hot" label="โหลด" onPress={() => { if (session.loadState(last.state)) { haptic.ok(); toast('โหลดค่าจูนครั้งก่อนแล้ว'); } else toast('ค่าที่บันทึกไว้ใช้กับรุ่นนี้ไม่ได้', 'warn'); setLast(null); }} />
            <IconBtn name="close" size={32} label="ไม่โหลด" onPress={() => setLast(null)} />
          </View>
        )}

        <Card pad={false} style={{ paddingTop: S.md, paddingBottom: S.sm }}>
          <View style={[st.row, { paddingHorizontal: S.md, gap: S.sm }]}>
            <Pressable onPress={() => setPicker(true)} style={({ pressed }) => [s.layoutBtn, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="เปลี่ยนการจัดวางลำโพง">
              <Icon name={state.scene === 'car' ? 'car' : 'speaker'} size={18} color={C.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={s.layoutName} numberOfLines={1}>{layout?.name}</Text>
                <T v="small" numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 16 }}>{SCENE_NAME[state.scene]} · ใช้ {state.channels.length}/{p.outputs} OUT</T>
              </View>
              <Icon name="down" size={16} color={C.muted} />
            </Pressable>
          </View>
          {state.scene === 'car'
            ? <CarView channels={state.channels} selected={sel} onSelect={id => { haptic.tap(); setSel(id); }} height={400} />
            : <SpeakerStage channels={state.channels} selected={sel} onSelect={id => { haptic.tap(); setSel(id); }} />}
          <T v="small" style={{ textAlign: 'center' }}>แตะลำโพงเพื่อจูน</T>
        </Card>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Knob label="วอลุ่มรวม" value={state.master} min={-60} max={0} onChange={v => session.setMaster(v)} size={138} />
          <View style={{ flex: 1, gap: S.md }}>
            <View>
              <T v="label">Master</T>
              <Pressable onPress={() => ask({ title: 'วอลุ่มรวม', unit: 'dB', value: state.master, min: -60, max: 0, step: 1, onSet: v => session.setMaster(v) })} accessibilityRole="button" accessibilityHint="แตะเพื่อพิมพ์ค่า">
                <T v="small" style={{ fontSize: 11.5, lineHeight: 16 }}>ลากขึ้นลงที่ปุ่ม · แตะเพื่อพิมพ์ค่า</T>
              </Pressable>
            </View>
            <View style={st.row}>
              <Icon name={state.link ? 'link' : 'unlink'} size={18} color={state.link ? C.cyan : C.muted} />
              <View style={{ flex: 1 }}>
                <T v="bodyMed" style={{ fontSize: 13.5, lineHeight: 19 }}>ลิงก์ L-R</T>
                <T v="small" style={{ fontSize: 11.5, lineHeight: 16 }}>ยกเว้นดีเลย์</T>
              </View>
              <Toggle value={state.link} onChange={v => session.setLink(v)} label="ลิงก์ซ้าย-ขวา" />
            </View>
            <Btn small kind="primary" icon="send" label="ส่งค่าทั้งหมด" onPress={() => { session.sendAll(); haptic.ok(); toast(session.live ? 'ส่งค่าทั้งหมดไปเครื่องแล้ว' : 'ส่งค่าทั้งหมดลง Log แล้ว (ไม่ได้ต่อเครื่องจริง)', session.live ? 'ok' : 'info'); }} />
          </View>
        </Card>

        <SectionTitle label="เส้นตอบสนองรวม" right={<T v="small">{state.channels.filter(c => !c.mute).length} ช่องที่ดังอยู่</T>} />
        <Card pad={false} style={{ paddingTop: S.sm, paddingRight: S.xs }}>
          <ResponseGraph channels={state.channels} selected={null} height={170} top={Math.max(12, p.eq.gain[1])} />
        </Card>

        <SectionTitle label="ช่องสัญญาณขาออก" right={<T v="small">แตะเพื่อจูนละเอียด</T>} />
        <View style={{ gap: S.sm }}>
          {state.channels.map((c, i) => {
            const eqOn = c.eq.some(b => b.g !== 0) && !c.eqBypass;
            return (
              <View key={c.id} style={[s.ch, c.mute && { opacity: 0.6 }]}>
              <Pressable onPress={() => { haptic.tap(); setSel(c.id); }} style={({ pressed }) => [s.chMain, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel={c.name}>
                <View style={[s.chBar, { backgroundColor: c.color, shadowColor: c.color }]} />
                <View style={s.outBox}><Text style={s.outN}>OUT</Text><Text style={s.outV}>{i + 1}</Text></View>
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={[st.row, { gap: 6 }]}>
                    <Text style={s.chName} numberOfLines={1}>{c.name}</Text>
                    {eqOn && <Chip label="EQ" color={c.color} />}
                    {c.phase && <Chip label="180°" color={C.violet} />}
                  </View>
                  <T v="mono" numberOfLines={1} style={{ color: C.muted, fontSize: 11.5 }}>
                    {c.hpf.on ? `${fmtF(c.hpf.freq)}` : '20'}–{c.lpf.on ? fmtF(c.lpf.freq) : '20k'} Hz · {fmtDb(c.gain)} dB · {c.delay.toFixed(2)} ms
                  </T>
                </View>
              </Pressable>
                <IconBtn name="mute" size={36} label={`มิวท์ ${c.short}`} active={c.mute} color={c.mute ? C.danger : C.muted} onPress={() => session.toggleMute(c.id)} />
              </View>
            );
          })}
        </View>

        <SectionTitle label="เครื่องมือ" />
        <View style={s.tools}>
          {tools.map(t => (
            <Pressable key={t.name} onPress={() => { haptic.tap(); t.go(); }} style={({ pressed }) => [s.tool, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button" accessibilityLabel={t.name}>
              <View style={[s.toolIcon, { backgroundColor: alpha(t.color, 0.12), borderColor: alpha(t.color, 0.4) }]}><Icon name={t.icon} size={20} color={t.color} /></View>
              <Text style={s.toolName}>{t.name}</Text>
              <T v="small" numberOfLines={1} style={{ fontSize: 11.5 }}>{t.sub}</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ChannelSheet session={session} state={state} chId={sel} onClose={() => setSel(null)} onSelect={setSel} />
      <LayoutPicker visible={picker} profile={p} scene={state.scene} layoutId={state.layoutId} onClose={() => setPicker(false)}
        onApply={(sc, id) => { session.setLayout(sc, id); haptic.ok(); toast(`เปลี่ยนเป็น ${layoutById(id)?.name} แล้ว`); }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: S.md, borderRadius: R.md, borderWidth: 1 },
  layoutBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1, borderColor: alpha(C.cyan, 0.35), backgroundColor: alpha(C.cyan, 0.06) },
  layoutName: { fontFamily: F.head, fontSize: 14.5, color: C.ink, lineHeight: 20 },
  ch: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingRight: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.panel, 0.9), overflow: 'hidden' },
  chMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  chBar: { width: 4, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  outBox: { width: 36, alignItems: 'center' },
  outN: { fontFamily: F.head, fontSize: 8.5, color: C.muted, letterSpacing: 1 },
  outV: { fontFamily: F.display, fontSize: 18, color: C.ink, lineHeight: 22 },
  chName: { fontFamily: F.head, fontSize: 14.5, color: C.ink, flexShrink: 1, lineHeight: 20 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tool: { width: '48.8%', flexGrow: 1, padding: S.md, gap: 4, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: alpha(C.panel, 0.9) },
  toolIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  toolName: { fontFamily: F.head, fontSize: 15, color: C.ink, lineHeight: 21 },
});

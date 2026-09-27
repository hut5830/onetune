import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { driverFor } from '../drivers/registry';
import { Scene, SourceId } from '../drivers/types';
import { TuningSession, useSessionMeta, useSessionState } from '../model/session';
import { openSession } from '../model/current';
import { GROUPS, TuningState, chName, layoutById } from '../model/tuning';
import { Preset, store } from '../model/store';
import { TuneMode, useSettings } from '../model/settings';
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
import { Slider } from '../components/Slider';
import { Icon, IconName } from '../components/Icon';
import { useToast } from '../components/Toast';
import { Btn, Card, Chip, Header, IconBtn, Mode, Note, Screen, SectionTitle, Segmented, StatusPill, T, Toggle, st, useWide } from '../components/ui';
import { C, F, R, S, alpha } from '../theme';

const SRC_NAME: Record<SourceId, string> = { hl: 'ไฮเลเวล', rca: 'RCA/AUX', opt: 'Optical', bt: 'Bluetooth', usb: 'USB' };

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
  const wide = useWide();
  const state = useSessionState(session);
  const meta = useSessionMeta(session);
  const conn = useConnection();
  const cfg = useSettings();
  const toast = useToast();
  const p = session.profile;
  const [mode, setMode] = useState<TuneMode>(cfg.mode);
  const [sel, setSel] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [last, setLast] = useState<{ savedAt: number; state: TuningState } | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
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
  useEffect(() => {
    if (!cfg.keepAwake) return;
    void activateKeepAwakeAsync('studio').catch(() => {});
    return () => { void deactivateKeepAwake('studio').catch(() => {}); };
  }, [cfg.keepAwake]);
  useFocusEffect(useCallback(() => { void store.presets(p.id).then(setPresets); }, [p.id]));

  const status: Mode = session.live ? 'live' : session.driver.mapped ? 'sim' : 'preview';
  const layout = layoutById(state.layoutId);
  const select = (id: string) => { haptic.tap(); setSel(id); };

  // ── shared pieces ──────────────────────────────────────────────────────
  const banners = (
    <>
      {status !== 'live' && (
        <Note icon={status === 'sim' ? 'info' : 'warn'} color={status === 'sim' ? C.accent : C.warn}>
          {status === 'sim' ? 'โหมดจำลอง · ยังไม่ได้ส่งไปเครื่องจริง' : `พรีวิวตามสเปก ${p.model} · ยังส่งคำสั่งไปเครื่องไม่ได้`}
        </Note>
      )}
      {last && (
        <Note icon="refresh" color={C.violet} right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Btn small kind="primary" label="โหลด" onPress={() => { if (session.loadState(last.state)) { haptic.ok(); toast('โหลดค่าครั้งก่อนแล้ว'); } else toast('ค่าที่บันทึกไว้ใช้กับรุ่นนี้ไม่ได้', 'warn'); setLast(null); }} />
            <IconBtn name="close" size={34} label="ไม่โหลด" onPress={() => setLast(null)} />
          </View>}>
          <T v="small" style={{ color: C.ink2 }}>มีค่าจูนจากครั้งก่อน · {new Date(last.savedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</T>
        </Note>
      )}
      {meta.solo && (
        <Note icon="solo" color={C.violet} right={<Btn small label="เลิกโซโล่" onPress={() => session.solo(meta.solo!)} />}>
          {`กำลังฟังเฉพาะ ${chName(state.channels.find(c => c.id === meta.solo)!)}`}
        </Note>
      )}
    </>
  );

  const abBar = meta.ab === 'off'
    ? <Btn small icon="compare" label="เทียบ A/B" onPress={() => { session.abStart(); toast('เก็บเสียงตอนนี้เป็น A แล้ว ปรับต่อเป็น B แล้วสลับฟังได้', 'info'); }} />
    : (
      <View style={[st.row, { gap: S.sm }]}>
        <Segmented options={['A', 'B'] as const} value={meta.ab} onChange={v => { if (v !== meta.ab) session.abSwap(); }} />
        <Btn small kind="ghost" label={`ใช้ ${meta.ab}`} onPress={() => { session.abEnd(); toast(`ใช้เสียง ${meta.ab} ต่อ`); }} />
      </View>
    );

  const master = (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
      <Knob label="ระดับเสียงรวม" value={state.master} min={-60} max={0} onChange={v => session.setMaster(v)} size={mode === 'easy' ? 160 : 136} />
      <View style={{ flex: 1, gap: S.md }}>
        <View>
          <T v="h">ระดับเสียงรวม</T>
          <T v="small">ลากขึ้น-ลงที่ปุ่มหมุน</T>
        </View>
        {mode === 'easy' ? (
          <View style={st.row}>
            <T v="bodyMed" style={{ flex: 1 }}>ปิดเสียงทั้งหมด</T>
            <Toggle value={state.channels.every(c => c.mute)} onChange={v => session.muteAll(v)} label="ปิดเสียงทั้งหมด" />
          </View>
        ) : (
          <>
            <View style={st.row}>
              <T v="bodyMed" style={{ flex: 1 }}>ลิงก์ซ้าย-ขวา</T>
              <Toggle value={state.link} onChange={v => session.setLink(v)} label="ลิงก์ซ้าย-ขวา" />
            </View>
            {abBar}
          </>
        )}
      </View>
    </Card>
  );

  // ── simple mode ───────────────────────────────────────────────────────
  const groups = GROUPS.map(g => ({ g, members: state.channels.filter(c => g.kinds.includes(c.kind)) })).filter(x => x.members.length);
  const subs = state.channels.filter(c => c.kind === 'sub');
  const [gLo, gHi] = [Math.max(p.channelGain[0], -30), p.channelGain[1]];
  const easyLevels = (
    <Card style={{ gap: S.md }}>
      <T v="h">ระดับเสียงแต่ละส่วน</T>
      {groups.map(({ g, members }) => {
        const avg = +(members.reduce((a, c) => a + c.gain, 0) / members.length).toFixed(1);
        const color = members[0].color;
        return (
          <View key={g.id} style={{ gap: 2 }}>
            <View style={st.row}>
              <View style={[s.dot, { backgroundColor: color }]} />
              <T v="bodyMed" style={{ flex: 1 }}>{g.name}</T>
              <Text style={s.lvl}>{fmtDb(avg)} dB</Text>
            </View>
            <Slider big label={`ระดับ${g.name}`} value={avg} min={gLo} max={gHi} origin={0} step={0.5} color={color} onChange={v => session.setGroupLevel(g.id, v)} />
          </View>
        );
      })}
    </Card>
  );
  const easySub = subs.length > 0 && (
    <Card style={{ gap: S.xs }}>
      <View style={st.row}>
        <T v="h" style={{ flex: 1 }}>ซับทำงานถึง</T>
        <Text style={s.lvl}>{Math.round(subs[0].lpf.freq)} Hz</Text>
      </View>
      <T v="small">ต่ำลง = เบสลึกแน่น · สูงขึ้น = เบสอิ่มแต่อาจฟังออกว่าเสียงมาจากซับ</T>
      <Slider big label="ความถี่ตัดซับ" value={subs[0].lpf.freq} min={40} max={160} step={1} color={subs[0].color}
        onChange={v => subs.forEach(c => session.setXover(c.id, false, { freq: v, on: true }))} />
    </Card>
  );
  const easySource = p.sources.length > 1 && (
    <Card>
      <T v="h">แหล่งเสียง</T>
      <Segmented options={p.sources} value={state.source} format={x => SRC_NAME[x]} onChange={v => session.setSource(v)} />
    </Card>
  );
  const easyPresets = (
    <Card>
      <View style={st.row}>
        <T v="h" style={{ flex: 1 }}>พรีเซ็ต</T>
        <Btn small kind="ghost" label="จัดการ" onPress={() => router.push('/presets')} />
      </View>
      {presets.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {presets.slice(0, 8).map(pr => (
            <Pressable key={pr.id} onPress={() => { if (session.loadState(pr.state)) { haptic.ok(); toast(`โหลด "${pr.name}" แล้ว`); } }} style={({ pressed }) => [s.preset, pressed && { opacity: 0.7 }]} accessibilityRole="button">
              <Icon name="layers" size={15} color={C.violet} />
              <Text style={s.presetT} numberOfLines={1}>{pr.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : <T v="small">ยังไม่มี · จูนเสร็จแล้วกด "จัดการ" เพื่อบันทึก</T>}
    </Card>
  );

  // ── detailed mode ─────────────────────────────────────────────────────
  const stage = (
    <Card pad={false} style={{ paddingTop: S.md, paddingBottom: S.sm }}>
      <Pressable onPress={() => setPicker(true)} style={({ pressed }) => [s.layoutBtn, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel="เปลี่ยนการจัดวางลำโพง">
        <Icon name={state.scene === 'car' ? 'car' : 'speaker'} size={18} color={C.accent} />
        <View style={{ flex: 1 }}>
          <Text style={s.layoutName} numberOfLines={1}>{layout?.name}</Text>
          <T v="small" numberOfLines={1} style={{ fontSize: 12, lineHeight: 17 }}>{SCENE_NAME[state.scene]} · ใช้ {state.channels.length}/{p.outputs} ช่อง · แตะเพื่อเปลี่ยน</T>
        </View>
        <Icon name="down" size={16} color={C.muted} />
      </Pressable>
      {state.scene === 'car'
        ? <CarView channels={state.channels} selected={sel} onSelect={select} height={wide ? 360 : 400} />
        : <SpeakerStage channels={state.channels} selected={sel} onSelect={select} maxHeight={wide ? 250 : undefined} />}
      <T v="small" style={{ textAlign: 'center' }}>แตะลำโพงเพื่อปรับละเอียด</T>
    </Card>
  );
  const graph = (
    <>
      <SectionTitle label="เส้นตอบสนองรวม" right={<T v="small">{state.channels.filter(c => !c.mute).length} ช่องที่ดังอยู่</T>} />
      <Card pad={false} style={{ paddingTop: S.sm, paddingRight: S.xs }}>
        <ResponseGraph channels={state.channels} selected={null} height={170} top={Math.max(12, p.eq.gain[1])} />
      </Card>
    </>
  );
  const channelList = (
    <>
      <SectionTitle label="ช่องขาออก" right={<T v="small">แตะเพื่อปรับ</T>} />
      <View style={{ gap: S.sm }}>
        {state.channels.map((c, i) => {
          const eqOn = c.eq.some(b => b.g !== 0) && !c.eqBypass;
          return (
            <View key={c.id} style={[s.ch, c.mute && { opacity: 0.55 }]}>
              <Pressable onPress={() => select(c.id)} style={({ pressed }) => [s.chMain, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={chName(c)}>
                <View style={[s.chNum, { backgroundColor: alpha(c.color, 0.16) }]}><Text style={[s.chNumT, { color: c.color }]}>{i + 1}</Text></View>
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={[st.row, { gap: 6 }]}>
                    <Text style={s.chName} numberOfLines={1}>{chName(c)}</Text>
                    {eqOn && <Chip label="EQ" color={c.color} />}
                    {c.phase && <Chip label="180°" color={C.violet} />}
                  </View>
                  <T v="mono" numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
                    {c.hpf.on ? fmtF(c.hpf.freq) : '20'}–{c.lpf.on ? fmtF(c.lpf.freq) : '20k'} Hz · {fmtDb(c.gain)} dB · {c.delay.toFixed(2)} ms
                  </T>
                </View>
              </Pressable>
              <IconBtn name="mute" size={36} label={`ปิดเสียง ${c.short}`} active={c.mute} color={c.mute ? C.danger : C.muted} onPress={() => session.toggleMute(c.id)} />
            </View>
          );
        })}
      </View>
    </>
  );
  const tools: { icon: IconName; name: string; go: () => void }[] = [
    { icon: 'ruler', name: 'จัดเวลาจากระยะ', go: () => router.push('/align') },
    { icon: 'route', name: 'สัญญาณเข้า', go: () => router.push('/inputs') },
    { icon: 'layers', name: 'พรีเซ็ต', go: () => router.push('/presets') },
    { icon: 'send', name: 'ส่งค่าทั้งหมด', go: () => { session.sendAll(); haptic.ok(); toast(session.live ? 'ส่งค่าทั้งหมดไปเครื่องแล้ว' : 'ส่งค่าทั้งหมดลง Log แล้ว', session.live ? 'ok' : 'info'); } },
    { icon: 'terminal', name: 'Log คำสั่ง', go: () => router.push('/inspector') },
  ];
  const toolGrid = (
    <>
      <SectionTitle label="เครื่องมือ" />
      <View style={s.tools}>
        {tools.map(t => (
          <Pressable key={t.name} onPress={() => { haptic.tap(); t.go(); }} style={({ pressed }) => [s.tool, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={t.name}>
            <Icon name={t.icon} size={20} color={C.accent} />
            <Text style={s.toolName} numberOfLines={1}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  const col = (children: ReactNode) => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: S.md, paddingBottom: inset.bottom + 40 }}>{children}</ScrollView>
  );

  let body: ReactNode;
  if (mode === 'easy') {
    body = wide
      ? <View style={s.cols}>{col(<>{banners}{master}{easySource}{easyPresets}</>)}{col(<>{easyLevels}{easySub}</>)}</View>
      : <ScrollView contentContainerStyle={s.single(inset)}><View style={s.inner}>{banners}{master}{easyLevels}{easySub}{easySource}{easyPresets}</View></ScrollView>;
  } else {
    body = wide
      ? <View style={s.cols}>{col(<>{banners}{stage}{master}</>)}{col(<>{graph}{channelList}{toolGrid}</>)}</View>
      : <ScrollView contentContainerStyle={s.single(inset)}><View style={s.inner}>{banners}{stage}{master}{graph}{channelList}{toolGrid}</View></ScrollView>;
  }

  return (
    <Screen>
      <Header title={`${p.brand} ${p.model}`}
        sub={<View style={[st.row, { gap: 8, marginTop: 2 }]}><StatusPill mode={status} />{session.deviceId && conn.deviceId === session.deviceId && <T v="small" numberOfLines={1} style={{ flex: 1 }}>{{ idle: 'ไม่ได้เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว', error: 'เชื่อมต่อไม่สำเร็จ' }[conn.status]}</T>}</View>}
        right={<View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {wide && <View style={{ width: 260, marginRight: S.sm }}><Segmented full options={['easy', 'pro'] as const} value={mode} format={m => (m === 'easy' ? 'ใช้งานง่าย' : 'ปรับละเอียด')} onChange={setMode} /></View>}
          <IconBtn name="undo" label="ย้อนกลับ" disabled={!meta.canUndo} onPress={() => session.undo()} />
          <IconBtn name="redo" label="ทำซ้ำ" disabled={!meta.canRedo} onPress={() => session.redo()} />
        </View>} />
      {!wide && (
        <View style={[s.modeBar, { paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg }]}>
          <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}><Segmented full options={['easy', 'pro'] as const} value={mode} format={m => (m === 'easy' ? 'ใช้งานง่าย' : 'ปรับละเอียด')} onChange={setMode} /></View>
        </View>
      )}
      <View style={{ flex: 1, paddingLeft: inset.left, paddingRight: inset.right }}>{body}</View>

      <ChannelSheet session={session} state={state} chId={sel} onClose={() => setSel(null)} onSelect={setSel} />
      <LayoutPicker visible={picker} profile={p} scene={state.scene} layoutId={state.layoutId} onClose={() => setPicker(false)}
        onApply={(sc, id) => { session.setLayout(sc, id); haptic.ok(); toast(`เปลี่ยนเป็น ${layoutById(id)?.name} แล้ว`); }} />
    </Screen>
  );
}

const s = {
  ...StyleSheet.create({
    modeBar: { paddingBottom: S.md },
    cols: { flex: 1, flexDirection: 'row', gap: S.lg, paddingHorizontal: S.lg, maxWidth: 1200, width: '100%', alignSelf: 'center' },
    inner: { gap: S.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5 },
    lvl: { fontFamily: F.semi, fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
    preset: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: C.panel2, maxWidth: '100%' },
    presetT: { fontFamily: F.medium, fontSize: 14, color: C.ink, flexShrink: 1 },
    layoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: S.md, paddingVertical: 9, paddingHorizontal: 12, borderRadius: R.md, backgroundColor: C.panel2 },
    layoutName: { fontFamily: F.semi, fontSize: 14.5, color: C.ink, lineHeight: 21 },
    ch: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingRight: S.md, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
    chMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md },
    chNum: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    chNumT: { fontFamily: F.bold, fontSize: 15 },
    chName: { fontFamily: F.semi, fontSize: 14.5, color: C.ink, flexShrink: 1, lineHeight: 21 },
    tools: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
    tool: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: S.md, borderRadius: R.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, flexGrow: 1, minWidth: '45%' },
    toolName: { fontFamily: F.medium, fontSize: 14, color: C.ink, flexShrink: 1 },
  }),
  single: (inset: { bottom: number }) => ({ paddingHorizontal: S.lg, paddingBottom: inset.bottom + 40 }),
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ble, ScanHit, State } from '../ble/client';
import { requestBlePermissions } from '../ble/permissions';
import { PROFILES, matchProfile } from '../drivers/profiles';
import { driverFor } from '../drivers/registry';
import { CapabilityProfile, Scene } from '../drivers/types';
import { store } from '../model/store';
import { haptic } from '../lib/haptics';
import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { Radar } from '../components/Radar';
import { Btn, Card, Chip, IconBtn, Note, Screen, SectionTitle, T, Toggle, useWide } from '../components/ui';
import { C, F, R, S, alpha } from '../theme';

const SCAN_MS = 12000;
const SCENES: { id: Scene; name: string; sub: string; icon: IconName }[] = [
  { id: 'speaker', name: 'ลำโพง', sub: 'ตู้แอคทีฟ · ซับ', icon: 'speaker' },
  { id: 'car', name: 'รถยนต์', sub: 'DSP ติดรถ', icon: 'car' },
];

export default function Home() {
  const router = useRouter();
  const inset = useSafeAreaInsets();
  const wide = useWide();
  const [scene, setScene] = useState<Scene>('speaker');
  const [hits, setHits] = useState<Record<string, ScanHit>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [btState, setBtState] = useState<string>('Unknown');
  const [namedOnly, setNamedOnly] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const available = ble.available();

  useEffect(() => { void store.scene().then(setScene); }, []);
  useEffect(() => ble.onState(s => setBtState(s)), []);
  useEffect(() => () => { ble.stopScan(); if (timer.current) clearTimeout(timer.current); }, []);

  const pickScene = (s: Scene) => { haptic.tick(); setScene(s); void store.saveScene(s); };
  const stop = () => { ble.stopScan(); setScanning(false); if (timer.current) clearTimeout(timer.current); };
  const scan = async () => {
    setError(null);
    if (!(await requestBlePermissions())) { setError('ต้องอนุญาต Bluetooth (และตำแหน่งบน Android 11 ลงไป) ก่อนค้นหาอุปกรณ์'); haptic.warn(); return; }
    if (btState !== State.PoweredOn) { setError('เปิด Bluetooth ของมือถือก่อน แล้วลองค้นหาอีกครั้ง'); haptic.warn(); return; }
    setHits({}); setScanning(true);
    ble.startScan(h => setHits(prev => ({ ...prev, [h.id]: { ...prev[h.id], ...h, name: h.name ?? prev[h.id]?.name ?? null } })), msg => { setError(msg); setScanning(false); });
    timer.current = setTimeout(stop, SCAN_MS);
  };

  const list = useMemo(() => Object.values(hits).filter(h => !namedOnly || h.name).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)), [hits, namedOnly]);
  const demos = PROFILES.filter(p => p.scenes.includes(scene));

  const openTune = (p: CapabilityProfile, h?: ScanHit) => {
    stop();
    router.push({ pathname: '/tune', params: { profile: p.id, scene, ...(h ? { device: h.id, name: h.name ?? '' } : {}) } });
  };
  const openInspector = (h: ScanHit) => { stop(); router.push({ pathname: '/inspector', params: { id: h.id, name: h.name ?? '' } }); };
  const btOk = available && btState === State.PoweredOn;
  const btLabel = !available ? 'Bluetooth ใช้ไม่ได้ในแอปรุ่นนี้' : btState === State.PoweredOn ? 'Bluetooth พร้อม' : btState === State.PoweredOff ? 'Bluetooth ปิดอยู่' : `Bluetooth: ${btState}`;

  const intro = (
    <View style={{ gap: S.md }}>
      <View style={{ gap: 2, marginTop: S.sm }}>
        <T v="display">จูนเสียงให้ลงตัว</T>
        <T v="body">EQ ครอสโอเวอร์ ดีเลย์ และพรีเซ็ต สำหรับชุดลำโพงและเครื่องเสียงรถ</T>
      </View>
      <View style={s.scenes}>
        {SCENES.map(x => {
          const on = x.id === scene;
          return (
            <Pressable key={x.id} onPress={() => pickScene(x.id)} style={[s.scene, on && s.sceneOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Icon name={x.icon} size={26} color={on ? C.accent : C.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[s.sceneName, on && { color: C.ink }]}>{x.name}</Text>
                <T v="small" numberOfLines={1}>{x.sub}</T>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
          <Radar active={scanning} size={96} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h">{scanning ? 'กำลังค้นหา…' : list.length ? `พบ ${list.length} อุปกรณ์` : 'เชื่อมต่อเครื่อง'}</T>
            <T v="small">{scene === 'speaker' ? 'เปิดเครื่องลำโพง/DSP ไว้ใกล้มือถือ แล้วกดค้นหา' : 'เปิดกุญแจรถ (ACC) ให้ DSP ทำงาน แล้วกดค้นหา'}</T>
          </View>
        </View>
        <Btn kind={scanning ? 'default' : 'primary'} icon={scanning ? 'pause' : 'bluetooth'} label={scanning ? 'หยุดค้นหา' : 'ค้นหาอุปกรณ์'} onPress={scanning ? stop : () => void scan()} disabled={!available} />
        <View style={s.btRow}>
          <View style={[s.btDot, { backgroundColor: btOk ? C.ok : C.warn }]} />
          <T v="small" style={{ flex: 1 }}>{btLabel}</T>
          <T v="small">เฉพาะที่มีชื่อ</T>
          <Toggle value={namedOnly} onChange={setNamedOnly} label="แสดงเฉพาะอุปกรณ์ที่มีชื่อ" />
        </View>
        {error && <Note icon="warn" color={C.danger}>{error}</Note>}
        {!available && <Note icon="info" color={C.warn}>Expo Go และเว็บไม่มี Bluetooth ต้องใช้ APK · ระหว่างนี้ลองจูนแบบไม่ต่อเครื่องได้</Note>}
      </Card>
    </View>
  );

  const lists = (
    <View style={{ gap: S.md }}>
      {list.length > 0 && (
        <View style={{ gap: S.sm }}>
          <SectionTitle label="อุปกรณ์ที่พบ" />
          {list.map(h => {
            const p = matchProfile(h.name);
            const d = p && driverFor(p.id);
            const bars = h.rssi == null ? 0 : h.rssi > -60 ? 4 : h.rssi > -70 ? 3 : h.rssi > -80 ? 2 : 1;
            return (
              <View key={h.id} style={s.row}>
                <Pressable onPress={() => (p ? openTune(p, h) : openInspector(h))} style={({ pressed }) => [s.rowMain, pressed && { opacity: 0.7 }]} accessibilityRole="button">
                  <Signal bars={bars} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.rowName} numberOfLines={1}>{h.name ?? '(ไม่มีชื่อ)'}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {p ? <Chip label={`${p.brand} ${p.model}`} color={d?.mapped ? C.ok : C.warn} /> : <Chip label="ไม่รู้จักรุ่น" />}
                    </View>
                  </View>
                </Pressable>
                <IconBtn name="terminal" size={38} label="เปิด BLE Inspector" onPress={() => openInspector(h)} />
              </View>
            );
          })}
        </View>
      )}
      <View style={{ gap: S.sm }}>
        <SectionTitle label="ลองจูนโดยไม่ต่อเครื่อง" />
        {demos.map(p => {
          const demo = p.family === 'demo';
          return (
            <Pressable key={p.id} onPress={() => { haptic.tap(); openTune(p); }} style={({ pressed }) => [s.row, s.rowMain, { paddingRight: S.md }, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`${p.brand} ${p.model}`}>
              <View style={s.demoIcon}><Icon name={scene === 'speaker' ? 'speaker' : 'car'} size={22} color={demo ? C.accent : C.ink2} /></View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={s.rowName} numberOfLines={1}>{demo ? p.model : `${p.brand} ${p.model}`}</Text>
                <T v="small" numberOfLines={1}>{p.outputs} ช่องขาออก · {demo ? 'ทดลองได้ทุกฟีเจอร์' : 'ดูหน้าจอตามสเปกรุ่นนี้'}</T>
              </View>
              <Chip label={demo ? 'ทดลอง' : 'พรีวิว'} color={demo ? C.accent : C.warn} />
              <Icon name="chevron" size={18} color={C.faint} />
            </Pressable>
          );
        })}
      </View>
      <Note icon="shield" color={C.muted}>รุ่นที่ยังไม่ได้ถอดโปรโตคอลจะไม่ส่งคำสั่งไปเครื่องจริง · ทวีตเตอร์ล็อก HPF ไว้เสมอเพื่อกันลำโพงขาด</Note>
    </View>
  );

  return (
    <Screen>
      <View style={[s.top, { paddingTop: inset.top + S.sm, paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg }]}>
        <Logo />
        <View style={{ flex: 1 }} />
        <IconBtn name="terminal" label="Log คำสั่ง" onPress={() => router.push('/inspector')} />
        <IconBtn name="settings" label="ตั้งค่า" onPress={() => router.push('/settings')} />
      </View>
      <ScrollView contentContainerStyle={{ paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg, paddingBottom: inset.bottom + 40 }}>
        {wide ? (
          <View style={{ flexDirection: 'row', gap: S.xl, alignItems: 'flex-start', maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
            <View style={{ flex: 1 }}>{intro}</View>
            <View style={{ flex: 1, paddingTop: S.sm }}>{lists}</View>
          </View>
        ) : (
          <View style={{ gap: S.lg, maxWidth: 640, width: '100%', alignSelf: 'center' }}>{intro}{lists}</View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Signal({ bars }: { bars: number }) {
  return (
    <View style={s.signal}>
      {[1, 2, 3, 4].map(i => <View key={i} style={{ width: 4, height: 4 + i * 4, borderRadius: 2, backgroundColor: i <= bars ? (bars >= 3 ? C.ok : bars === 2 ? C.warn : C.danger) : C.line2 }} />)}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingBottom: S.sm },
  scenes: { flexDirection: 'row', gap: S.sm },
  scene: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel },
  sceneOn: { borderColor: C.accent, backgroundColor: alpha(C.accent, 0.08) },
  sceneName: { fontFamily: F.semi, fontSize: 16.5, color: C.ink2, lineHeight: 24 },
  btRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  btDot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.panel, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, paddingRight: S.sm },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md },
  rowName: { fontFamily: F.semi, color: C.ink, fontSize: 15, lineHeight: 22 },
  demoIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center' },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, width: 26, height: 22 },
});

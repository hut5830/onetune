import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ble, ScanHit, State } from '../ble/client';
import { requestBlePermissions } from '../ble/permissions';
import { FAMILY_NAME, PROFILES, matchProfile } from '../drivers/profiles';
import { driverFor } from '../drivers/registry';
import { CapabilityProfile, Scene } from '../drivers/types';
import { store } from '../model/store';
import { haptic } from '../lib/haptics';
import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { Radar } from '../components/Radar';
import { Btn, Card, Chip, IconBtn, Screen, SectionTitle, T, Toggle } from '../components/ui';
import { C, F, G, R, S, alpha } from '../theme';

const SCAN_MS = 12000;
const SCENES: { id: Scene; name: string; sub: string; icon: IconName }[] = [
  { id: 'speaker', name: 'ลำโพง', sub: 'ตู้แอคทีฟ · 2/3 ทาง · ซับ', icon: 'speaker' },
  { id: 'car', name: 'รถยนต์', sub: 'DSP ติดรถ · 6–10 ช่อง', icon: 'car' },
];

export default function Home() {
  const router = useRouter();
  const inset = useSafeAreaInsets();
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

  const btLabel = !available ? 'Bluetooth ใช้ไม่ได้ในแอปรุ่นนี้' : btState === State.PoweredOn ? 'Bluetooth พร้อม' : btState === State.PoweredOff ? 'Bluetooth ปิดอยู่' : `Bluetooth: ${btState}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: inset.top + S.md, paddingBottom: inset.bottom + 48, paddingHorizontal: S.lg, gap: S.lg }}>
        <View style={s.top}>
          <Logo size={38} />
          <IconBtn name="terminal" label="Log คำสั่ง" onPress={() => router.push('/inspector')} />
        </View>

        <View style={{ gap: 6, marginTop: S.sm }}>
          <T v="display">จูนทุก DSP{'\n'}ในแอปเดียว</T>
          <T v="body">EQ · ครอสโอเวอร์ · ดีเลย์ · พรีเซ็ต สำหรับชุดลำโพงและเครื่องเสียงรถยนต์ ผ่าน Bluetooth</T>
        </View>

        <View style={s.scenes}>
          {SCENES.map(x => {
            const on = x.id === scene;
            return (
              <Pressable key={x.id} onPress={() => pickScene(x.id)} style={({ pressed }) => [s.scene, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                {on && <LinearGradient colors={G.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />}
                <View style={[s.sceneIn, on && { backgroundColor: '#0C1330' }]}>
                  <View style={[s.sceneIcon, on && { backgroundColor: alpha(C.cyan, 0.15), borderColor: alpha(C.cyan, 0.5) }]}>
                    <Icon name={x.icon} size={24} color={on ? C.cyan : C.muted} />
                  </View>
                  <Text style={[s.sceneName, on && { color: C.ink }]}>{x.name}</Text>
                  <T v="small" numberOfLines={1}>{x.sub}</T>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Card glow={scanning ? C.cyan : undefined} style={{ alignItems: 'center', gap: S.md, paddingVertical: S.xl }}>
          <Radar active={scanning} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <T v="h">{scanning ? 'กำลังค้นหา…' : list.length ? `พบ ${list.length} อุปกรณ์` : 'เชื่อมต่อ DSP'}</T>
            <T v="small" style={{ textAlign: 'center' }}>
              {scene === 'speaker' ? 'เปิดเครื่องลำโพง/DSP ให้อยู่ใกล้มือถือ แล้วกดค้นหา' : 'เปิดกุญแจรถ (ACC) ให้ DSP ทำงาน แล้วกดค้นหา'}
            </T>
          </View>
          <Btn kind={scanning ? 'default' : 'primary'} icon={scanning ? 'pause' : 'radar'} label={scanning ? 'หยุดค้นหา' : 'ค้นหาอุปกรณ์'} onPress={scanning ? stop : () => void scan()} disabled={!available} style={{ alignSelf: 'stretch' }} />
          <View style={s.btRow}>
            <View style={[s.btDot, { backgroundColor: available && btState === State.PoweredOn ? C.ok : C.amber }]} />
            <T v="small" style={{ flex: 1 }}>{btLabel}</T>
            <T v="small">เฉพาะที่มีชื่อ</T>
            <Toggle value={namedOnly} onChange={setNamedOnly} label="แสดงเฉพาะอุปกรณ์ที่มีชื่อ" />
          </View>
          {error && <View style={s.err}><Icon name="warn" size={16} color={C.danger} /><Text style={s.errT} accessibilityLiveRegion="polite">{error}</Text></View>}
          {!available && (
            <View style={s.warnBox}>
              <Icon name="info" size={16} color={C.amber} />
              <T v="small" style={{ flex: 1 }}>Expo Go และเว็บไม่มีโมดูล Bluetooth ต้องใช้ APK หรือ development build ระหว่างนี้ลองโหมดทดลองด้านล่างได้</T>
            </View>
          )}
        </Card>

        {list.length > 0 && (
          <View style={{ gap: S.sm }}>
            <SectionTitle label="อุปกรณ์ที่พบ" />
            {list.map(h => {
              const p = matchProfile(h.name);
              const d = p && driverFor(p.id);
              const bars = h.rssi == null ? 0 : h.rssi > -60 ? 4 : h.rssi > -70 ? 3 : h.rssi > -80 ? 2 : 1;
              return (
                <View key={h.id} style={s.dev}>
                <Pressable onPress={() => (p ? openTune(p, h) : openInspector(h))} style={({ pressed }) => [s.devMain, pressed && { opacity: 0.8 }]} accessibilityRole="button">
                  <Signal bars={bars} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.devName} numberOfLines={1}>{h.name ?? '(ไม่มีชื่อ)'}</Text>
                    <T v="mono" numberOfLines={1} style={{ color: C.muted, fontSize: 11 }}>{h.id} · {h.rssi ?? '—'} dBm</T>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      {p ? <Chip label={`${p.brand} ${p.model}`} color={d?.mapped ? C.ok : C.amber} /> : <Chip label="ไม่รู้จักรุ่น · เปิด Inspector" />}
                    </View>
                  </View>
                </Pressable>
                <IconBtn name="terminal" size={36} label="เปิด BLE Inspector" onPress={() => openInspector(h)} />
                </View>
              );
            })}
          </View>
        )}

        <View style={{ gap: S.sm }}>
          <SectionTitle label={`ลองจูนโดยไม่ต่อเครื่อง · ${scene === 'speaker' ? 'ลำโพง' : 'รถยนต์'}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingRight: S.lg }} style={{ marginHorizontal: -S.lg }} contentInset={{ left: S.lg }}>
            <View style={{ width: S.lg - S.md }} />
            {demos.map(p => {
              const demo = p.family === 'demo';
              return (
                <Pressable key={p.id} onPress={() => { haptic.tap(); openTune(p); }} style={({ pressed }) => [s.demo, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button" accessibilityLabel={`${p.brand} ${p.model}`}>
                  <LinearGradient colors={demo ? [alpha(C.cyan, 0.2), alpha(C.violet, 0.12)] : [alpha(C.panel3, 0.9), alpha(C.panel, 0.9)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Icon name={scene === 'speaker' ? 'speaker' : 'car'} size={22} color={demo ? C.cyan : C.ink2} />
                    <Chip label={demo ? 'ทดลอง' : 'พรีวิว'} color={demo ? C.cyan : C.amber} />
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={s.demoOut}>{p.outputs}<Text style={s.demoOutU}> OUT</Text></Text>
                  <Text style={s.demoBrand} numberOfLines={1}>{p.brand}</Text>
                  <T v="small" numberOfLines={2} style={{ color: C.ink2 }}>{p.model}</T>
                  <T v="small" numberOfLines={1}>{FAMILY_NAME[p.family]} · {p.transport}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={s.safety}>
          <Icon name="shield" size={18} color={C.muted} />
          <T v="small" style={{ flex: 1 }}>รุ่นที่ยังไม่ได้ถอดโปรโตคอลจะไม่ส่งคำสั่งไปเครื่องจริง คำสั่งอยู่ใน Log เท่านั้น · ทวีตเตอร์ล็อก HPF ไว้เสมอเพื่อกันลำโพงขาด</T>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Signal({ bars }: { bars: number }) {
  return (
    <View style={s.signal}>
      {[1, 2, 3, 4].map(i => <View key={i} style={{ width: 4, height: 4 + i * 4, borderRadius: 2, backgroundColor: i <= bars ? (bars >= 3 ? C.ok : bars === 2 ? C.amber : C.danger) : C.line2 }} />)}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scenes: { flexDirection: 'row', gap: S.md },
  scene: { flex: 1, borderRadius: R.lg, padding: 1.5, backgroundColor: C.line },
  sceneIn: { borderRadius: R.lg - 1.5, backgroundColor: C.panel, padding: S.md, gap: 4, minHeight: 112 },
  sceneIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sceneName: { fontFamily: F.head, fontSize: 18, color: C.ink2, lineHeight: 25 },
  btRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, alignSelf: 'stretch' },
  btDot: { width: 8, height: 8, borderRadius: 4 },
  err: { flexDirection: 'row', gap: 8, alignItems: 'center', alignSelf: 'stretch', padding: S.sm, borderRadius: R.sm, backgroundColor: alpha(C.danger, 0.1) },
  errT: { fontFamily: F.body, color: C.danger, fontSize: 13, flex: 1 },
  warnBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', alignSelf: 'stretch', padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: alpha(C.amber, 0.3), backgroundColor: alpha(C.amber, 0.06) },
  dev: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: alpha(C.panel, 0.9), borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.md },
  devMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md },
  devName: { fontFamily: F.head, color: C.ink, fontSize: 15.5 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, width: 26, height: 22 },
  demo: { width: 168, height: 196, borderRadius: R.lg, borderWidth: 1, borderColor: C.line2, padding: S.md, gap: 2, overflow: 'hidden' },
  demoOut: { fontFamily: F.display, fontSize: 30, color: C.ink, lineHeight: 36 },
  demoOutU: { fontFamily: F.head, fontSize: 13, color: C.cyan },
  demoBrand: { fontFamily: F.head, fontSize: 15, color: C.ink, lineHeight: 21 },
  safety: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: S.xs },
});

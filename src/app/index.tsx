import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ble, ScanHit, State } from '../ble/client';
import { requestBlePermissions } from '../ble/permissions';
import { FAMILY_NAME, PROFILES, matchProfile } from '../drivers/profiles';
import { driverFor } from '../drivers/registry';
import { Btn, Card, Toggle, st } from '../components/ui';
import { C, R, S } from '../theme';

const SCAN_MS = 12000;

export default function ScanScreen() {
  const router = useRouter();
  const [hits, setHits] = useState<Record<string, ScanHit>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [btState, setBtState] = useState<string>('Unknown');
  const [namedOnly, setNamedOnly] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const available = ble.available();

  useEffect(() => ble.onState(s => setBtState(s)), []);
  useEffect(() => () => { ble.stopScan(); if (timer.current) clearTimeout(timer.current); }, []);

  const stop = () => { ble.stopScan(); setScanning(false); if (timer.current) clearTimeout(timer.current); };
  const scan = async () => {
    setError(null);
    if (!(await requestBlePermissions())) { setError('ต้องอนุญาต Bluetooth (และตำแหน่งบน Android 11 ลงไป) ก่อนค้นหาอุปกรณ์'); return; }
    if (btState !== State.PoweredOn) { setError('เปิด Bluetooth ของมือถือก่อน แล้วลองค้นหาอีกครั้ง'); return; }
    setHits({}); setScanning(true);
    ble.startScan(h => setHits(prev => ({ ...prev, [h.id]: { ...prev[h.id], ...h, name: h.name ?? prev[h.id]?.name ?? null } })), msg => { setError(msg); setScanning(false); });
    timer.current = setTimeout(stop, SCAN_MS);
  };

  const list = useMemo(() => Object.values(hits).filter(h => !namedOnly || h.name).sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)), [hits, namedOnly]);

  const open = (h: ScanHit) => {
    stop();
    router.push({ pathname: '/inspector', params: { id: h.id, name: h.name ?? '' } });
  };

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, gap: S.sm, paddingBottom: 40 }}
      data={list}
      keyExtractor={h => h.id}
      ListHeaderComponent={
        <View style={{ gap: S.md, marginBottom: S.sm }}>
          <Text style={s.lede}>เปิดกุญแจรถ (ACC) ให้ DSP ทำงาน แล้วค้นหา แตะอุปกรณ์เพื่อเปิด BLE Inspector ดูโครงสร้างและทดลองส่งคำสั่ง</Text>
          {!available && (
            <Card style={{ borderColor: C.amber }}>
              <Text style={st.h}>แอปรุ่นนี้ยังไม่มีโมดูล Bluetooth</Text>
              <Text style={st.small}>Expo Go ไม่มี BLE ต้องติดตั้งแบบ development build หรือ APK (ดู README) ระหว่างนี้ลองโหมดจำลองด้านล่างได้</Text>
            </Card>
          )}
          <Btn kind="primary" label={scanning ? 'หยุดค้นหา' : 'ค้นหาอุปกรณ์ Bluetooth'} onPress={scanning ? stop : scan} disabled={!available} />
          {error && <Text style={s.err} accessibilityLiveRegion="polite">{error}</Text>}
          <View style={st.row}>
            <Text style={[st.small, { flex: 1 }]}>{available ? `Bluetooth: ${btState}${scanning ? ' · กำลังค้นหา…' : ''}` : 'Bluetooth: ใช้ไม่ได้ในแอปรุ่นนี้'}</Text>
            <Text style={st.small}>เฉพาะที่มีชื่อ</Text>
            <Toggle value={namedOnly} onChange={setNamedOnly} label="แสดงเฉพาะอุปกรณ์ที่มีชื่อ" />
          </View>
          {available && !scanning && list.length === 0 && <Text style={st.small}>ยังไม่มีอุปกรณ์ กดค้นหาเพื่อเริ่ม</Text>}
        </View>
      }
      renderItem={({ item }) => {
        const p = matchProfile(item.name);
        const d = p && driverFor(p.id);
        return (
          <Pressable onPress={() => open(item)} style={({ pressed }) => [s.dev, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.devName}>{item.name ?? '(ไม่มีชื่อ)'}</Text>
              <Text style={st.small}>{item.id} · {item.rssi ?? '—'} dBm</Text>
            </View>
            {p ? <Text style={[s.chip, d?.mapped && s.chipOk]}>{p.brand} · {d?.mapped ? 'พร้อมจูน' : 'รอแมพโปรโตคอล'}</Text> : <Text style={s.chip}>ไม่รู้จัก</Text>}
          </Pressable>
        );
      }}
      ListFooterComponent={
        <View style={{ gap: S.sm, marginTop: S.xl }}>
          <Text style={st.h}>ดูหน้าจูนโดยไม่ต่อเครื่อง</Text>
          <Text style={st.small}>หน้าจอปรับตามสเปกของแต่ละรุ่น คำสั่งจะถูกบันทึกลง log เท่านั้น ไม่ส่งไปเครื่องจริง</Text>
          {PROFILES.map(p => (
            <Pressable key={p.id} onPress={() => router.push({ pathname: '/tune', params: { profile: p.id } })} style={({ pressed }) => [s.dev, pressed && { opacity: 0.8 }]} accessibilityRole="button">
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.devName}>{p.brand} {p.model}</Text>
                <Text style={st.small}>{FAMILY_NAME[p.family]} · {p.outputs} ช่อง · {p.transport}</Text>
              </View>
              <Text style={[s.chip, p.id === 'demo' && s.chipOk]}>{p.id === 'demo' ? 'ทดลอง' : 'พรีวิว'}</Text>
            </Pressable>
          ))}
        </View>
      }
    />
  );
}

const s = StyleSheet.create({
  lede: { color: C.muted, fontSize: 14, lineHeight: 21 },
  err: { color: C.danger, fontSize: 13 },
  dev: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: S.md },
  devName: { color: C.ink, fontSize: 15, fontWeight: '600' },
  chip: { color: C.muted, fontSize: 11.5, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  chipOk: { color: C.ok, borderColor: '#2F6B4E' },
});

import { useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { driverFor } from '../drivers/registry';
import { openSession, useSessionState } from '../model/session';
import { CarView } from '../components/CarView';
import { ChannelSheet } from '../components/ChannelSheet';
import { useAskNumber } from '../components/NumberPrompt';
import { Btn, Card, Stepper, Toggle, ValueText, st } from '../components/ui';
import { C, S } from '../theme';

export default function Tune() {
  const { profile = 'demo', device } = useLocalSearchParams<{ profile?: string; device?: string }>();
  const router = useRouter();
  const driver = driverFor(profile);
  const session = useMemo(() => (driver ? openSession(driver, device ?? null) : null), [driver, device]);
  if (!driver || !session) return <Text style={{ color: C.danger, padding: S.lg }}>ไม่รู้จักรุ่น {profile}</Text>;
  return <TuneInner session={session} onOpenLog={() => router.push({ pathname: '/inspector' })} />;
}

function TuneInner({ session, onOpenLog }: { session: NonNullable<ReturnType<typeof openSession>>; onOpenLog: () => void }) {
  const state = useSessionState(session);
  const p = session.profile;
  const ask = useAskNumber();
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const toast = (m: string) => {
    setMsg(m);
    Animated.sequence([Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }), Animated.delay(1800), Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true })]).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: `${p.brand} ${p.model}` }} />
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 48 }}>
        {!session.live && (
          <Card style={{ borderColor: '#6B5226', backgroundColor: '#2A2A26' }}>
            <Text style={st.h}>{session.driver.mapped ? 'โหมดจำลอง' : 'พรีวิว · ยังไม่มีไดรเวอร์จริง'}</Text>
            <Text style={st.small}>{session.driver.mapped ? 'ทุกอย่างทำงานในแอป แต่ไม่ได้ต่อเครื่องจริง' : `หน้าจอและช่วงค่าตั้งตามสเปก ${p.brand} ${p.model} (${p.source}) คำสั่งถูกบันทึกลง log เท่านั้น ยังไม่ส่งไปเครื่อง`}</Text>
          </Card>
        )}
        <CarView channels={state.channels} selected={sel} onSelect={setSel} />
        <Text style={[st.small, { textAlign: 'center' }]}>{p.outputs} ช่องขาออก · แตะลำโพงเพื่อจูน</Text>
        <Card>
          <View style={st.row}>
            <Text style={[st.h, { flex: 1 }]}>วอลุ่มรวม</Text>
            <ValueText text={`${state.master} dB`} onPress={() => ask({ title: 'วอลุ่มรวม', unit: 'dB', value: state.master, min: -60, max: 0, step: 1, onSet: v => session.setMaster(v) })} />
            <Stepper onMinus={() => session.setMaster(state.master - 1)} onPlus={() => session.setMaster(state.master + 1)} />
          </View>
          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.h}>ลิงก์ซ้าย-ขวา</Text>
              <Text style={st.small}>ปรับข้างหนึ่ง อีกข้างตามทันที (ยกเว้นดีเลย์)</Text>
            </View>
            <Toggle value={state.link} onChange={v => session.setLink(v)} label="ลิงก์ซ้าย-ขวา" />
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.xs }}>
            <Btn label="ส่งค่าทั้งหมดไปเครื่อง" onPress={() => { session.sendAll(); toast('ส่งค่าทั้งหมดแล้ว'); }} style={{ flex: 1 }} />
            <Btn label="ดู log" kind="ghost" onPress={onOpenLog} />
          </View>
        </Card>
      </ScrollView>
      <ChannelSheet session={session} state={state} chId={sel} onClose={() => setSel(null)} onToast={toast} />
      <Animated.View pointerEvents="none" style={[s.toast, { opacity: fade }]}><Text style={s.toastT}>{msg}</Text></Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: S.lg, right: S.lg, bottom: 32, backgroundColor: C.ink, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  toastT: { color: C.bg, fontSize: 13.5 },
});

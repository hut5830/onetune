import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { settings, useSettings } from '../model/settings';
import { MIN_HPF } from '../model/tuning';
import { fmtF } from '../lib/format';
import { Btn, Card, Header, Page, Screen, Segmented, SectionTitle, T, Toggle, st } from '../components/ui';
import { C, S } from '../theme';

export default function Settings() {
  const cfg = useSettings();
  const router = useRouter();
  const row = (title: string, sub: string, value: boolean, set: (v: boolean) => void) => (
    <View style={st.row}>
      <View style={{ flex: 1 }}>
        <T v="bodyMed">{title}</T>
        <T v="small">{sub}</T>
      </View>
      <Toggle value={value} onChange={set} label={title} />
    </View>
  );
  return (
    <Screen>
      <Header title="ตั้งค่า" />
      <Page>
        <SectionTitle label="การใช้งาน" />
        <Card style={{ gap: S.lg }}>
          <View style={{ gap: S.sm }}>
            <T v="bodyMed">หน้าจูนเปิดเป็น</T>
            <Segmented full options={['easy', 'pro'] as const} value={cfg.mode} format={m => (m === 'easy' ? 'ใช้งานง่าย' : 'ปรับละเอียด')} onChange={mode => settings.set({ mode })} />
            <T v="small">ใช้งานง่าย: ปุ่มระดับเสียง แต่ละส่วน ซับ และพรีเซ็ต · ปรับละเอียด: EQ ครอส ดีเลย์ รายช่อง</T>
          </View>
          {row('สั่นเมื่อแตะ', 'ตอบสนองด้วยการสั่นเบาๆ ตอนกดและลาก', cfg.haptics, haptics => settings.set({ haptics }))}
          {row('เปิดหน้าจอค้างไว้', 'หน้าจอไม่ดับระหว่างอยู่ในหน้าจูน', cfg.keepAwake, keepAwake => settings.set({ keepAwake }))}
        </Card>

        <SectionTitle label="ความปลอดภัยของลำโพง" />
        <Card>
          <T v="small" style={{ color: C.ink2 }}>
            ทวีตเตอร์/ฮอร์นต้องเปิด HPF เสมอ ต่ำสุด {fmtF(MIN_HPF.tw!)} Hz · เสียงกลางต่ำสุด {MIN_HPF.mr} Hz · ความชันอย่างน้อย 12 dB/oct{'\n'}
            ใช้กับทุกการปรับ การเปลี่ยนการจัดวาง และการโหลดพรีเซ็ต ปิดไม่ได้
          </T>
        </Card>

        <SectionTitle label="สำหรับช่าง" />
        <Card>
          <T v="small">BLE Inspector ใช้ดูโครงสร้าง Bluetooth ของเครื่อง ส่ง hex และแชร์ log เพื่อเพิ่มรุ่นใหม่</T>
          <Btn icon="terminal" label="เปิด Log คำสั่ง" onPress={() => router.push('/inspector')} />
        </Card>

        <T v="small" style={{ textAlign: 'center', marginTop: S.md }}>OneTune {Constants.expoConfig?.version ?? ''}</T>
      </Page>
    </Screen>
  );
}

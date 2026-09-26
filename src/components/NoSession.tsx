import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { S } from '../theme';
import { Btn, Header, Screen, T } from './ui';

/** Shown when a tool screen is opened without an active tuning session (e.g. after an app restart). */
export function NoSession({ title }: { title: string }) {
  const router = useRouter();
  return (
    <Screen>
      <Header title={title} />
      <View style={{ padding: S.xl, gap: S.md, alignItems: 'center' }}>
        <T v="h">ยังไม่ได้เปิดหน้าจูน</T>
        <T v="small" style={{ textAlign: 'center' }}>เลือกอุปกรณ์หรือโหมดทดลองจากหน้าแรกก่อน</T>
        <Btn kind="primary" label="กลับหน้าแรก" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}

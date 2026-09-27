import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, S } from '../theme';
import { IconBtn, T } from './ui';

/** Bottom sheet used for pickers. Width-capped and centred so it also looks right in landscape. */
export function Sheet({ visible, onClose, title, sub, children, footer }: { visible: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode; footer?: ReactNode }) {
  const inset = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      <View style={s.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="ปิด" />
        <View style={[s.sheet, { paddingBottom: inset.bottom + S.lg, maxHeight: height - inset.top - 24 }]}>
          <View style={s.grab} />
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <T v="title">{title}</T>
              {sub ? <T v="small">{sub}</T> : null}
            </View>
            <IconBtn name="close" label="ปิด" onPress={onClose} />
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.sm, paddingBottom: S.sm }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { width: '100%', maxWidth: 620, backgroundColor: C.panel, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: S.lg, paddingTop: S.sm, gap: S.md },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
});

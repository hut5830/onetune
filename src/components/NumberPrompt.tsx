import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F, R, S, alpha } from '../theme';
import { parseNumber, snap } from '../lib/format';
import { haptic } from '../lib/haptics';
import { Btn, T } from './ui';

export interface AskOptions { title: string; unit?: string; value: number; min: number; max: number; step?: number; onSet: (v: number) => void; note?: string }
const Ctx = createContext<(o: AskOptions) => void>(() => {});
export const useAskNumber = () => useContext(Ctx);

const fmt = (v: number) => String(+v.toFixed(3));

/** App-wide "type an exact value" sheet with range validation against the device's capabilities. */
export function NumberPromptProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<AskOptions | null>(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const input = useRef<TextInput>(null);

  const ask = useCallback((o: AskOptions) => { setOpts(o); setText(fmt(o.value)); setErr(''); }, []);
  const close = () => setOpts(null);
  const ok = () => {
    if (!opts) return;
    const v = parseNumber(text);
    if (!isFinite(v)) { haptic.warn(); setErr('ใส่เป็นตัวเลข เช่น 3150 หรือ 3.15k'); return; }
    if (v < opts.min || v > opts.max) { haptic.warn(); setErr(`ค่านี้เกินช่วงที่รับได้ ต้องอยู่ระหว่าง ${fmt(opts.min)} – ${fmt(opts.max)} ${opts.unit ?? ''}`); return; }
    haptic.ok();
    opts.onSet(opts.step ? snap(v, opts.step) : v);
    close();
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal visible={!!opts} transparent animationType="fade" onRequestClose={close} onShow={() => setTimeout(() => input.current?.focus(), 50)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.wrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="ปิด" />
          <View style={s.box}>
            <View style={s.grab} />
            <T v="label">พิมพ์ค่า</T>
            <T v="title">{opts?.title}</T>
            <View style={s.inputRow}>
              <TextInput ref={input} value={text} onChangeText={t => { setText(t); setErr(''); }} onSubmitEditing={ok}
                keyboardType="numbers-and-punctuation" selectTextOnFocus style={s.input} accessibilityLabel={opts?.title} selectionColor={C.cyan} />
              {opts?.unit ? <Text style={s.unit}>{opts.unit}</Text> : null}
            </View>
            <T v="small">ช่วงที่รับได้ {opts && `${fmt(opts.min)} – ${fmt(opts.max)} ${opts.unit ?? ''}`}{opts?.note ? ` · ${opts.note}` : ''}</T>
            <Text style={s.err} accessibilityLiveRegion="polite">{err}</Text>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="ยกเลิก" kind="ghost" onPress={close} style={{ flex: 1 }} />
              <Btn label="ตั้งค่า" kind="primary" icon="check" onPress={ok} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,4,10,0.72)' },
  box: { backgroundColor: C.panel, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderWidth: 1, borderColor: C.line2, padding: S.xl, paddingTop: S.md, paddingBottom: 32, gap: 6 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line2, marginBottom: S.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: S.sm, backgroundColor: alpha(C.bg, 0.8), borderWidth: 1, borderColor: alpha(C.cyan, 0.5), borderRadius: R.lg, paddingHorizontal: S.lg },
  input: { flex: 1, paddingVertical: 12, color: C.ink, fontSize: 36, fontFamily: F.display, textAlign: 'center' },
  unit: { fontFamily: F.head, color: C.muted, fontSize: 16 },
  err: { fontFamily: F.body, color: C.danger, fontSize: 13, minHeight: 20 },
});

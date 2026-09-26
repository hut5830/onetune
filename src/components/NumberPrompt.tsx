import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, R, S } from '../theme';
import { parseNumber, snap } from '../lib/format';
import { Btn } from './ui';

export interface AskOptions { title: string; unit?: string; value: number; min: number; max: number; step?: number; onSet: (v: number) => void }
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
    if (!isFinite(v)) { setErr('ใส่เป็นตัวเลข เช่น 3150 หรือ 3.15k'); return; }
    if (v < opts.min || v > opts.max) { setErr(`ค่านี้เกินช่วงที่เครื่องรับ ต้องอยู่ระหว่าง ${fmt(opts.min)} – ${fmt(opts.max)} ${opts.unit ?? ''}`); return; }
    opts.onSet(opts.step ? snap(v, opts.step) : v);
    close();
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal visible={!!opts} transparent animationType="slide" onRequestClose={close} onShow={() => input.current?.focus()}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="ปิด" />
          <View style={s.box}>
            <Text style={s.title}>{opts?.title}</Text>
            <Text style={s.hint}>ช่วงที่รุ่นนี้รับได้ {opts && `${fmt(opts.min)} – ${fmt(opts.max)} ${opts.unit ?? ''}`}</Text>
            <TextInput ref={input} value={text} onChangeText={t => { setText(t); setErr(''); }} onSubmitEditing={ok}
              keyboardType="numbers-and-punctuation" selectTextOnFocus style={s.input} accessibilityLabel={opts?.title} />
            <Text style={s.err} accessibilityLiveRegion="polite">{err}</Text>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="ยกเลิก" kind="ghost" onPress={close} style={{ flex: 1 }} />
              <Btn label="ตั้งค่า" kind="primary" onPress={ok} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,10,16,0.55)' },
  box: { backgroundColor: C.panel, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, borderTopWidth: 1, borderColor: C.line, padding: S.lg, paddingBottom: 28, gap: 6 },
  title: { color: C.ink, fontSize: 16, fontWeight: '600' },
  hint: { color: C.muted, fontSize: 12.5 },
  input: { marginTop: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: 14, color: C.ink, fontSize: 30, fontWeight: '700', textAlign: 'center' },
  err: { color: C.danger, fontSize: 13, minHeight: 20 },
});

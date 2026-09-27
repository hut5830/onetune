import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F, R, S } from '../theme';
import { parseNumber, snap } from '../lib/format';
import { haptic } from '../lib/haptics';
import { Btn, T } from './ui';

export interface AskOptions { title: string; unit?: string; value: number; min: number; max: number; step?: number; onSet: (v: number) => void; note?: string }
export interface AskTextOptions { title: string; value: string; placeholder?: string; onSet: (v: string) => void; maxLength?: number }

type Req = { kind: 'num'; o: AskOptions } | { kind: 'text'; o: AskTextOptions };
const Ctx = createContext<{ num: (o: AskOptions) => void; text: (o: AskTextOptions) => void }>({ num: () => {}, text: () => {} });
export const useAskNumber = () => useContext(Ctx).num;
export const useAskText = () => useContext(Ctx).text;

const fmt = (v: number) => String(+v.toFixed(3));

/** App-wide "type an exact value" sheet (numbers checked against the device's range) and a short text prompt. */
export function NumberPromptProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<Req | null>(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const input = useRef<TextInput>(null);

  const num = useCallback((o: AskOptions) => { setReq({ kind: 'num', o }); setText(fmt(o.value)); setErr(''); }, []);
  const txt = useCallback((o: AskTextOptions) => { setReq({ kind: 'text', o }); setText(o.value); setErr(''); }, []);
  const close = () => setReq(null);
  const ok = () => {
    if (!req) return;
    if (req.kind === 'text') { haptic.ok(); req.o.onSet(text.trim()); close(); return; }
    const o = req.o;
    const v = parseNumber(text);
    if (!isFinite(v)) { haptic.warn(); setErr('ใส่เป็นตัวเลข เช่น 3150 หรือ 3.15k'); return; }
    if (v < o.min || v > o.max) { haptic.warn(); setErr(`ต้องอยู่ระหว่าง ${fmt(o.min)} – ${fmt(o.max)} ${o.unit ?? ''}`); return; }
    haptic.ok();
    o.onSet(o.step ? snap(v, o.step) : v);
    close();
  };
  const unit = req?.kind === 'num' ? req.o.unit : undefined;

  return (
    <Ctx.Provider value={{ num, text: txt }}>
      {children}
      <Modal visible={!!req} transparent animationType="fade" onRequestClose={close} onShow={() => setTimeout(() => input.current?.focus(), 50)} statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.wrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="ปิด" />
          <View style={s.box}>
            <T v="title">{req?.o.title}</T>
            <View style={s.inputRow}>
              <TextInput ref={input} value={text} onChangeText={t => { setText(t); setErr(''); }} onSubmitEditing={ok}
                keyboardType={req?.kind === 'num' ? 'numbers-and-punctuation' : 'default'} selectTextOnFocus
                maxLength={req?.kind === 'text' ? req.o.maxLength ?? 24 : undefined} placeholder={req?.kind === 'text' ? req.o.placeholder : undefined} placeholderTextColor={C.faint}
                style={[s.input, req?.kind === 'text' && { fontSize: 20, textAlign: 'left' }]} accessibilityLabel={req?.o.title} selectionColor={C.accent} />
              {unit ? <Text style={s.unit}>{unit}</Text> : null}
            </View>
            {req?.kind === 'num' && <T v="small">รับได้ {fmt(req.o.min)} – {fmt(req.o.max)} {req.o.unit ?? ''}{req.o.note ? ` · ${req.o.note}` : ''}</T>}
            <Text style={s.err} accessibilityLiveRegion="polite">{err}</Text>
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Btn label="ยกเลิก" kind="ghost" onPress={close} style={{ flex: 1 }} />
              <Btn label="ตกลง" kind="primary" onPress={ok} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: S.lg, backgroundColor: 'rgba(0,0,0,0.6)' },
  box: { width: '100%', maxWidth: 420, backgroundColor: C.panel, borderRadius: R.xl, padding: S.xl, gap: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: S.sm, backgroundColor: C.panel2, borderRadius: R.md, paddingHorizontal: S.lg },
  input: { flex: 1, paddingVertical: 12, color: C.ink, fontSize: 32, fontFamily: F.semi, textAlign: 'center' },
  unit: { fontFamily: F.medium, color: C.muted, fontSize: 16 },
  err: { fontFamily: F.regular, color: C.danger, fontSize: 13, minHeight: 20 },
});

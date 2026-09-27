import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSessionState, TuningSession } from '../model/session';
import { currentSession } from '../model/current';
import { Preset, store } from '../model/store';
import { TuningState, layoutById } from '../model/tuning';
import { haptic } from '../lib/haptics';
import { Icon } from '../components/Icon';
import { NoSession } from '../components/NoSession';
import { useToast } from '../components/Toast';
import { useAskText } from '../components/NumberPrompt';
import { Btn, Card, Chip, Header, IconBtn, Page, Screen, SectionTitle, T, st } from '../components/ui';
import { C, F, R, S } from '../theme';

export default function Presets() {
  const s = currentSession();
  return s ? <PresetsInner session={s} /> : <NoSession title="พรีเซ็ต" />;
}

function PresetsInner({ session }: { session: TuningSession }) {
  const state = useSessionState(session);
  const p = session.profile;
  const toast = useToast();
  const askText = useAskText();
  const [list, setList] = useState<Preset[]>([]);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [raw, setRaw] = useState('');

  const reload = useCallback(() => void store.presets(p.id).then(setList), [p.id]);
  useEffect(reload, [reload]);

  const save = async () => {
    const n = name.trim() || `จูน ${new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}`;
    await store.savePreset(n, state);
    setName(''); haptic.ok(); toast(`บันทึก "${n}" แล้ว`); reload();
  };
  const load = (pr: Preset) => {
    if (session.loadState(pr.state)) { haptic.ok(); toast(`โหลด "${pr.name}" แล้ว${session.live ? ' และส่งไปเครื่อง' : ''}`); }
    else toast('พรีเซ็ตนี้ใช้กับรุ่นนี้ไม่ได้', 'warn');
  };
  const share = (pr: Preset) => void Share.share({ title: pr.name, message: JSON.stringify({ onetune: 1, name: pr.name, state: pr.state }) });
  const doImport = async () => {
    try {
      const j = JSON.parse(raw) as { onetune?: number; name?: string; state?: TuningState };
      if (!j.state || j.state.profileId !== p.id) { toast(j.state ? `พรีเซ็ตนี้เป็นของรุ่นอื่น (${j.state.profileId})` : 'ไม่ใช่พรีเซ็ตของ OneTune', 'warn'); return; }
      await store.savePreset(j.name ?? 'นำเข้า', j.state);
      setRaw(''); setImporting(false); haptic.ok(); toast('นำเข้าพรีเซ็ตแล้ว'); reload();
    } catch { toast('อ่านข้อความไม่ได้ ต้องเป็นข้อความที่แชร์จาก OneTune', 'warn'); }
  };

  return (
    <Screen>
      <Header title="พรีเซ็ต" sub={`${p.brand} ${p.model}`} right={<IconBtn name="input" label="นำเข้าพรีเซ็ต" active={importing} onPress={() => setImporting(v => !v)} />} />
      <Page keyboardShouldPersistTaps="handled">
        <Card>
          <T v="h">บันทึกเสียงตอนนี้</T>
          <View style={[st.row, { gap: S.sm }]}>
            <TextInput value={name} onChangeText={setName} onSubmitEditing={() => void save()} placeholder="ตั้งชื่อ เช่น ฟังเพลงเบาๆ, ปาร์ตี้" placeholderTextColor={C.faint}
              style={s.input} accessibilityLabel="ชื่อพรีเซ็ต" selectionColor={C.accent} />
            <Btn kind="primary" icon="save" label="บันทึก" onPress={() => void save()} />
          </View>
          <T v="small">{layoutById(state.layoutId)?.name} · {state.channels.length} ช่อง · ระดับเสียงรวม {state.master} dB</T>
        </Card>

        {importing && (
          <Card>
            <T v="h">นำเข้าจากข้อความ</T>
            <TextInput value={raw} onChangeText={setRaw} multiline placeholder="วางข้อความพรีเซ็ตที่เพื่อนแชร์มา" placeholderTextColor={C.faint} style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]} accessibilityLabel="ข้อความพรีเซ็ต" />
            <Btn kind="primary" label="นำเข้า" onPress={() => void doImport()} disabled={!raw.trim()} />
          </Card>
        )}

        <SectionTitle label="พรีเซ็ตที่บันทึกไว้" right={<T v="small">{list.length} รายการ</T>} />
        {list.length === 0 && (
          <View style={s.empty}>
            <Icon name="layers" size={32} color={C.faint} />
            <T v="small" style={{ textAlign: 'center' }}>ยังไม่มีพรีเซ็ตของรุ่นนี้{'\n'}จูนเสร็จแล้วตั้งชื่อ แล้วกดบันทึก</T>
          </View>
        )}
        {list.map(pr => {
          const l = layoutById(pr.state.layoutId);
          return (
            <Card key={pr.id} style={{ gap: S.sm }}>
              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{pr.name}</Text>
                  <T v="small" numberOfLines={1}>{new Date(pr.savedAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</T>
                </View>
                <IconBtn name="edit" size={36} label={`เปลี่ยนชื่อ ${pr.name}`} onPress={() => askText({ title: 'เปลี่ยนชื่อพรีเซ็ต', value: pr.name, onSet: async v => { if (v) { await store.renamePreset(pr.id, v); reload(); } } })} />
                <IconBtn name="share" size={36} label={`แชร์ ${pr.name}`} onPress={() => share(pr)} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {l && <Chip label={l.name} color={C.accent} />}
                <Chip label={`${pr.state.master} dB`} />
              </View>
              <View style={[st.row, { gap: S.sm }]}>
                <Btn small kind="primary" label="โหลด" onPress={() => load(pr)} style={{ flex: 1 }} />
                <Btn small label="บันทึกทับ" onPress={async () => { await store.overwritePreset(pr.id, state); haptic.ok(); toast(`บันทึกทับ "${pr.name}" แล้ว`); reload(); }} style={{ flex: 1 }} />
                {confirm === pr.id
                  ? <Btn small kind="danger" label="ยืนยันลบ" onPress={async () => { await store.deletePreset(pr.id); setConfirm(null); haptic.warn(); reload(); }} />
                  : <IconBtn name="trash" size={36} label={`ลบ ${pr.name}`} color={C.danger} onPress={() => setConfirm(pr.id)} />}
              </View>
            </Card>
          );
        })}
      </Page>
    </Screen>
  );
}

const s = StyleSheet.create({
  input: { flex: 1, fontFamily: F.regular, backgroundColor: C.panel2, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, color: C.ink, fontSize: 14.5 },
  empty: { alignItems: 'center', gap: S.sm, padding: S.xl, borderRadius: R.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line2 },
  name: { fontFamily: F.semi, fontSize: 16, color: C.ink, lineHeight: 23 },
});

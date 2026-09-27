import { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ble, CharInfo } from '../ble/client';
import { captureLog, LogEntry, useCaptureLog, useLogPaused } from '../ble/captureLog';
import { connection, useConnection } from '../ble/connection';
import { parseHex, shortUuid } from '../lib/hex';
import { haptic } from '../lib/haptics';
import { Btn, Card, Dot, Header, Note, Screen, SectionTitle, T, Toggle, st } from '../components/ui';
import { C, F, MAX_W, R, S, alpha } from '../theme';

const props = (c: CharInfo) => [c.readable && 'R', c.writable && 'W', c.writableNoResp && 'WnR', c.notifiable && 'N', c.indicatable && 'I'].filter(Boolean).join(' ');
const DIR_COLOR: Record<LogEntry['dir'], string> = { tx: C.accent, rx: C.ok, note: C.muted, err: C.danger };
const DIR_LABEL: Record<LogEntry['dir'], string> = { tx: 'ส่ง', rx: 'รับ', note: 'โน้ต', err: 'ผิดพลาด' };

export default function Inspector() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const inset = useSafeAreaInsets();
  const conn = useConnection();
  const log = useCaptureLog();
  const paused = useLogPaused();
  const [sel, setSel] = useState<CharInfo | null>(null);
  const [hex, setHex] = useState('');
  const [hexErr, setHexErr] = useState('');
  const [note, setNote] = useState('');
  const [subs, setSubs] = useState<Record<string, () => void>>({});

  useEffect(() => { if (id && ble.available()) void connection.connect(id, name || null); }, [id]);
  useEffect(() => () => Object.values(subs).forEach(off => off()), [subs]);

  const connected = conn.status === 'connected' && conn.deviceId === id;
  const key = (c: CharInfo) => `${c.serviceUUID}/${c.uuid}`;

  const read = async (c: CharInfo) => {
    try { captureLog.add('rx', `READ ${shortUuid(c.uuid)}`, await ble.read(id!, c), shortUuid(c.uuid)); }
    catch (e) { captureLog.add('err', `อ่าน ${shortUuid(c.uuid)} ไม่ได้: ${e instanceof Error ? e.message : e}`); }
  };
  const toggleNotify = (c: CharInfo) => {
    const k = key(c);
    if (subs[k]) { subs[k](); const n = { ...subs }; delete n[k]; setSubs(n); captureLog.add('note', `หยุดรับ ${shortUuid(c.uuid)}`); return; }
    const off = ble.monitor(id!, c, b => captureLog.add('rx', `NOTIFY ${shortUuid(c.uuid)}`, b, shortUuid(c.uuid)), m => captureLog.add('err', `notify ${shortUuid(c.uuid)}: ${m}`));
    setSubs({ ...subs, [k]: off }); captureLog.add('note', `เริ่มรับ ${shortUuid(c.uuid)}`);
  };
  const write = async (c: CharInfo) => {
    const bytes = parseHex(hex);
    if (!bytes) { haptic.warn(); setHexErr('ใส่เป็น hex ทีละไบต์ เช่น A5 50 02 หรือ A55002'); return; }
    setHexErr('');
    const withResp = c.writable && !c.writableNoResp ? true : !c.writableNoResp;
    try { await ble.write(id!, c.serviceUUID, c.uuid, bytes, withResp); captureLog.add('tx', `WRITE ${shortUuid(c.uuid)}${withResp ? '' : ' (no resp)'}`, bytes, shortUuid(c.uuid)); }
    catch (e) { captureLog.add('err', `เขียน ${shortUuid(c.uuid)} ไม่ได้: ${e instanceof Error ? e.message : e}`); }
  };
  const addNote = () => { if (!note.trim()) return; captureLog.add('note', note.trim()); setNote(''); haptic.tick(); };

  const statusText = { idle: 'ไม่ได้เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว', error: 'เชื่อมต่อไม่สำเร็จ' }[conn.status];

  const header = (
    <View style={{ gap: S.md, marginBottom: S.md }}>
      {id ? (
        <Card>
          <View style={st.row}>
            <Dot color={connected ? C.ok : conn.status === 'error' ? C.danger : conn.status === 'connecting' ? C.warn : C.muted} size={10} pulse={conn.status === 'connecting'} />
            <View style={{ flex: 1 }}>
              <T v="h">{statusText}</T>
              <T v="mono" style={{ color: C.muted, fontSize: 11.5 }}>{id}{conn.mtu ? ` · MTU ${conn.mtu}` : ''}</T>
            </View>
            {connected ? <Btn small kind="ghost" label="ตัดการเชื่อมต่อ" onPress={() => void connection.disconnect()} />
              : <Btn small kind="primary" label="เชื่อมต่อ" onPress={() => void connection.connect(id, name || null)} disabled={conn.status === 'connecting' || !ble.available()} />}
          </View>
          {conn.error && <T v="small" style={{ color: C.danger }}>{conn.error} · ตรวจว่าเครื่องเปิดอยู่ และปิดแอปอื่นที่อาจเชื่อมค้างไว้</T>}
        </Card>
      ) : (
        <Note>หน้านี้แสดงคำสั่งที่หน้าจูนส่งออก ใช้เทียบไบต์ตอนถอดโปรโตคอล</Note>
      )}

      {connected && (
        <>
          <SectionTitle label="โครงสร้าง GATT" right={<T v="small">R อ่าน · W เขียน · N แจ้งเตือน</T>} />
          {conn.services.map(sv => (
            <Card key={sv.uuid} style={{ gap: 6 }}>
              <T v="label" style={{ color: C.accent }}>Service {shortUuid(sv.uuid)}</T>
              {sv.chars.map(c => {
                const on = sel && key(sel) === key(c);
                return (
                  <Pressable key={c.uuid} onPress={() => { haptic.tick(); setSel(c); }} style={[s.chr, on && { borderColor: C.accent, backgroundColor: alpha(C.accent, 0.08) }]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
                    <Text style={s.chrId}>{shortUuid(c.uuid)}</Text>
                    <Text style={s.chrP}>{props(c)}{subs[key(c)] ? ' · รับอยู่' : ''}</Text>
                  </Pressable>
                );
              })}
            </Card>
          ))}
        </>
      )}

      {connected && sel && (
        <Card active={C.accent}>
          <T v="h">{shortUuid(sel.uuid)}</T>
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {sel.readable && <Btn small label="อ่านค่า" onPress={() => void read(sel)} />}
            {(sel.notifiable || sel.indicatable) && <Btn small label={subs[key(sel)] ? 'หยุดรับแจ้งเตือน' : 'รับแจ้งเตือน'} onPress={() => toggleNotify(sel)} />}
          </View>
          {(sel.writable || sel.writableNoResp) && (
            <>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput value={hex} onChangeText={t => { setHex(t); setHexErr(''); }} placeholder="A5 50 02 FF 38 D6" placeholderTextColor={C.faint}
                  autoCapitalize="characters" autoCorrect={false} style={s.input} accessibilityLabel="hex ที่จะส่ง" selectionColor={C.accent} />
                <Btn kind="primary" icon="send" label="ส่ง" onPress={() => void write(sel)} />
              </View>
              {hexErr ? <T v="small" style={{ color: C.danger }}>{hexErr}</T> : null}
            </>
          )}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <TextInput value={note} onChangeText={setNote} onSubmitEditing={addNote} placeholder="จดโน้ต เช่น ปรับ EQ 1k +3 dB" placeholderTextColor={C.faint} style={s.input} accessibilityLabel="โน้ต" selectionColor={C.accent} />
        <Btn label="จด" onPress={addNote} />
      </View>
      <SectionTitle label={`Log (${log.length})`} right={<View style={[st.row, { gap: S.sm }]}><T v="small">บันทึก</T><Toggle value={!paused} onChange={v => captureLog.setPaused(!v)} label="บันทึก log" /></View>} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Btn small kind="primary" icon="share" label="แชร์ log (JSON)" onPress={() => void Share.share({ message: captureLog.toJson() })} style={{ flex: 1 }} />
        <Btn small kind="ghost" icon="trash" label="ล้าง" onPress={() => captureLog.clear()} />
      </View>
    </View>
  );

  return (
    <Screen>
      <Header title={id ? (name || 'BLE Inspector') : 'Log คำสั่ง'} sub={id ? 'BLE Inspector' : 'คำสั่งที่ส่งออกจากหน้าจูน'} />
      <FlatList
        contentContainerStyle={{ paddingLeft: inset.left + S.lg, paddingRight: inset.right + S.lg, paddingBottom: inset.bottom + 40, width: '100%', maxWidth: MAX_W + inset.left + inset.right + S.xl, alignSelf: 'center' }}
        data={[...log].reverse()}
        keyExtractor={e => String(e.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={<T v="small" style={{ textAlign: 'center', padding: S.xl }}>ยังไม่มีรายการ ลองอ่าน/ส่งค่า หรือปรับเสียงในหน้าจูน</T>}
        renderItem={({ item }) => (
          <View style={s.logRow}>
            <Text style={[s.dir, { color: DIR_COLOR[item.dir] }]}>{DIR_LABEL[item.dir]}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={[st.row, { gap: 8 }]}>
                <Text style={s.logL} numberOfLines={2}>{item.label}</Text>
                <Text style={s.logT}>{new Date(item.t).toLocaleTimeString('th-TH', { hour12: false })}</Text>
              </View>
              {item.hex ? <Text style={s.hex} selectable>{item.hex}</Text> : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  chr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2 },
  chrId: { fontFamily: F.semi, color: C.ink, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  chrP: { fontFamily: F.medium, color: C.muted, fontSize: 12.5 },
  input: { flex: 1, fontFamily: F.regular, backgroundColor: C.panel2, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10, color: C.ink, fontSize: 14 },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  dir: { width: 50, fontFamily: F.semi, fontSize: 12 },
  logL: { flex: 1, fontFamily: F.medium, color: C.ink2, fontSize: 12.5, lineHeight: 18 },
  logT: { fontFamily: F.medium, color: C.faint, fontSize: 11, fontVariant: ['tabular-nums'] },
  hex: { fontFamily: F.medium, color: C.ink, fontSize: 12.5, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
});

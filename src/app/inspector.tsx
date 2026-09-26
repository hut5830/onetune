import { useEffect, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ble, CharInfo } from '../ble/client';
import { captureLog, LogEntry, useCaptureLog, useLogPaused } from '../ble/captureLog';
import { connection, useConnection } from '../ble/connection';
import { parseHex, shortUuid } from '../lib/hex';
import { Btn, Card, Toggle, st } from '../components/ui';
import { C, R, S } from '../theme';

const props = (c: CharInfo) => [c.readable && 'R', c.writable && 'W', c.writableNoResp && 'WnR', c.notifiable && 'N', c.indicatable && 'I'].filter(Boolean).join(' ');
const DIR_COLOR: Record<LogEntry['dir'], string> = { tx: C.signal, rx: C.amber, note: C.muted, err: C.danger };
const DIR_LABEL: Record<LogEntry['dir'], string> = { tx: 'ส่ง', rx: 'รับ', note: 'โน้ต', err: 'ผิดพลาด' };

export default function Inspector() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
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
    if (!bytes) { setHexErr('ใส่เป็น hex ทีละไบต์ เช่น A5 50 02 หรือ A55002'); return; }
    setHexErr('');
    const withResp = c.writable && !c.writableNoResp ? true : !c.writableNoResp;
    try { await ble.write(id!, c.serviceUUID, c.uuid, bytes, withResp); captureLog.add('tx', `WRITE ${shortUuid(c.uuid)}${withResp ? '' : ' (no resp)'}`, bytes, shortUuid(c.uuid)); }
    catch (e) { captureLog.add('err', `เขียน ${shortUuid(c.uuid)} ไม่ได้: ${e instanceof Error ? e.message : e}`); }
  };
  const addNote = () => { if (!note.trim()) return; captureLog.add('note', note.trim()); setNote(''); };

  const header = (
    <View style={{ gap: S.md, marginBottom: S.sm }}>
      <Stack.Screen options={{ title: id ? (name || 'BLE Inspector') : 'Log คำสั่ง' }} />
      {id ? (
        <Card>
          <View style={st.row}>
            <View style={[s.led, connected && s.ledOn]} />
            <Text style={[st.h, { flex: 1 }]}>{{ idle: 'ไม่ได้เชื่อมต่อ', connecting: 'กำลังเชื่อมต่อ…', connected: 'เชื่อมต่อแล้ว', error: 'เชื่อมต่อไม่สำเร็จ' }[conn.status]}</Text>
            {connected ? <Btn label="ตัดการเชื่อมต่อ" kind="ghost" onPress={() => void connection.disconnect()} />
              : <Btn label="เชื่อมต่อ" onPress={() => void connection.connect(id, name || null)} disabled={conn.status === 'connecting' || !ble.available()} />}
          </View>
          <Text style={st.small}>{id}{conn.mtu ? ` · MTU ${conn.mtu}` : ''}</Text>
          {conn.error && <Text style={s.err}>{conn.error} · ตรวจว่า DSP เปิดอยู่ และไม่ได้เชื่อมกับแอปอื่นค้างไว้</Text>}
        </Card>
      ) : (
        <Text style={st.small}>ยังไม่ได้ต่ออุปกรณ์ หน้านี้แสดงคำสั่งที่หน้าจูนส่งออก (โหมดจำลอง)</Text>
      )}

      {connected && (
        <Card>
          <Text style={st.h}>โครงสร้าง GATT</Text>
          <Text style={st.small}>R อ่าน · W เขียน · WnR เขียนไม่รอตอบ · N/I แจ้งเตือน แตะ characteristic เพื่อเลือก</Text>
          {conn.services.map(sv => (
            <View key={sv.uuid} style={{ gap: 4, marginTop: S.sm }}>
              <Text style={s.svc}>Service {shortUuid(sv.uuid)}</Text>
              {sv.chars.map(c => {
                const on = sel && key(sel) === key(c);
                return (
                  <Pressable key={c.uuid} onPress={() => setSel(c)} style={[s.chr, on && s.chrOn]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
                    <Text style={s.chrId}>{shortUuid(c.uuid)}</Text>
                    <Text style={st.small}>{props(c)}{subs[key(c)] ? ' · รับอยู่' : ''}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
      )}

      {connected && sel && (
        <Card>
          <Text style={st.h}>{shortUuid(sel.uuid)}</Text>
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {sel.readable && <Btn label="อ่านค่า" onPress={() => void read(sel)} />}
            {(sel.notifiable || sel.indicatable) && <Btn label={subs[key(sel)] ? 'หยุดรับแจ้งเตือน' : 'รับแจ้งเตือน'} onPress={() => toggleNotify(sel)} />}
          </View>
          {(sel.writable || sel.writableNoResp) && (
            <>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput value={hex} onChangeText={t => { setHex(t); setHexErr(''); }} placeholder="เช่น A5 50 02 FF 38 D6" placeholderTextColor={C.muted}
                  autoCapitalize="characters" autoCorrect={false} style={s.input} accessibilityLabel="hex ที่จะส่ง" />
                <Btn label="ส่ง" kind="primary" onPress={() => void write(sel)} />
              </View>
              {hexErr ? <Text style={s.err}>{hexErr}</Text> : null}
            </>
          )}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <TextInput value={note} onChangeText={setNote} onSubmitEditing={addNote} placeholder="จดโน้ต เช่น ปรับ EQ 1k +3 dB" placeholderTextColor={C.muted} style={s.input} accessibilityLabel="โน้ต" />
        <Btn label="จด" onPress={addNote} />
      </View>
      <View style={st.row}>
        <Text style={[st.h, { flex: 1 }]}>Log ({log.length})</Text>
        <Text style={st.small}>บันทึก</Text>
        <Toggle value={!paused} onChange={v => captureLog.setPaused(!v)} label="บันทึก log" />
      </View>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Btn label="แชร์ log (JSON)" onPress={() => void Share.share({ message: captureLog.toJson() })} style={{ flex: 1 }} />
        <Btn label="ล้าง log" kind="ghost" onPress={() => captureLog.clear()} />
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: S.lg, paddingBottom: 40 }}
      data={[...log].reverse()}
      keyExtractor={e => String(e.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={st.small}>ยังไม่มีรายการ ลองอ่าน/ส่งค่า หรือปรับเสียงในหน้าจูน</Text>}
      renderItem={({ item }) => (
        <View style={s.logRow}>
          <Text style={s.logT}>{new Date(item.t).toLocaleTimeString('th-TH', { hour12: false })}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: DIR_COLOR[item.dir], fontSize: 12.5 }}>{DIR_LABEL[item.dir]} · {item.label}</Text>
            {item.hex ? <Text style={s.hex} selectable>{item.hex}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  led: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.muted },
  ledOn: { backgroundColor: C.ok },
  err: { color: C.danger, fontSize: 13 },
  svc: { color: C.ink, fontWeight: '600', fontSize: 13.5 },
  chr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 10, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel2 },
  chrOn: { borderColor: C.amber },
  chrId: { color: C.ink, fontVariant: ['tabular-nums'], fontSize: 13 },
  input: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 9, color: C.ink, fontSize: 14 },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  logT: { color: C.muted, fontSize: 11.5, width: 60, fontVariant: ['tabular-nums'] },
  hex: { color: C.ink, fontSize: 12.5, fontVariant: ['tabular-nums'], letterSpacing: 0.3 },
});

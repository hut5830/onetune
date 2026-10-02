import { BleErrorCode, BleManager, Device, State, Subscription } from 'react-native-ble-plx';
import { base64ToBytes, bytesToBase64 } from '../lib/hex';

export interface CharInfo {
  serviceUUID: string;
  uuid: string;
  readable: boolean;
  writable: boolean;
  writableNoResp: boolean;
  notifiable: boolean;
  indicatable: boolean;
}
export interface ServiceInfo { uuid: string; chars: CharInfo[] }
export interface ScanHit { id: string; name: string | null; rssi: number | null; serviceUUIDs: string[]; manufacturerData: Uint8Array | null }

let manager: BleManager | null = null;
let unavailable: string | null = null;

/** Expo Go has no BLE native module; creating the manager throws there. */
function mgr(): BleManager | null {
  if (manager || unavailable) return manager;
  try { manager = new BleManager(); } catch (e) { unavailable = String(e); }
  return manager;
}

export const ble = {
  available: () => !!mgr(),

  onState(cb: (s: State) => void): () => void {
    const m = mgr(); if (!m) return () => {};
    const sub = m.onStateChange(cb, true);
    return () => sub.remove();
  },

  startScan(onHit: (h: ScanHit) => void, onError: (msg: string) => void) {
    const m = mgr(); if (!m) { onError('Bluetooth ไม่พร้อมใช้งานในแอปรุ่นนี้'); return; }
    void m.startDeviceScan(null, { allowDuplicates: false }, (err, d) => {
      if (err) { onError(err.message); return; }
      if (d) onHit({ id: d.id, name: d.localName ?? d.name, rssi: d.rssi, serviceUUIDs: d.serviceUUIDs ?? [], manufacturerData: d.manufacturerData ? base64ToBytes(d.manufacturerData) : null });
    });
  },

  stopScan() { void mgr()?.stopDeviceScan(); },

  async connect(id: string): Promise<{ device: Device; services: ServiceInfo[] }> {
    const m = mgr(); if (!m) throw new Error('Bluetooth ไม่พร้อมใช้งาน');
    let device = await m.connectToDevice(id, { timeout: 10000 });
    try { device = await m.requestMTUForDevice(id, 247); } catch { /* some DSP modules refuse; 23-byte MTU still works */ }
    await m.discoverAllServicesAndCharacteristicsForDevice(id);
    const services: ServiceInfo[] = [];
    for (const s of await m.servicesForDevice(id)) {
      const chars = await m.characteristicsForDevice(id, s.uuid);
      services.push({
        uuid: s.uuid,
        chars: chars.map(c => ({ serviceUUID: s.uuid, uuid: c.uuid, readable: c.isReadable, writable: c.isWritableWithResponse, writableNoResp: c.isWritableWithoutResponse, notifiable: c.isNotifiable, indicatable: c.isIndicatable })),
      });
    }
    return { device, services };
  },

  async disconnect(id: string) { try { await mgr()?.cancelDeviceConnection(id); } catch { /* already gone */ } },

  onDisconnected(id: string, cb: (reason: string | null) => void): () => void {
    const m = mgr(); if (!m) return () => {};
    const sub = m.onDeviceDisconnected(id, err => cb(err ? err.message : null));
    return () => sub.remove();
  },

  async read(id: string, c: CharInfo): Promise<Uint8Array> {
    const r = await mgr()!.readCharacteristicForDevice(id, c.serviceUUID, c.uuid);
    return r.value ? base64ToBytes(r.value) : new Uint8Array();
  },

  async write(id: string, service: string, char: string, bytes: Uint8Array, withResponse: boolean) {
    const m = mgr(); if (!m) throw new Error('Bluetooth ไม่พร้อมใช้งาน');
    const v = bytesToBase64(bytes);
    if (withResponse) await m.writeCharacteristicWithResponseForDevice(id, service, char, v);
    else await m.writeCharacteristicWithoutResponseForDevice(id, service, char, v);
  },

  monitor(id: string, c: CharInfo, onData: (b: Uint8Array) => void, onError: (msg: string) => void): () => void {
    const m = mgr(); if (!m) return () => {};
    const sub: Subscription = m.monitorCharacteristicForDevice(id, c.serviceUUID, c.uuid, (err, ch) => {
      // remove() reports OperationCancelled through this callback; that is our own unsubscribe, not a failure.
      if (err) { if (err.errorCode !== BleErrorCode.OperationCancelled) onError(err.message); return; }
      if (ch?.value) onData(base64ToBytes(ch.value));
    });
    return () => sub.remove();
  },
};

export { State };

import { useSyncExternalStore } from 'react';
import { ble, ServiceInfo } from './client';
import { captureLog } from './captureLog';

export interface ConnState {
  deviceId: string | null;
  name: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  services: ServiceInfo[];
  mtu: number | null;
  error: string | null;
}

let state: ConnState = { deviceId: null, name: null, status: 'idle', services: [], mtu: null, error: null };
let offDisc: (() => void) | null = null;
const listeners = new Set<() => void>();
const set = (patch: Partial<ConnState>) => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

export const connection = {
  get: () => state,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },

  async connect(id: string, name: string | null) {
    if (state.deviceId === id && state.status === 'connected') return;
    if (state.deviceId && state.deviceId !== id) await connection.disconnect();
    set({ deviceId: id, name, status: 'connecting', services: [], error: null });
    try {
      const { device, services } = await ble.connect(id);
      offDisc?.();
      offDisc = ble.onDisconnected(id, reason => {
        captureLog.add('err', reason ? `ตัดการเชื่อมต่อ: ${reason}` : 'ตัดการเชื่อมต่อแล้ว');
        set({ status: 'idle' });
      });
      set({ status: 'connected', services, mtu: device.mtu });
      captureLog.add('note', `เชื่อมต่อ ${name ?? id} · MTU ${device.mtu} · ${services.length} service`);
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  async disconnect() {
    offDisc?.(); offDisc = null;
    if (state.deviceId) await ble.disconnect(state.deviceId);
    set({ status: 'idle', services: [], mtu: null });
  },
};

export const useConnection = () => useSyncExternalStore(connection.subscribe, connection.get);

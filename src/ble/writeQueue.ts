import { Frame } from '../drivers/types';

/**
 * Coalescing send queue. While a slider is being dragged the UI may produce dozens of
 * frames per second; frames sharing a key replace each other so only the latest value
 * is sent, and writes go out one at a time so the BLE link never gets flooded.
 */
export class WriteQueue {
  private pending = new Map<string, Frame>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(private send: (f: Frame) => Promise<void>, private onError: (f: Frame, e: unknown) => void, private intervalMs = 80) {}

  push(frames: Frame[]) {
    for (const f of frames) { this.pending.delete(f.key); this.pending.set(f.key, f); }
  }

  start() {
    if (!this.timer) this.timer = setInterval(() => void this.flush(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.pending.clear();
  }

  private async flush() {
    if (this.busy || !this.pending.size) return;
    this.busy = true;
    const batch = [...this.pending.values()];
    this.pending.clear();
    for (const f of batch) {
      try { await this.send(f); } catch (e) { this.onError(f, e); }
    }
    this.busy = false;
  }
}

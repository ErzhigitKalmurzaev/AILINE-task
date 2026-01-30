import BinaryDecoder from '../utils/BinaryDecoder';
import MockSocket from '../utils/MockSocket';

export type DepthOrder = [string, string];
export type DepthUpdate = {
  e?: string;
  E?: number;
  s?: string;
  U?: number;
  bids: DepthOrder[];
  asks: DepthOrder[];
};

type Listener = (batch: DepthUpdate) => void;

export class OrderBookSocket {
  private url: string;
  private ws: any;
  private decoder = new BinaryDecoder();
  private buffer: DepthUpdate[] = [];
  private listeners = new Set<Listener>();
  private flushInterval = 100; // ms -> 10fps
  private intervalId: any = null;

  constructor(url: string, useMock = false) {
    this.url = url;
    if (useMock) {
      this.ws = new MockSocket();
    } else {
      this.ws = new WebSocket(url);
    }
    this.bind();
    this.startFlusher();
  }

  private bind() {
    this.ws.onmessage = (ev: any) => {
      const parsed = this.decoder.decode(ev.data);
      if (!parsed) return;
      const update: DepthUpdate = {
        e: parsed.e,
        E: parsed.E,
        s: parsed.s,
        U: parsed.U,
        bids: parsed.bids || [],
        asks: parsed.asks || [],
      };
      this.buffer.push(update);
    };
    this.ws.onopen = () => {
    };
  }

  private startFlusher() {
    this.intervalId = setInterval(() => this.flush(), this.flushInterval);
  }

  private flush() {
    if (this.buffer.length === 0) return;
    const combined: DepthUpdate = { bids: [], asks: [] } as DepthUpdate;
    for (const u of this.buffer) {
      combined.bids.push(...u.bids);
      combined.asks.push(...u.asks);
      combined.E = u.E;
      combined.U = u.U;
    }
    this.buffer.length = 0;
    this.emit(combined);
  }

  private emit(batch: DepthUpdate) {
    for (const l of this.listeners) l(batch);
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close() {
    clearInterval(this.intervalId);
    try {
      this.ws?.close?.();
    } catch (_) {}
  }
}

export default OrderBookSocket;

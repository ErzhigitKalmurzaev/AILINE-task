import BinaryDecoder from './BinaryDecoder';

type MessageHandler = (ev: { data: any }) => void;

export class MockSocket {
  public onmessage: MessageHandler | null = null;
  public onopen: (() => void) | null = null;
  private timer = 0 as any;
  private running = false;
  private seq = 1;

  constructor() {
    // simulate open
    setTimeout(() => this.onopen?.(), 50);
    this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    // High frequency: ~200 messages per second
    this.timer = setInterval(() => {
      const payload = this.makeUpdate();
      // deliver as string (BinaryDecoder required upstream will parse)
      this.onmessage?.({ data: JSON.stringify(payload) });
      this.seq += 1;
    }, 5);
  }

  close() {
    this.running = false;
    clearInterval(this.timer);
  }

  private makeUpdate() {
    // small random delta updates around BTCUSDT-like prices
    const center = 50000 + Math.sin(this.seq / 100) * 200;
    const bids = [] as [string, string][];
    const asks = [] as [string, string][];
    for (let i = 0; i < 10; i++) {
      const priceB = (center - i * 0.5 - Math.random() * 0.2).toFixed(2);
      const priceA = (center + i * 0.5 + Math.random() * 0.2).toFixed(2);
      const qtyB = (Math.random() * 5).toFixed(6);
      const qtyA = (Math.random() * 5).toFixed(6);
      bids.push([priceB, qtyB]);
      asks.push([priceA, qtyA]);
    }
    return { e: 'depthUpdate', E: Date.now(), s: 'BTCUSDT', U: this.seq, bids, asks };
  }
}

export default MockSocket;

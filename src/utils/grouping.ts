export type OrderEntry = [price: number, qty: number];

export function roundToTick(price: number, tick: number) {
  const multiplier = Math.round(1 / tick);
  return Math.floor(price * multiplier) / multiplier;
}

export function groupOrders(
  raw: Array<[string | number, string | number]>,
  tick: number,
  side: 'bids' | 'asks'
): OrderEntry[] {
  const map = new Map<number, number>();
  for (const [pRaw, qRaw] of raw) {
    const p = typeof pRaw === 'string' ? parseFloat(pRaw) : pRaw;
    const q = typeof qRaw === 'string' ? parseFloat(qRaw) : qRaw;
    if (!isFinite(p) || !isFinite(q) || q <= 0) continue;
    const price = roundToTick(p, tick);
    map.set(price, (map.get(price) || 0) + q);
  }
  const out: OrderEntry[] = Array.from(map.entries()).map(([price, qty]) => [price, qty]);
  out.sort((a, b) => (side === 'bids' ? b[0] - a[0] : a[0] - b[0]));
  return out;
}

export default groupOrders;

import { useEffect, useMemo, useRef, useState } from 'react';
import OrderBookSocket from '../services/socket';
import groupOrders from '../utils/grouping';

type Row = { price: number; qty: number };

const TICKS = [0.01, 0.1, 1.0] as const;

export function OrderBook() {
  const [tick, setTick] = useState<number>(0.1);
  const [bids, setBids] = useState<Row[]>([]);
  const [asks, setAsks] = useState<Row[]>([]);
  const [useMock] = useState(true);
  const rawRef = useRef<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });
  const socketRef = useRef<OrderBookSocket | null>(null);
  const tickRef = useRef<number>(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    const sock = new OrderBookSocket('wss://stream.binance.com:9443/ws/btcusdt@depth', useMock);
    socketRef.current = sock;

    const processSnapshot = () => {
      const currentTick = tickRef.current;
      const gB = groupOrders(rawRef.current.bids || [], currentTick, 'bids').slice(0, 20);
      const gA = groupOrders(rawRef.current.asks || [], currentTick, 'asks').slice(0, 20);
      const nextB = gB.map(([p, q]) => ({ price: p, qty: q }));
      const nextA = gA.map(([p, q]) => ({ price: p, qty: q }));
      const equalRows = (a: Row[], b: Row[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i].price !== b[i].price) return false;
          if (Math.abs(a[i].qty - b[i].qty) > 1e-9) return false;
        }
        return true;
      };
      if (!equalRows(nextB, bids)) setBids(nextB);
      if (!equalRows(nextA, asks)) setAsks(nextA);
    };

    const unsub = sock.subscribe((batch) => {
      rawRef.current.bids = batch.bids;
      rawRef.current.asks = batch.asks;
      if (typeof window !== 'undefined') requestAnimationFrame(processSnapshot);
      else processSnapshot();
    });

    return () => {
      unsub();
      sock.close();
    };
  }, [useMock]);

  useEffect(() => {
    const raw = rawRef.current;
    const gB = groupOrders(raw.bids || [], tick, 'bids').slice(0, 20);
    const gA = groupOrders(raw.asks || [], tick, 'asks').slice(0, 20);
    setBids(gB.map(([p, q]) => ({ price: p, qty: q })));
    setAsks(gA.map(([p, q]) => ({ price: p, qty: q })));
  }, [tick]);

  const maxQty = useMemo(() => {
    const maxB = bids.reduce((m, r) => Math.max(m, r.qty), 0);
    const maxA = asks.reduce((m, r) => Math.max(m, r.qty), 0);
    return Math.max(maxA, maxB, 1);
  }, [bids, asks]);

  const spread = useMemo(() => {
    if (asks.length && bids.length) {
      const lowest = asks[asks.length - 1]?.price || 0;
      const highest = bids[0]?.price || 0;
      return lowest - highest;
    }
    return 0;
  }, [asks, bids]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-4 shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Order Book</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-400 font-semibold">BTC</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-300">USDT</span>
                {spread > 0 && (
                  <>
                    <span className="text-slate-600 mx-2">•</span>
                    <span className="text-slate-400">Spread:</span>
                    <span className="text-slate-200 font-mono">{spread.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50">
              <label className="text-sm text-slate-400 font-medium">Tick Size:</label>
              <select 
                value={String(tick)} 
                onChange={(e) => setTick(parseFloat(e.target.value))}
                className="bg-slate-800 text-white border border-slate-600 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TICKS.map((t) => (
                  <option key={t} value={String(t)}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-700/50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Bids</h3>
                <div className="flex gap-6 text-xs text-slate-400 font-mono">
                  <span>Price (USDT)</span>
                  <span>Amount (BTC)</span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-700/30">
              {bids.map((r) => {
                const pct = Math.min(100, (r.qty / maxQty) * 100);
                return (
                  <div key={r.price} className="px-4 py-2 relative hover:bg-slate-700/20 transition-colors">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-emerald-500/20 to-emerald-500/5"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between items-center">
                      <div className="text-emerald-400 font-mono text-sm font-semibold">
                        {r.price.toFixed(2)}
                      </div>
                      <div className="font-mono text-sm text-slate-300">
                        {r.qty.toFixed(6)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-700/50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wide">Asks</h3>
                <div className="flex gap-6 text-xs text-slate-400 font-mono">
                  <span>Price (USDT)</span>
                  <span>Amount (BTC)</span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-700/30">
              {asks.map((r) => {
                const pct = Math.min(100, (r.qty / maxQty) * 100);
                return (
                  <div key={r.price} className="px-4 py-2 relative hover:bg-slate-700/20 transition-colors">
                    <div
                      className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-500/20 to-rose-500/5"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between items-center">
                      <div className="text-rose-400 font-mono text-sm font-semibold">
                        {r.price.toFixed(2)}
                      </div>
                      <div className="font-mono text-sm text-slate-300">
                        {r.qty.toFixed(6)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderBook;
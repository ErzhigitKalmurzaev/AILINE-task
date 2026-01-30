import { describe, it, expect } from 'vitest';
import { groupOrders } from './grouping';

describe('groupOrders', () => {
  it('groups by 0.1 tick correctly', () => {
    const raw = [
      ['100.05', '1'],
      ['100.06', '2'],
      ['100.14', '1'],
      ['100.15', '3'],
    ];
    const grouped = groupOrders(raw as any, 0.1, 'bids');
    // expected groups: 100.0 -> 3 (100.05+100.06), 100.1 -> 4 (100.14+100.15)
    expect(grouped.length).toBe(2);
    const map = new Map(grouped.map(([p, q]) => [p, q]));
    expect(map.get(100.0)).toBeCloseTo(3);
    expect(map.get(100.1)).toBeCloseTo(4);
  });
});

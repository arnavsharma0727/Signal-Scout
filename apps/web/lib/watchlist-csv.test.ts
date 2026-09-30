import { describe, expect, it } from 'vitest';
import { parse } from 'csv-parse/sync';

describe('watchlist CSV parsing', () => {
  it('keeps attacker-controlled __proto__ headers as data, not object prototypes', () => {
    const rows = parse('__proto__,__proto__,ticker\na,b,NVDA', {
      columns: true,
      group_columns_by_name: true,
      skip_empty_lines: true,
    }) as Record<string, unknown>[];

    expect(rows[0].ticker).toBe('NVDA');
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(rows[0], '__proto__')).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

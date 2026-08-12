import { describe, expect, it } from 'vitest';
import { getInsertId } from './db';

describe('getInsertId', () => {
  it('reads the insert ID from the mysql2 tuple returned by Drizzle', () => {
    expect(getInsertId([{ insertId: 42 }, []])).toBe(42);
  });

  it('rejects missing and invalid insert IDs instead of reusing a fallback key', () => {
    expect(() => getInsertId({})).toThrow('Database insert did not return an insert ID');
    expect(() => getInsertId([{ insertId: 0 }, []])).toThrow('Database insert returned an invalid insert ID');
  });
});

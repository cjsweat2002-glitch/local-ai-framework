import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { developmentActivities } from '../drizzle/schema';
import { ACTIVITY_KIND_LABELS, ACTIVITY_PULSE_POLL_INTERVAL_MS, isActivityKind, isActivityLevel } from '../client/src/lib/activityPulse';

describe('Activity Pulse contracts', () => {
  it('keeps the activity feed owner-isolated and retains the visible signal fields', () => {
    const columns = getTableColumns(developmentActivities);
    expect(Object.keys(columns)).toEqual(expect.arrayContaining(['id', 'userId', 'kind', 'level', 'title', 'detail', 'source', 'createdAt']));
    expect(columns.userId.notNull).toBe(true);
  });

  it('uses the constrained activity vocabulary and browser-open polling cadence', () => {
    expect(ACTIVITY_PULSE_POLL_INTERVAL_MS).toBe(8_000);
    expect(ACTIVITY_KIND_LABELS.task).toBe('Task');
    expect(isActivityKind('interface')).toBe(true);
    expect(isActivityKind('unknown')).toBe(false);
    expect(isActivityLevel('success')).toBe(true);
    expect(isActivityLevel('error')).toBe(false);
  });

  it('keeps the page on request-driven polling rather than an always-on client worker', () => {
    const source = readFileSync(new URL('../client/src/pages/ActivityPulse.tsx', import.meta.url), 'utf8');
    expect(source).toContain('refetchInterval: ACTIVITY_PULSE_POLL_INTERVAL_MS');
    expect(source).toContain('while this page is open');
    expect(source).not.toContain('setInterval(');
  });
});

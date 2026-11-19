import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

// runs/ is read-only (AGENTS.md): these tests read the real nights and never write there.

describe('readNight', () => {
  it('folds 2026-10-28 into one row per job, with the bad line counted', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    const d = digest!;

    expect(d.rows).toHaveLength(5);
    expect(d.badLines).toBe(1);
    expect(d.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs, retries and the last status per job', () => {
    const d = readNight('runs', '2026-10-28')!;
    const fixtures = d.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fixtures.runs).toBe(4);
    expect(fixtures.retries).toBe(3);
    expect(fixtures.lastStatus).toBe('ok');
    expect(fixtures.lastError).toBeNull();

    const backup = d.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');

    const sync = d.rows.find((r) => r.job === 'lane/sync')!;
    expect(sync.runs).toBe(8);
    expect(sync.retries).toBe(1);
    expect(sync.lastStatus).toBe('ok');
  });

  it('keeps a null owner as a row, with the owner left empty', () => {
    const d = readNight('runs', '2026-10-28')!;
    const render = d.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
  });

  it('keeps each line time as written, offset included', () => {
    const d = readNight('runs', '2026-10-28')!;
    const fixtures = d.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fixtures.first).toBe('2026-10-29T01:30:00+01:00');
    expect(fixtures.last).toBe('2026-10-29T01:37:00+01:00');
  });

  it('counts ok, retry and fail lines for the night', () => {
    const d = readNight('runs', '2026-10-28')!;
    expect(d.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(d.counts.ok + d.counts.retry + d.counts.fail + d.badLines).toBe(16);
  });

  it('answers null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});

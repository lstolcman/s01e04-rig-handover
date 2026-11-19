import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// runs/ is read-only (AGENTS.md), so these routes are tested against a temp runs dir.

const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
afterAll(() => rmSync(runsDir, { recursive: true, force: true }));

writeFileSync(join(runsDir, '2026-02-01.jsonl'), '');
writeFileSync(
  join(runsDir, '2026-02-02.jsonl'),
  [
    '{"at":"2026-02-02T23:00:00+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
    '{"at":"2026-02-03T01:00:00+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"lock held"}',
    '{"at":"2026-02-03T01:00:30+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
    'not json at all',
  ].join('\n'),
);

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
};

function app() {
  return createApp(config);
}

async function json(path: string) {
  const res = await app().request(path);
  return { res, body: (await res.json()) as { rows: Array<{ job: string }>; badLines: number } };
}

describe('GET /digest/:night', () => {
  it('renders a night', async () => {
    const res = await app().request('/digest/2026-02-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('rig/rotate-logs');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app().request('/digest/1999-09-09');
    expect(res.status).toBe(404);
  });

  it('renders an empty night as nothing ran', async () => {
    const res = await app().request('/digest/2026-02-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('renders a night with a bad line and says the line was counted', async () => {
    const res = await app().request('/digest/2026-02-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers the same jobs, in the same order, as the page', async () => {
    const { res, body } = await json('/api/digest/2026-02-02');
    expect(res.status).toBe(200);
    const page = await (await app().request('/digest/2026-02-02')).text();
    const inPage = [...page.matchAll(/<td>(lane\/sync|rig\/rotate-logs)<\/td>/g)].map((m) => m[1]);
    expect(body.rows.map((r) => r.job)).toEqual(inPage);
  });

  it('counts the bad line instead of throwing', async () => {
    const { body } = await json('/api/digest/2026-02-02');
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });

  it('answers an empty night with no rows', async () => {
    const { res, body } = await json('/api/digest/2026-02-01');
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app().request('/api/digest/1999-09-09');
    expect(res.status).toBe(404);
  });
});

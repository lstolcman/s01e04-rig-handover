import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Digest, DigestRow, DigestStatus } from './types.js';

// One night of runs/<night>.jsonl to one row per job (plan.md § 1). A line that does not parse
// is counted, never thrown: the night still renders.

type Row = DigestRow;

function isStatus(v: unknown): v is DigestStatus {
  return v === 'ok' || v === 'retry' || v === 'fail';
}

function asOptionalString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

// A line counts only when it carries the four things a row needs: time, job, status, owner.
function parseLine(line: string): Row | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const l = value as Record<string, unknown>;
  if (typeof l.at !== 'string' || typeof l.job !== 'string' || !isStatus(l.status)) return null;
  const owner = l.owner === undefined || l.owner === null ? null : asOptionalString(l.owner);
  if (l.owner !== undefined && l.owner !== null && owner === null) return null;
  return {
    job: l.job,
    owner,
    runs: 1,
    retries: l.status === 'retry' ? 1 : 0,
    lastStatus: l.status,
    lastError: asOptionalString(l.error),
    first: l.at,
    last: l.at,
  };
}

export function readNight(runsDir: string, night: string): Digest | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const byJob = new Map<string, Row>();
  const counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    const row = parseLine(line);
    if (row === null) {
      badLines += 1;
      continue;
    }

    counts[row.lastStatus] += 1;
    const seen = byJob.get(row.job);
    if (seen === undefined) {
      byJob.set(row.job, row);
      continue;
    }
    seen.runs += 1;
    if (row.lastStatus === 'retry') seen.retries += 1;
    // Last line wins for status and error; the first line keeps the first time.
    seen.lastStatus = row.lastStatus;
    seen.lastError = row.lastError;
    seen.last = row.last;
    if (seen.owner === null) seen.owner = row.owner;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { night, rows, badLines, counts };
}

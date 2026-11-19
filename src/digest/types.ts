// The contract for the morning digest (plan.md § 1). Nothing here reads a file: section 2
// renders, serialises and links against these types while the reader is still being written.

export type DigestStatus = 'ok' | 'retry' | 'fail';

// One row per job in one night: what it did, who owns it, and when it first and last ran.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  // Times keep the offset the log wrote, never converted (docs/styleguide.md).
  first: string;
  last: string;
};

export type DigestCounts = { ok: number; retry: number; fail: number };

export type Digest = {
  night: string;
  rows: DigestRow[];
  // Lines that did not parse are counted, never thrown: the night still renders.
  badLines: number;
  // Counts are per line, so the board can show them beside the link (§ 2c).
  counts: DigestCounts;
};

// A night with no file is not an error: `null` lets the routes answer 404 (§ 2a, § 2b).
// Issue #2 implements it; until then it throws, and nothing calls it.
export function readNight(runsDir: string, night: string): Digest | null {
  void runsDir;
  void night;
  throw new Error('readNight is not implemented yet (issue #2)');
}

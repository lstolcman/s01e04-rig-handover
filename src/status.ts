import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import type { DigestCounts } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightSummary = {
  night: string;
  // Line counts for the night; null when the file could not be read at all.
  counts: DigestCounts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    // Each night carries its own counts, so the board links it with ok/retry/fail beside it (§ 2c).
    nights: nightsOnDisk(config.runsDir).map((night) => ({
      night,
      counts: readNight(config.runsDir, night)?.counts ?? null,
    })),
  };
}

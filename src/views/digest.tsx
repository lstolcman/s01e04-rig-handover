import type { Digest, DigestRow } from '../digest/types.js';

// One night, read at breakfast: what ran, what retried, what failed, and whose it was (plan § 2a).
// Missing data renders as `-`, never as an empty cell (docs/styleguide.md).

const MISSING = '-';

function Status({ row }: { row: DigestRow }) {
  return row.lastStatus === 'fail' ? <span class="warn">{row.lastStatus}</span> : <>{row.lastStatus}</>;
}

function Retries({ row }: { row: DigestRow }) {
  return row.retries >= 3 ? <span class="warn">{row.retries}</span> : <>{row.retries}</>;
}

function Error({ row }: { row: DigestRow }) {
  if (row.lastError === null) return <>{MISSING}</>;
  return row.lastStatus === 'fail' ? <span class="warn">{row.lastError}</span> : <>{row.lastError}</>;
}

export function DigestPage({ digest }: { digest: Digest }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner ?? MISSING}</td>
                <td>{row.runs}</td>
                <td>
                  <Retries row={row} />
                </td>
                <td>
                  <Status row={row} />
                </td>
                <td>
                  <Error row={row} />
                </td>
                <td>{row.first}</td>
                <td>{row.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">
          {digest.badLines} {digest.badLines === 1 ? 'line' : 'lines'} did not parse and {digest.badLines === 1 ? 'is' : 'are'} counted
        </p>
      ) : null}
      <p class="mute">
        {digest.counts.ok} ok, {digest.counts.retry} retry, {digest.counts.fail} fail
      </p>
    </>
  );
}

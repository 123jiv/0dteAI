// docs/METRICS.md says exactly what may be sent (launch pass P1-20): its allowlist tables list the
// same events, in the same order, with the same properties and the same types as core/metrics, so
// the document the policy, the privacy label and the endpoint are written from can't drift.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BATCH, describeSchema, EVENT_NAMES, MAX_AGE_DAYS, MAX_QUEUE, stamp } from '../metrics';
import { METRICS_KEY, RETRY_MS, SEND_AFTER_MS, SEND_AT } from '../../services/metrics';

vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('../../state/storage', () => ({ appStorage: {} }));

const DOC = readFileSync(join(__dirname, '../../../docs/METRICS.md'), 'utf8');

function sectionOf(heading: string): string {
  const start = DOC.indexOf(`\n## ${heading}\n`);
  expect(start, heading).toBeGreaterThan(-1);
  const end = DOC.indexOf('\n## ', start + 4);
  return DOC.slice(start, end < 0 ? undefined : end);
}

/** `| \`prop\` | type | meaning |` rows: [prop, type]. */
function rows(block: string): [string, string][] {
  return block
    .split('\n')
    .filter(l => l.startsWith('| `'))
    .map(l => l.split('|').map(c => c.trim()))
    .map(c => [c[1].replace(/`/g, ''), c[2]]);
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

describe('docs/METRICS.md is the allowlist', () => {
  const allowlist = sectionOf('The allowlist');
  const blocks = allowlist.split('\n### ').slice(1);

  it('lists every event, in order, and says how many', () => {
    expect(blocks.map(b => b.split('\n')[0].trim())).toEqual(EVENT_NAMES);
    expect(allowlist).toContain(`${WORDS[EVENT_NAMES.length].replace(/^./, c => c.toUpperCase())} events.`);
  });

  it("lists each event's properties with the code's types", () => {
    const spec = describeSchema();
    for (const b of blocks) {
      const name = b.split('\n')[0].trim() as keyof typeof spec;
      expect(rows(b), name).toEqual(spec[name].map(p => [p.prop, p.type]));
    }
  });

  it('names the stamps every record carries', () => {
    const request = sectionOf('What a request holds');
    expect(rows(request).map(([k]) => k)).toEqual(Object.keys(stamp('2026-10-19', '2026-10-21')));
  });

  it('states the queue and sending numbers the code uses', () => {
    const queue = sectionOf('Queue, flush and retry');
    expect(queue).toContain(`\`${METRICS_KEY}\``);
    expect(queue).toContain(`Cap:** ${MAX_QUEUE} records`);
    expect(queue).toContain(`not sent within ${MAX_AGE_DAYS} days`);
    expect(queue).toContain(`when ${SEND_AT} records wait or the oldest is ${SEND_AFTER_MS / 3600_000} hours old`);
    expect(queue).toContain(`one try every ${RETRY_MS / 60_000} minutes`);
    expect(queue).toContain(`up to ${BATCH} records`);
  });

  it('is plain: no "!" or emoji outside code', () => {
    const prose = DOC.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    expect(prose).not.toMatch(/!/);
    expect(prose).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

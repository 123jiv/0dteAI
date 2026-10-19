// The Plan completion moment (launch pass P1-8): restrained, in the UNSETLD voice, no points.
import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '..';
import { PROGRAMS_COPY } from '../copy/programs';
import { PROGRESS } from '../copy/progress';

const M = PROGRAMS_COPY.moment;
const SLOP = /grind|level up|journey|mindset|crush|beast|hustle|unlock|amazing|awesome|incredible|congrat|proud|points?\b|pts/i;

describe('the Plan moment', () => {
  it('7 Day Lock In: the date, the title in capitals, the days in words', () => {
    expect(M.finished(PROGRESS.date('2026-10-18', '2026-10-19'))).toBe('Finished 18 Oct');
    expect(M.finished(PROGRESS.date('2025-12-30', '2026-01-01'))).toBe('Finished 30 Dec 2025');
    // The last two words kept together: "LOCK IN." never leaves "IN." on a line of its own.
    expect(M.title('7 Day Lock In')).toBe('7 DAY LOCK\u00A0IN.');
    expect(M.title('Get Organized')).toBe('GET ORGANIZED.');
    expect(M.line(7)).toBe('Seven days. Each one proven.');
    expect(M.a11y('7 Day Lock In', 7)).toBe('7 Day Lock In, finished. Seven days. Each one proven.');
  });

  it('every Plan reads right: five to fourteen days in words, digits past twenty', () => {
    expect(M.line(5)).toBe('Five days. Each one proven.');
    expect(M.line(14)).toBe('Fourteen days. Each one proven.');
    expect(M.line(1)).toBe('One day. Proven.');
    expect(M.line(21)).toBe('21 days. Each one proven.');
    for (const p of PROGRAMS) {
      const lines = [M.title(p.title), M.line(p.days), M.a11y(p.title, p.days)];
      expect(M.title(p.title).replace(/\u00A0/g, ' ')).toBe(`${p.title.toUpperCase()}.`);
      for (const line of lines) {
        expect(line).not.toContain('!');
        expect(line).not.toMatch(SLOP);
      }
      // VoiceOver reads the title as written, not in capitals.
      expect(M.a11y(p.title, p.days).startsWith(`${p.title}, finished.`)).toBe(true);
    }
  });

  it('ends on the moment footer, the same as every milestone', () => {
    expect(PROGRESS.moment.footer).toBe('Never settle for less.');
    expect(PROGRESS.moment.byKey['plan-1']).toEqual({ title: 'FIRST PLAN.', line: 'A plan, every day proven.' });
  });
});

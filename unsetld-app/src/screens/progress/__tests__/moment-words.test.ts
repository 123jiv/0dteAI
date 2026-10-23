// The moment page as VoiceOver says it (UX review 9): a Plan's moment is one sentence with its
// date in it, and the kicker ("Finished 22 Oct") isn't read as well, so "finished" is said once.
// A milestone keeps its kicker ("Reached 9 Oct") and its own title.
import { describe, expect, it } from 'vitest';
import { momentWords } from '../momentWords';

const TODAY = '2026-10-23';

describe('momentWords', () => {
  it('a Plan: the date in the one sentence, the kicker not read on its own', () => {
    const w = momentWords({ plan: 'lock-in-7', day: '2026-10-22' }, () => null, TODAY);
    expect(w.kicker).toBe('Finished 22 Oct');
    expect(w.a11yKicker).toBeNull();
    expect(w.a11y).toBe('7 Day Lock In, finished 22 Oct. Seven days. Each one proven.');
    const said = [w.a11yKicker, w.a11y].filter(Boolean).join(' ');
    expect(said.match(/finished/gi)).toHaveLength(1);
  });

  it('a Plan the library no longer has: nothing claimed', () => {
    expect(momentWords({ plan: 'gone', day: '2026-10-22' }, () => null, TODAY)).toEqual({ kicker: null, a11yKicker: null, title: '', line: '', a11y: null });
  });

  it('a milestone keeps its kicker for VoiceOver; not reached claims no date', () => {
    const w = momentWords({ key: 'plan-1' }, () => '2026-10-09', TODAY);
    expect(w.kicker).toBe('Reached 9 Oct');
    expect(w.a11yKicker).toBe('Reached 9 Oct');
    expect(w.title).toBe('FIRST PLAN.');
    expect(w.a11y).toBeNull();
    expect(momentWords({ key: 'plan-1' }, () => null, TODAY).kicker).toBeNull();
  });
});

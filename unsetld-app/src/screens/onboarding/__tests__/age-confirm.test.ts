// The Age step's Continue asks before the answer is kept (UX review 1): one mistaken tap on a
// recent year would otherwise delete an existing user's record for good. The question is the
// same for every year, so it gives nothing away, and nothing happens until Continue in it.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AGE } from '../../../content/copy/age';
import { confirmBirth } from '../ageConfirm';

// vi.hoisted and vi.mock run before the imports above.
const shown = vi.hoisted(() => [] as { title: string; message?: string; options: { label: string; cancel?: boolean; onPress?: () => void }[] }[]);
vi.mock('../../../ui/actions', () => ({
  showDialog: (title: string, message: string | undefined, options: (typeof shown)[number]['options']) => void shown.push({ title, message, options }),
}));

describe('confirmBirth', () => {
  beforeEach(() => {
    shown.length = 0;
  });

  it('asks before anything is kept or deleted; Change does nothing, Continue goes on', () => {
    const go = vi.fn();
    confirmBirth(2016, null, go);
    expect(go).not.toHaveBeenCalled();
    expect(shown).toHaveLength(1);
    const [d] = shown;
    expect(d.title).toBe('Born in 2016?');
    expect(d.message).toBe(AGE.confirm.body);
    expect(d.options.map(o => o.label)).toEqual(['Change', 'Continue']);
    d.options[0].onPress?.();
    expect(go).not.toHaveBeenCalled();
    d.options[1].onPress?.();
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('the same question for every year: nothing in it says which answer gets in', () => {
    for (const [y, m] of [
      [2016, null],
      [2013, 3],
      [2013, 11],
      [2009, null],
      [1990, null],
    ] as const) {
      confirmBirth(y, m, () => {});
    }
    const shapes = shown.map(d => ({ ...d, title: d.title.replace(/(January|March|November) |\d{4}/g, ''), options: d.options.map(o => [o.label, Boolean(o.cancel)]) }));
    for (const s of shapes) expect(s).toEqual(shapes[0]);
    expect(shown[1].title).toBe('Born in March 2013?');
    const words = JSON.stringify(shown);
    expect(words).not.toMatch(/old enough|must be|at least|over|under|adult|parent|13 and/i);
    expect(words).not.toMatch(/[!…]/);
  });
});

// What a moment page says (MomentScreen). Kept apart from the screen so it can be tested.
import type { MilestoneKey } from '../../core/progress';
import type { DayKey } from '../../core/time';
import { PROGRAM_BY_ID } from '../../content';
import { PROGRAMS_COPY } from '../../content/copy/programs';
import { PROGRESS } from '../../content/copy/progress';
import type { RootParams } from '../../navigation/types';

const M = PROGRESS.moment;
const P = PROGRAMS_COPY.moment;

/**
 * What the page says: the kicker (null claims no date), what VoiceOver says for it (null: it
 * isn't read on its own), the title, the line, and one label for title and line together.
 */
export interface MomentWords {
  kicker: string | null;
  a11yKicker: string | null;
  title: string;
  line: string;
  a11y: string | null;
}

export function momentWords(p: RootParams['Moment'], reachedOf: (key: MilestoneKey) => DayKey | null, today: DayKey): MomentWords {
  if ('plan' in p) {
    // A Plan finished: its title in capitals, its days in words. No points. VoiceOver hears one
    // sentence with the date in it ("7 Day Lock In, finished 22 Oct. ..."), so the kicker
    // ("Finished 22 Oct") isn't read as well.
    const program = PROGRAM_BY_ID[p.plan];
    if (!program) return { kicker: null, a11yKicker: null, title: '', line: '', a11y: null };
    const date = PROGRESS.date(p.day, today);
    return { kicker: P.finished(date), a11yKicker: null, title: P.title(program.title), line: P.line(program.days), a11y: P.a11y(program.title, program.days, date) };
  }
  // Null when it isn't reached (a stale link): then no date is claimed.
  const reached = reachedOf(p.key);
  const words = M.byKey[p.key] ?? { title: '', line: '' };
  return { kicker: reached ? M.reached(reached, today) : null, a11yKicker: reached ? M.a11yDate(reached, today) : null, ...words, a11y: null };
}

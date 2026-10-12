// The Record's days as dots (the month grid, Day 1's week row) and the key under them. Each day
// is the shared DayDot; a day with something on record, and today, opens the day's page.
import { Pressable, View } from 'react-native';
import type { DayMark, DayLevel } from '../../core/history';
import type { DayKey } from '../../core/time';
import { PROGRESS } from '../../content/copy/progress';
import { DayDot } from '../../ui/DayDot';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';

const R = PROGRESS.record;
/** Between the columns and between the weeks. */
const COL_GAP = 8;
const ROW_GAP = 10;
/** Past this the dots stop growing: big circles read as buttons, not a record. */
const MAX_CELL = 44;

/** A cell's side for a 7-column grid `width` wide. */
export function cellSize(width: number): number {
  return Math.max(24, Math.min(MAX_CELL, Math.floor((width - 6 * COL_GAP) / 7)));
}

/** Days before the first day on record are nothing to have missed: fainter. */
const isBefore = (m: DayMark, first: DayKey | null) => m.when === 'past' && (first === null || m.day < first);

/** A day that opens its page: something on record (a proof, or a 2.x day), or today. */
const opens = (m: DayMark) => m.when === 'today' || (m.when === 'past' && (m.proven > 0 || m.legacy));

function DayCell({
  mark,
  size,
  today,
  first,
  weekday,
  onDay,
}: {
  mark: DayMark;
  size: number;
  today: DayKey;
  first: DayKey | null;
  weekday?: boolean;
  onDay?: (day: DayKey) => void;
}) {
  const before = isBefore(mark, first);
  const label = R.a11yDay(mark, today, { before, weekday });
  const dot = <DayDot state={{ level: mark.level, when: mark.when, covered: mark.covered, before }} size={size} />;
  if (!onDay || !opens(mark)) {
    return (
      <View accessible accessibilityLabel={label} style={{ width: size, height: size }}>
        {dot}
      </View>
    );
  }
  // The rows are 10 apart: the slop takes a 40pt cell to a 44pt target without overlapping.
  const slop = Math.max(0, Math.min(ROW_GAP / 2, Math.ceil((44 - size) / 2)));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={R.a11yDayHint}
      onPress={() => onDay(mark.day)}
      hitSlop={slop}
      style={({ pressed }) => ({ width: size, height: size, opacity: pressed ? 0.6 : 1 })}>
      {dot}
    </Pressable>
  );
}

/** M T W T F S S over the columns (the cells say their own day to VoiceOver). `lit`: today's column. */
function Letters({ size, lit }: { size: number; lit?: number }) {
  return (
    <View aria-hidden style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {R.letters.map((l, i) => (
        <View key={i} style={{ width: size, alignItems: 'center' }}>
          <T v="meta" color={i === lit ? C.bone : C.stone}>
            {l}
          </T>
        </View>
      ))}
    </View>
  );
}

/**
 * A month, Monday first, one dot per day (no numerals: the dots are the record). `first`: the
 * first day on record (null: none yet). `onDay` opens a day with something on it, or today.
 */
export function MonthGrid({
  weeks,
  width,
  today,
  first,
  onDay,
}: {
  weeks: (DayMark | null)[][];
  width: number;
  today: DayKey;
  first: DayKey | null;
  onDay: (day: DayKey) => void;
}) {
  const size = cellSize(width);
  return (
    <View>
      <Letters size={size} />
      <View style={{ marginTop: 12, gap: ROW_GAP }}>
        {weeks.map(week => (
          <View key={week.find(Boolean)?.day} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {week.map((m, i) =>
              m ? <DayCell key={m.day} mark={m} size={size} today={today} first={first} onDay={onDay} /> : <View key={`pad-${i}`} style={{ width: size, height: size }} />,
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/** One week's dots (Day 1: all still empty), with today's letter lit. */
export function WeekDots({ marks, width, today, first }: { marks: DayMark[]; width: number; today: DayKey; first: DayKey | null }) {
  const size = cellSize(width);
  const lit = marks.findIndex(m => m.day === today);
  return (
    <View>
      <Letters size={size} lit={lit >= 0 ? lit : undefined} />
      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        {marks.map(m => (
          <DayCell key={m.day} mark={m} size={size} today={today} first={first} weekday />
        ))}
      </View>
    </View>
  );
}

const KEY: readonly Exclude<DayLevel, 'none'>[] = ['one', 'two', 'perfect'];

/** The key under the grid, one quiet row: a small dot "1", a larger one "2", a solid one "Perfect day". */
export function Legend() {
  return (
    <View accessible accessibilityLabel={R.a11yLegend} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 18, rowGap: 6 }}>
      {KEY.map(level => (
        <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <DayDot state={{ level, when: 'past', covered: false }} size={14} />
          <T v="meta" color={C.stone}>
            {R.legend[level]}
          </T>
        </View>
      ))}
    </View>
  );
}

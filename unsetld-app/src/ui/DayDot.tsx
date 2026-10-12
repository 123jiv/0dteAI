// One day on the record, drawn the same everywhere (the Record's month grid, Day 1's week row,
// the completion screen): monochrome, by fill. Missed: an empty ring. One mission proven: a
// small dot in the ring. Two or more: a bigger one. Every mission (a perfect day): a solid
// disc. An Off Day kept the streak: the ring with a short bar in it. Days to come: a dash.
// Today wears a second ring around it, whatever its state, so it's always found.
import { View } from 'react-native';
import type { DayLevel, DayMark } from '../core/history';
import { color as C } from './tokens';

export type DotState = Pick<DayMark, 'level' | 'when' | 'covered'> & {
  /** Before the first day on record: nothing to have missed yet (fainter). */
  before?: boolean;
};

/** How big the inner dot is for each level, as a share of the circle. */
const INNER: Record<DayLevel, number> = { none: 0, one: 0.38, two: 0.64, perfect: 1 };

export function DayDot({ state, size }: { state: DotState; size: number }) {
  const { level, when, covered, before } = state;
  const today = when === 'today';
  // Room for today's outer ring.
  const d = Math.round(size * 0.78);
  if (when === 'future') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: Math.round(d * 0.32), height: 1.5, backgroundColor: C.greyLetter }} />
      </View>
    );
  }
  const filled = level === 'perfect';
  const inner = INNER[level];
  const ring = filled ? C.bone : level === 'none' ? (before ? C.rule : C.ash) : C.stone;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {today ? (
        <View
          style={{
            position: 'absolute',
            width: d + 8,
            height: d + 8,
            borderRadius: (d + 8) / 2,
            borderWidth: 1.5,
            borderColor: C.bone,
          }}
        />
      ) : null}
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: filled ? 0 : 1.5,
          borderColor: ring,
          backgroundColor: filled ? C.bone : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {!filled && inner > 0 ? (
          <View
            style={{
              width: Math.round(d * inner),
              height: Math.round(d * inner),
              borderRadius: Math.round(d * inner) / 2,
              // Showed up reads quiet (one: stone, two: a bigger, lighter dot); only a perfect day is bone.
              backgroundColor: level === 'two' ? C.muted : C.stone,
            }}
          />
        ) : null}
        {level === 'none' && covered ? <View style={{ width: Math.round(d * 0.36), height: 1.5, backgroundColor: C.stone }} /> : null}
      </View>
    </View>
  );
}

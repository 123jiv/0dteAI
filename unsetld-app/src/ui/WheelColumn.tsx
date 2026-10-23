import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { selection } from '../services/haptics';
import { T } from './text';
import { color as C, font, hairline } from './tokens';
import { rowAt, WHEEL_ROW } from './wheel';

export { WHEEL_ROW };

/**
 * One column of a wheel-style picker, built in JS so it works in the browser preview too: five
 * rows in view, the picked one between two rules. Like the iOS wheel, it snaps row by row and
 * the row a scroll stops on is picked; a tap picks too. `value` null picks nothing (the age
 * gate's year: no year is suggested) until a row is tapped or scrolled to, and the column starts
 * at its first row.
 */
export function WheelColumn<V extends number | string>({
  items,
  value,
  onPick,
  format,
  label,
  itemLabel,
}: {
  items: V[];
  value: V | null;
  onPick: (v: V) => void;
  format: (v: V) => string;
  label: string;
  /** What VoiceOver says for a row, when the shown text isn't enough. */
  itemLabel?: (v: V) => string;
}) {
  const index = value === null ? 0 : Math.max(0, items.indexOf(value));
  const ref = useRef<ScrollView>(null);
  const placed = useRef(false);
  /** Set when a finger moves the column: only a scroll the user made picks a row. */
  const dragged = useRef(false);
  /** What was picked last, so a scroll that settles on it again (after a tap) doesn't pick it twice. */
  const last = useRef<V | null>(value);
  useEffect(() => {
    last.current = value;
  }, [value]);
  const pick = (v: V) => {
    if (v === last.current) return;
    last.current = v;
    selection();
    onPick(v);
  };
  const settle = (y: number) => {
    if (!dragged.current) return;
    dragged.current = false;
    const v = items[rowAt(y, items.length)];
    if (v !== undefined) pick(v);
  };
  // A drag that ends without a fling settles where it is; one with a fling (or the snap to the
  // nearest row) settles where its momentum ends, so a scroll picks once.
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopWaiting = () => {
    if (wait.current) clearTimeout(wait.current);
    wait.current = null;
  };
  useEffect(() => stopWaiting, []);
  const offsetOf = (e: NativeSyntheticEvent<NativeScrollEvent>) => e.nativeEvent.contentOffset.y;
  // react-native-web ignores contentOffset, so scroll the picked row into the
  // middle band ourselves: at once when the sheet opens, smoothly after a tap.
  useEffect(() => {
    ref.current?.scrollTo({ x: 0, y: index * WHEEL_ROW, animated: placed.current });
    placed.current = true;
  }, [index]);
  return (
    <ScrollView
      ref={ref}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flex: 1, height: WHEEL_ROW * 5 }}
      // Two empty rows above and below so the first and last values can centre.
      contentContainerStyle={{ paddingVertical: WHEEL_ROW * 2 }}
      contentOffset={{ x: 0, y: index * WHEEL_ROW }}
      snapToInterval={WHEEL_ROW}
      decelerationRate="fast"
      onScrollBeginDrag={() => {
        stopWaiting();
        dragged.current = true;
      }}
      onScrollEndDrag={e => {
        const y = offsetOf(e);
        stopWaiting();
        wait.current = setTimeout(() => settle(y), 100);
      }}
      onMomentumScrollBegin={stopWaiting}
      onMomentumScrollEnd={e => {
        stopWaiting();
        settle(offsetOf(e));
      }}
      showsVerticalScrollIndicator={false}>
      {items.map(v => {
        const on = v === value;
        return (
          <Pressable
            key={String(v)}
            // A radio with aria-checked: react-native-web drops accessibilityState, and
            // the web has no selected state for a plain button.
            accessibilityRole="radio"
            accessibilityLabel={itemLabel ? itemLabel(v) : undefined}
            aria-checked={on}
            onPress={() => pick(v)}
            style={{ height: WHEEL_ROW, alignItems: 'center', justifyContent: 'center', borderTopWidth: on ? hairline : 0, borderBottomWidth: on ? hairline : 0, borderColor: C.ruleStrong }}>
            <T v="row" color={on ? C.bone : C.ash} style={{ fontFamily: font.sans, fontSize: 20, fontVariant: ['tabular-nums'] }}>
              {format(v)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

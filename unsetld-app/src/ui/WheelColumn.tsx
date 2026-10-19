import { useEffect, useRef } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { selection } from '../services/haptics';
import { T } from './text';
import { color as C, font, hairline } from './tokens';

/** One row of a wheel column. */
export const WHEEL_ROW = 40;

/**
 * One column of a wheel-style picker, built in JS so it works in the browser preview too: five
 * rows in view, the picked one between two rules. A tap picks. `value` null picks nothing (the
 * age gate's year: no year is suggested), and the column starts at its first row.
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
            onPress={() => {
              selection();
              onPick(v);
            }}
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

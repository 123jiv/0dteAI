import { Pressable, ScrollView, View } from 'react-native';
import { selection } from '../services/haptics';
import { T } from './text';
import { color as C, font, hairline } from './tokens';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ROW = 40;

function Column<V extends number | string>({
  items,
  value,
  onPick,
  format,
  label,
}: {
  items: V[];
  value: V;
  onPick: (v: V) => void;
  format: (v: V) => string;
  label: string;
}) {
  const index = Math.max(0, items.indexOf(value));
  return (
    <ScrollView
      accessibilityLabel={label}
      style={{ flex: 1, height: ROW * 5 }}
      contentOffset={{ x: 0, y: Math.max(0, (index - 2) * ROW) }}
      showsVerticalScrollIndicator={false}>
      {items.map(v => {
        const on = v === value;
        return (
          <Pressable
            key={String(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              selection();
              onPick(v);
            }}
            style={{ height: ROW, alignItems: 'center', justifyContent: 'center', borderTopWidth: on ? hairline : 0, borderBottomWidth: on ? hairline : 0, borderColor: C.ruleStrong }}>
            <T v="row" color={on ? C.bone : C.ash} style={{ fontFamily: font.sans, fontSize: 20, fontVariant: ['tabular-nums'] }}>
              {format(v)}
            </T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Wheel-style time picker for the browser preview (iOS uses the native wheel). */
export function TimeWheel({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const h24 = Math.floor(value / 60) % 24;
  const minute = Math.round((value % 60) / 5) * 5 % 60;
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const set = (h: number, m: number, isPm: boolean) => onChange(((h % 12) + (isPm ? 12 : 0)) * 60 + m);
  return (
    <View style={{ flexDirection: 'row', gap: 8, height: ROW * 5 }}>
      <Column label="Hour" items={HOURS} value={h12} onPick={h => set(h, minute, pm)} format={h => String(h)} />
      <Column label="Minute" items={MINUTES} value={minute} onPick={m => set(h12, m, pm)} format={m => String(m).padStart(2, '0')} />
      <Column label="AM or PM" items={['AM', 'PM']} value={pm ? 'PM' : 'AM'} onPick={p => set(h12, minute, p === 'PM')} format={p => p} />
    </View>
  );
}

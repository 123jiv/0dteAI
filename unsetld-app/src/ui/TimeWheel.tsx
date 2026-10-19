import { View } from 'react-native';
import { WheelColumn as Column, WHEEL_ROW as ROW } from './WheelColumn';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

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

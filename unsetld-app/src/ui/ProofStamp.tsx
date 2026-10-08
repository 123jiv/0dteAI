import { View } from 'react-native';
import { shortDate, type DayKey } from '../core/time';
import { catalogueNo } from '../core/typography';
import { T } from './text';
import { color as C } from './tokens';

/** "9:47 PM" from a timestamp, in the phone's time. */
export function clockTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * The garment-tag label printed on every proof photo: the day's catalogue
 * number, the time and the date, bone on ink like a woven label.
 */
export function ProofStamp({ day, takenAt, lineNo, small = false }: { day: DayKey; takenAt: number; lineNo: number | null; small?: boolean }) {
  const parts = [lineNo ? catalogueNo(lineNo) : null, clockTime(takenAt), shortDate(day)].filter(Boolean);
  return (
    <View
      accessible
      accessibilityLabel={`Taken ${shortDate(day)} at ${clockTime(takenAt)}`}
      style={{ alignSelf: 'flex-start', backgroundColor: C.bone, paddingHorizontal: small ? 4 : 8, paddingVertical: small ? 2 : 4 }}>
      <T v={small ? 'mono.s' : 'mono'} color={C.ink} numberOfLines={1} style={small ? { fontSize: 8, lineHeight: 10 } : undefined}>
        {parts.join(' · ')}
      </T>
    </View>
  );
}

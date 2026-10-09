import { View } from 'react-native';
import { shortDate, type DayKey } from '../core/time';
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
 * The garment-tag label printed on every proof photo: an optional label (the
 * mission title, "BEFORE", "+15"), the time and the date, bone on ink like a
 * woven label. It never grows past its photo: a long label is cut short, the
 * time and date always show.
 */
export function ProofStamp({ day, takenAt, label, small = false }: { day: DayKey; takenAt: number; label?: string; small?: boolean }) {
  const when = `${clockTime(takenAt)} · ${shortDate(day)}`;
  const said = `Taken ${shortDate(day)} at ${clockTime(takenAt)}`;
  const v = small ? 'mono.s' : 'mono';
  const size = small ? { fontSize: 8, lineHeight: 10 } : undefined;
  return (
    <View
      accessible
      accessibilityLabel={label ? `${label}. ${said}` : said}
      style={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        flexDirection: 'row',
        backgroundColor: C.bone,
        paddingHorizontal: small ? 4 : 8,
        paddingVertical: small ? 2 : 4,
      }}>
      {label ? (
        <T v={v} color={C.ink} numberOfLines={1} style={[{ flexShrink: 1 }, size]}>
          {label}
        </T>
      ) : null}
      <T v={v} color={C.ink} numberOfLines={1} style={[{ flexShrink: 0 }, size]}>
        {/* A no-break space: a leading plain space is dropped on the web. */}
        {label ? `\u00A0· ${when}` : when}
      </T>
    </View>
  );
}

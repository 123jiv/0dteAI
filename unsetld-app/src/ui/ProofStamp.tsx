import { View } from 'react-native';
import { shortDate, type DayKey } from '../core/time';
import { MISSION } from '../content/copy/mission';
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
  const said = MISSION.a11y.stamp(shortDate(day), clockTime(takenAt));
  const v = small ? 'mono.s' : 'mono';
  const size = small ? { fontSize: 8, lineHeight: 10 } : undefined;
  // The gap before the dot is a margin one mono space wide (0.6em plus tracking), not a
  // space character: the web drops a leading space in a text run, so the dot ran into the label.
  const gap = small ? 5 : 7;
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
      <T v={v} color={C.ink} numberOfLines={1} style={[{ flexShrink: 0, marginLeft: label ? gap : 0 }, size]}>
        {label ? `· ${when}` : when}
      </T>
    </View>
  );
}

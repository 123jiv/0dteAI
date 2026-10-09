import { useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Profile, Track, TrackId } from '../../core/types';
import { TRACK_BY_ID, TRACKS } from '../../content';
import { MAX_AREAS, ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection, warning } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font } from '../../ui/tokens';

const COPY = ONBOARDING.tracks;
const MAX = MAX_AREAS;
const GAP = 8;

// ── Shared by the three plan screens (Areas, About you, Pace) ───────────────

/**
 * The profile as the screen shows it. Onboarding writes each answer as it is
 * given, so going back keeps it. Edit mode (Settings › Your plan) holds the
 * changes until Save, which writes what changed and rebuilds today's plan if
 * nothing in it was proven or swapped yet.
 */
export function useProfileDraft(edit: boolean) {
  const profile = useApp(s => s.profile);
  const setProfile = useApp(s => s.setProfile);
  const [changes, setChanges] = useState<Partial<Profile>>({});
  const value: Profile = edit ? { ...profile, ...changes } : profile;

  const change = (patch: Partial<Profile>) => {
    if (edit) setChanges(c => ({ ...c, ...patch }));
    else setProfile(patch);
  };

  const save = (extra?: Partial<Profile>) => {
    const s = useApp.getState();
    const all = { ...changes, ...extra };
    const diff = (Object.keys(all) as (keyof Profile)[]).filter(k => JSON.stringify(s.profile[k]) !== JSON.stringify(all[k]));
    if (!diff.length) return;
    s.setProfile(Object.fromEntries(diff.map(k => [k, all[k]])) as Partial<Profile>);
    s.replanToday();
  };

  return { value, change, save };
}

/** A bordered choice: 1px rule border, bone when chosen. Tiles on Areas, the intensity cards on Pace. */
export function Choice({
  on,
  onPress,
  label,
  role,
  children,
  style,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  role: 'checkbox' | 'radio';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={on}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderWidth: 1,
          borderColor: on ? C.bone : C.rule,
          backgroundColor: pressed ? C.raise : 'transparent',
          padding: 14,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/** A square chip: ruled outline, bone fill when chosen. 40 tall, 44 with the slop. A radio, or a checkbox in a pick-any group. */
export function Chip({
  title,
  on,
  onPress,
  label,
  role = 'radio',
  style,
  children,
}: {
  title?: string;
  on: boolean;
  onPress: () => void;
  label: string;
  role?: 'radio' | 'checkbox';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={on}
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
      style={({ pressed }) => [
        {
          minHeight: 40,
          minWidth: 56,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: on ? C.bone : C.ruleStrong,
          backgroundColor: on ? C.bone : pressed ? C.raise : 'transparent',
        },
        style,
      ]}>
      {children ?? (
        <T v="small" align="center" color={on ? C.ink : C.muted} style={{ fontFamily: font.sansMedium }}>
          {title}
        </T>
      )}
    </Pressable>
  );
}

// ── Areas ───────────────────────────────────────────────────────────────────

/**
 * One area: its number and box on top, the name, then the scope line. Two to a
 * row, so a 375pt phone shows the name on one line and the scope in two or three.
 */
function Tile({ track, index, on, dim, onPress }: { track: Track; index: number; on: boolean; dim: boolean; onPress: () => void }) {
  return (
    <Choice
      on={on}
      onPress={onPress}
      role="checkbox"
      label={COPY.a11yTile(track.name, track.scope)}
      style={{ flex: 1, minHeight: 100, padding: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="mono.s" color={on ? C.stone : C.ash}>
          {COPY.tileNo(index)}
        </T>
        <Square on={on} />
      </View>
      {/* ORGANIZATION is the longest name; at the largest text sizes it shrinks rather than breaking. */}
      <T v="label" color={on ? C.bone : dim ? C.ash : C.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: 12 }}>
        {track.name}
      </T>
      <T v="note" color={dim ? C.ash : C.stone} style={{ marginTop: 4 }}>
        {track.scope}
      </T>
    </Choice>
  );
}

/** Two to a row; the ninth keeps its column. */
const ROWS: Track[][] = TRACKS.reduce<Track[][]>((rows, t, i) => {
  if (i % 2 === 0) rows.push([t]);
  else rows[rows.length - 1].push(t);
  return rows;
}, []);

/** Onboarding step 1, and Settings › Your plan › Areas: one to four things to work on. */
export function TracksScreen({ navigation, route }: RootProps<'Tracks'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);
  // A saved id the library no longer has would count toward four with no tile to take it off.
  const chosen = value.tracks.filter(id => TRACK_BY_ID[id]);
  const full = chosen.length >= MAX;
  const [flash] = useState(() => new Animated.Value(1));

  const blocked = () => {
    warning();
    AccessibilityInfo.announceForAccessibility(COPY.full);
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.3, duration: 150, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const toggle = (id: TrackId) => {
    if (chosen.includes(id)) {
      selection();
      change({ tracks: chosen.filter(t => t !== id) });
    } else if (full) blocked();
    else {
      selection();
      change({ tracks: [...chosen, id] });
    }
  };

  const done = () => {
    // A week's lean on a track that's no longer chosen goes with it.
    const priority = value.priority && chosen.includes(value.priority) ? value.priority : null;
    if (edit) {
      save({ tracks: chosen, priority });
      navigation.goBack();
    } else {
      if (priority !== value.priority || chosen.length !== value.tracks.length) change({ tracks: chosen, priority });
      navigation.navigate('AboutYou');
    }
  };

  return (
    <Screen
      nav={<NavRow onBack={edit ? () => navigation.goBack() : undefined} step={edit ? undefined : ONBOARDING.step(1)} />}
      footer={
        <View style={{ gap: 12 }}>
          <Animated.View style={{ opacity: flash, alignItems: 'center' }}>
            <T
              v="mono"
              color={full ? C.bone : C.stone}
              accessibilityLabel={COPY.a11yCounter(chosen.length)}
              accessibilityLiveRegion="polite">
              {COPY.counter(chosen.length)}
            </T>
          </Animated.View>
          <Button title={edit ? ONBOARDING.save : ONBOARDING.continue} disabled={chosen.length === 0} onPress={done} />
        </View>
      }>
      <PageTitle title={COPY.title} body={COPY.body} />
      <View style={{ marginTop: 24, gap: GAP }}>
        {ROWS.map((row, r) => (
          <View key={row[0].id} style={{ flexDirection: 'row', gap: GAP }}>
            {/* Each tile sits in a bare half-width cell: a bordered, padded tile beside an empty spacer would take the wider share. */}
            {row.map((t, c) => {
              const on = chosen.includes(t.id);
              return (
                <View key={t.id} style={{ flex: 1 }}>
                  <Tile track={t} index={r * 2 + c} on={on} dim={full && !on} onPress={() => toggle(t.id)} />
                </View>
              );
            })}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

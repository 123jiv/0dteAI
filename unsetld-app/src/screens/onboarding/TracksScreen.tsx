import { useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Profile, Track, TrackId } from '../../core/types';
import { TRACK_BY_ID, TRACKS } from '../../content';
import { MAX_AREAS, MIN_AREAS, ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection, warning } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Screen, Square, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, GAP, radius } from '../../ui/tokens';

const COPY = ONBOARDING.tracks;
const MAX = MAX_AREAS;

// ── Shared by the onboarding screens (Areas, About you, Time, Goal) ─────────

/**
 * The profile as the screen shows it. Onboarding writes each answer as it is
 * given, so going back keeps it. Edit mode (You › Your goals) holds the
 * changes until Save, which writes what changed and rebuilds today's plan if
 * nothing in it was started, proven or swapped yet.
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

/**
 * The fewest areas a save may leave: two, or one for someone whose saved profile
 * already has one (earlier versions allowed it). Onboarding always asks for two.
 */
export function useMinAreas(edit: boolean): number {
  const saved = useApp(s => s.profile.tracks.filter(id => TRACK_BY_ID[id]).length);
  return edit ? Math.max(1, Math.min(MIN_AREAS, saved)) : MIN_AREAS;
}

/**
 * A choice on a raised card: a bone edge when chosen, nothing around it when not.
 * The area tiles, the time tiles and the intensity cards.
 */
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
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: on ? C.bone : 'transparent',
          backgroundColor: pressed ? C.cardPressed : C.card,
          padding: 16,
        },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/** A small answer chip: outlined, bone fill when chosen. 40 tall, 44 with the slop. A radio, or a checkbox in a pick-any group. */
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
  role?: 'radio' | 'checkbox' | 'button';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      // aria-checked rather than accessibilityState: react-native-web only reads the former.
      aria-checked={role === 'button' ? undefined : on}
      onPress={onPress}
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
      style={({ pressed }) => [
        {
          minHeight: 40,
          minWidth: 56,
          paddingHorizontal: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: on ? C.bone : C.ruleStrong,
          backgroundColor: on ? C.bone : pressed ? C.cardPressed : 'transparent',
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

/** One area: its name in serif, the box, and the scope line under it. Two to a row. */
function Tile({ track, on, dim, onPress }: { track: Track; on: boolean; dim: boolean; onPress: () => void }) {
  return (
    <Choice on={on} onPress={onPress} role="checkbox" label={COPY.a11yTile(track.name, track.scope)} style={{ flex: 1, minHeight: 104, padding: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {/* Organization is the longest name; at the largest text sizes it shrinks rather than breaking. */}
        <T v="saved" color={dim ? C.ash : C.bone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1 }}>
          {track.short}
        </T>
        <Square on={on} />
      </View>
      <T v="note" color={dim ? C.ash : C.stone} style={{ marginTop: 6 }}>
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

/** Onboarding step 1, and You › Areas: two to four things to work on. */
export function TracksScreen({ navigation, route }: RootProps<'Tracks'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);
  const min = useMinAreas(edit);
  // A saved id the library no longer has would count toward four with no tile to take it off.
  const chosen = value.tracks.filter(id => TRACK_BY_ID[id]);
  const full = chosen.length >= MAX;
  // Every School mission needs a yes to "In school or college?". Onboarding goes on to About you,
  // where the answer can still change; edit mode saves straight away, so there School stays off.
  const schoolOff = value.school === false && chosen.includes('school');
  const schoolNote = edit ? COPY.schoolOffEdit : COPY.schoolOff;
  /** What a save keeps: in edit mode School comes off while the answer is No. */
  const kept = edit && schoolOff ? chosen.filter(t => t !== 'school') : chosen;
  const enough = kept.length >= min;
  const stuck = edit && schoolOff && !enough;
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
      if (id === 'school' && value.school === false) AccessibilityInfo.announceForAccessibility(schoolNote);
    }
  };

  const done = () => {
    if (!enough) return;
    // A week's lean on a track that's no longer chosen goes with it.
    const priority = value.priority && kept.includes(value.priority) ? value.priority : null;
    if (edit) {
      save({ tracks: kept, priority });
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
        <View style={{ gap: 10 }}>
          {schoolOff ? (
            <T v="note" color={C.stone} align="center">
              {schoolNote}
            </T>
          ) : null}
          {stuck ? <TextButton title={COPY.aboutYou} onPress={() => navigation.navigate('AboutYou', { edit: true })} /> : null}
          <Animated.View style={{ opacity: flash, alignItems: 'center', gap: 4 }}>
            <T
              v="mono"
              color={full ? C.bone : C.stone}
              accessibilityLabel={COPY.a11yCounter(chosen.length)}
              accessibilityLiveRegion="polite">
              {COPY.counter(chosen.length)}
            </T>
            {!schoolOff && kept.length > 0 && kept.length === min - 1 ? (
              <T v="note" color={C.stone}>
                {edit ? COPY.oneMoreEdit : COPY.oneMore}
              </T>
            ) : null}
          </Animated.View>
          <Button title={edit ? ONBOARDING.save : ONBOARDING.continue} disabled={!enough} onPress={done} />
        </View>
      }>
      <PageTitle title={COPY.title} body={edit && min < MIN_AREAS ? COPY.bodyEdit : COPY.body} />
      <View style={{ marginTop: 24, gap: GAP.tight }}>
        {ROWS.map(row => (
          <View key={row[0].id} style={{ flexDirection: 'row', gap: GAP.tight }}>
            {/* Each tile sits in a bare half-width cell, so a lone ninth tile keeps its column. */}
            {row.map(t => {
              const on = chosen.includes(t.id);
              return (
                <View key={t.id} style={{ flex: 1 }}>
                  <Tile track={t} on={on} dim={full && !on} onPress={() => toggle(t.id)} />
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

import { View } from 'react-native';
import { MAIN_MAX_MINUTES, slotsFor } from '../../core/missions';
import type { MissionSlot, Profile } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { Button, NavRow, PageTitle, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { Choice, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.pace;

const MINUTES: Profile['minutes'][] = [15, 30, 45, 60];
const INTENSITIES: Profile['intensity'][] = ['easy', 'lockin', 'push'];

/** The glyph's height; an easy mission's bar. */
const SHAPE_H = 16;
const EASY_BAR = 6;

/**
 * The day at this time and intensity, one bar per mission: an easy one short,
 * a focused one tall. A focused bar is as tall as the longest mission the
 * intensity hands out, so Start easy's are lower than Push me's.
 */
function DayShape({ slots, longest, on }: { slots: readonly MissionSlot[]; longest: number; on: boolean }) {
  const main = Math.round(EASY_BAR + (SHAPE_H - EASY_BAR) * Math.min(1, longest / MAIN_MAX_MINUTES.push));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: SHAPE_H }}>
      {slots.map((s, i) => (
        <View key={i} style={{ width: 5, height: s === 'easy' ? EASY_BAR : main, backgroundColor: on ? C.bone : C.ash }} />
      ))}
    </View>
  );
}

/** Onboarding step 3, and You › Time and intensity. */
export function PaceScreen({ navigation, route }: RootProps<'Pace'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);
  // 15 and 30 minutes set the whole day whatever the intensity; 45 sets its shape (slotsFor, dayBudget).
  const m = value.minutes;
  const note = m === 15 || m === 30 || m === 45 ? COPY.timeNote[m] : null;

  /** A tap on the chosen one does nothing: time and intensity always have an answer. */
  const set = <K extends 'minutes' | 'intensity'>(key: K, v: Profile[K]) => {
    if (value[key] === v) return;
    selection();
    change({ [key]: v } as Partial<Profile>);
  };

  const done = () => {
    if (edit) {
      save();
      navigation.goBack();
      return;
    }
    navigation.navigate('Goal');
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(3)} />}
      footer={<Button title={edit ? ONBOARDING.save : ONBOARDING.continue} onPress={done} />}>
      <PageTitle title={COPY.title} />
      <View accessibilityRole="radiogroup" accessibilityLabel={COPY.title} style={{ marginTop: 24, flexDirection: 'row', gap: GAP.tight }}>
        {MINUTES.map(n => {
          const on = m === n;
          return (
            <Choice
              key={n}
              role="radio"
              on={on}
              label={COPY.a11yMinutes[n]}
              onPress={() => set('minutes', n)}
              style={{ flex: 1, minWidth: 0, minHeight: 76, paddingHorizontal: 4, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {/* Four across: at the largest text sizes the number shrinks to fit rather than breaking. */}
              <T v="stat" align="center" color={on ? C.bone : C.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 28, lineHeight: 32 }}>
                {COPY.minutes[n]}
              </T>
              <T v="mono.s" align="center" color={on ? C.bone : C.stone}>
                {COPY.minutesUnit}
              </T>
            </Choice>
          );
        })}
      </View>

      <T v="title.m" accessibilityRole="header" style={{ marginTop: GAP.section }}>
        {COPY.hard}
      </T>
      {/* The time chosen wins over intensity: with 15 or 30 minutes every card gets the same day. */}
      {note ? (
        <T v="small" color={C.stone} style={{ marginTop: 8 }}>
          {note}
        </T>
      ) : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={COPY.hard} style={{ marginTop: 16, gap: GAP.tight }}>
        {INTENSITIES.map(i => {
          const on = value.intensity === i;
          const card = COPY.intensity[i];
          // On a short day every card is the same day: the words say what the card does with more time.
          const body = m === 15 || m === 30 ? card.later : m === 45 ? card.at45 : card.body;
          const longest = m === 15 || m === 30 ? MAIN_MAX_MINUTES.easy : MAIN_MAX_MINUTES[i];
          return (
            <Choice key={i} role="radio" on={on} label={COPY.a11yIntensity(card.name, body)} onPress={() => set('intensity', i)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Square on={on} />
                {/* Serif, sentence case, like the area names: tracked capitals are for kickers and the main button. */}
                <T v="saved" color={on ? C.bone : C.muted} style={{ flex: 1 }}>
                  {card.name}
                </T>
                <DayShape slots={slotsFor({ intensity: i, minutes: m })} longest={longest} on={on} />
              </View>
              <T v="small" color={C.stone} style={{ marginTop: 8, marginLeft: 26 }}>
                {body}
              </T>
            </Choice>
          );
        })}
      </View>
    </Screen>
  );
}

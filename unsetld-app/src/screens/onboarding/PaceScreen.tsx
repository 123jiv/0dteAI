import { View } from 'react-native';
import { MAIN_MAX_MINUTES, slotsFor } from '../../core/missions';
import type { MissionSlot, Profile } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { useApp } from '../../state/store';
import { Button, NavRow, PageTitle, Screen, Square } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';
import { Chip, Choice, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.pace;

const MINUTES: Profile['minutes'][] = [15, 30, 60, 90];
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

/** Onboarding step 3, and Settings › Your plan › Pace & intensity. */
export function PaceScreen({ navigation, route }: RootProps<'Pace'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);

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
    // Today's plan fits the answers, so the reminder preview names real missions.
    useApp.getState().replanToday();
    navigation.navigate('Day');
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(3)} />}
      footer={<Button title={edit ? ONBOARDING.save : ONBOARDING.continue} onPress={done} />}>
      <PageTitle title={COPY.title} />
      <View accessibilityRole="radiogroup" accessibilityLabel={COPY.title} style={{ marginTop: 24, flexDirection: 'row', gap: 8 }}>
        {MINUTES.map(m => {
          const on = value.minutes === m;
          return (
            <Chip
              key={m}
              on={on}
              label={COPY.a11yMinutes[m]}
              onPress={() => set('minutes', m)}
              style={{ flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: 4, gap: 2 }}>
              {/* Four across: at the largest text sizes the range shrinks to fit rather than breaking at the dash. */}
              <T v="mono.l" align="center" color={on ? C.ink : C.bone} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {COPY.minutes[m]}
              </T>
              <T v="mono.s" align="center" color={on ? C.ink : C.stone}>
                {COPY.minutesUnit}
              </T>
            </Chip>
          );
        })}
      </View>

      <T v="title.m" accessibilityRole="header" style={{ marginTop: 44 }}>
        {COPY.hard}
      </T>
      {/* The day's time budget wins over intensity: with 5–15 minutes even Push me is three short missions. */}
      {value.minutes === 15 ? (
        <T v="small" color={C.stone} style={{ marginTop: 8 }} accessibilityLabel={COPY.a11yShortDay}>
          {COPY.shortDay}
        </T>
      ) : null}
      <View accessibilityRole="radiogroup" accessibilityLabel={COPY.hard} style={{ marginTop: 16, gap: 10 }}>
        {INTENSITIES.map(i => {
          const on = value.intensity === i;
          const card = COPY.intensity[i];
          return (
            <Choice
              key={i}
              role="radio"
              on={on}
              label={COPY.a11yIntensity(card.name, card.body)}
              onPress={() => set('intensity', i)}
              style={{ paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Square on={on} />
                <T v="button" color={on ? C.bone : C.muted} style={{ flex: 1 }}>
                  {card.name}
                </T>
                <DayShape slots={slotsFor({ intensity: i, minutes: value.minutes })} longest={MAIN_MAX_MINUTES[i]} on={on} />
              </View>
              <T v="small" color={C.stone} style={{ marginTop: 8, marginLeft: 26 }}>
                {card.body}
              </T>
            </Choice>
          );
        })}
      </View>
    </Screen>
  );
}

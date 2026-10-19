import { View } from 'react-native';
import { longestFor, MAIN_MAX_MINUTES, slotsFor } from '../../core/missions';
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
 * The day at this time and intensity (core/missions slotsFor), one bar per
 * mission: an easy one short, a focused one tall. A focused bar is as tall as
 * the longest mission the day hands out, so Start easy's are lower than Push me's.
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
  // The time chosen sets the day (core/missions DAY_SHAPE); intensity counts only with an hour or more.
  const m = value.minutes;
  const hour = m === 60;

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

      {/* What the time chosen gives, for every choice: the shape line and its glyph. */}
      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <T v="small" color={C.stone} style={{ flex: 1 }}>
          {COPY.shape[m]}
        </T>
        {hour ? null : <DayShape slots={slotsFor(value)} longest={longestFor(value)} on />}
      </View>

      {/* How hard? only with an hour or more: below that every intensity gets the same day. */}
      {hour ? (
        <>
          <T v="title.m" accessibilityRole="header" style={{ marginTop: GAP.section }}>
            {COPY.hard}
          </T>
          <View accessibilityRole="radiogroup" accessibilityLabel={COPY.hard} style={{ marginTop: 16, gap: GAP.tight }}>
            {INTENSITIES.map(i => {
              const on = value.intensity === i;
              const card = COPY.intensity[i];
              return (
                <Choice key={i} role="radio" on={on} label={COPY.a11yIntensity(card.name, card.body)} onPress={() => set('intensity', i)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Square on={on} />
                    {/* Serif, sentence case, like the area names: tracked capitals are for kickers and the main button. */}
                    <T v="saved" color={on ? C.bone : C.muted} style={{ flex: 1 }}>
                      {card.name}
                    </T>
                    <DayShape slots={slotsFor({ intensity: i, minutes: m })} longest={MAIN_MAX_MINUTES[i]} on={on} />
                  </View>
                  <T v="small" color={C.stone} style={{ marginTop: 8, marginLeft: 26 }}>
                    {card.body}
                  </T>
                </Choice>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

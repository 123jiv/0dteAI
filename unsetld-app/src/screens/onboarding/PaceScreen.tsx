import { View } from 'react-native';
import { SLOTS_BY_INTENSITY } from '../../core/missions';
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

/** Bar heights for the day's shape: a quick win is short, a challenge tall. */
const BAR: Record<MissionSlot, number> = { quick: 6, progress: 11, challenge: 16 };

/** The day at this intensity, one bar per mission. */
function DayShape({ slots, on }: { slots: readonly MissionSlot[]; on: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
      {slots.map((s, i) => (
        <View key={i} style={{ width: 5, height: BAR[s], backgroundColor: on ? C.bone : C.ash }} />
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
              <T v="mono.l" align="center" color={on ? C.ink : C.bone}>
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
      <View accessibilityRole="radiogroup" accessibilityLabel={COPY.hard} style={{ marginTop: 16, gap: 10 }}>
        {INTENSITIES.map(i => {
          const on = value.intensity === i;
          const card = COPY.intensity[i];
          return (
            <Choice
              key={i}
              role="radio"
              on={on}
              label={COPY.a11yIntensity(card.name, card.body, card.a11yDay)}
              onPress={() => set('intensity', i)}
              style={{ paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Square on={on} />
                <T v="button" color={on ? C.bone : C.muted} style={{ flex: 1 }}>
                  {card.name}
                </T>
                <DayShape slots={SLOTS_BY_INTENSITY[i]} on={on} />
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

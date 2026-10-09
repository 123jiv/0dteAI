import { View } from 'react-native';
import type { Profile } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { Button, NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, hairline } from '../../ui/tokens';
import { Chip, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.about;

type YesNoKey = 'school' | 'work' | 'gym' | 'project';
type Age = NonNullable<Profile['age']>;

const YES_NO: { key: YesNoKey; question: string; hint?: string }[] = [
  { key: 'school', question: COPY.school },
  { key: 'work', question: COPY.work },
  { key: 'gym', question: COPY.gym },
  { key: 'project', question: COPY.project, hint: COPY.projectHint },
];
const AGES: Age[] = ['u16', '16to17', '18plus'];

/** One question: the words on the left, its chips on the right. */
function Question({ question, hint, last, children }: { question: string; hint?: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={question}
      style={{
        minHeight: 68,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: C.rule,
      }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="row" style={{ fontFamily: font.sans }}>
          {question}
        </T>
        {hint ? (
          <T v="note" color={C.stone}>
            {hint}
          </T>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>
    </View>
  );
}

/** Onboarding step 2, and Settings › Your plan › About you. Every answer is optional; a second tap clears one. */
export function AboutYouScreen({ navigation, route }: RootProps<'AboutYou'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);

  const pick = <K extends YesNoKey | 'age'>(key: K, v: Profile[K]) => {
    selection();
    change({ [key]: value[key] === v ? null : v } as Partial<Profile>);
  };

  const next = () => navigation.navigate('Pace');

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(2)} />}
      footer={
        edit ? (
          <Button
            title={ONBOARDING.save}
            onPress={() => {
              save();
              navigation.goBack();
            }}
          />
        ) : (
          <View>
            <Button title={ONBOARDING.continue} onPress={next} />
            <TextButton title={COPY.skip} style={{ marginTop: 8 }} onPress={next} />
          </View>
        )
      }>
      <PageTitle title={COPY.title} body={COPY.body} />
      <View style={{ marginTop: 28 }}>
        {YES_NO.map(q => (
          <Question key={q.key} question={q.question} hint={q.hint}>
            <Chip title={COPY.yes} label={COPY.a11yChip(q.question, COPY.yes)} on={value[q.key] === true} onPress={() => pick(q.key, true)} />
            <Chip title={COPY.no} label={COPY.a11yChip(q.question, COPY.no)} on={value[q.key] === false} onPress={() => pick(q.key, false)} />
          </Question>
        ))}
        <Question question={COPY.age} last>
          {AGES.map(a => (
            <Chip
              key={a}
              title={COPY.ages[a]}
              label={COPY.a11yChip(COPY.age, COPY.a11yAges[a])}
              on={value.age === a}
              onPress={() => pick('age', a)}
              style={{ paddingHorizontal: 10 }}
            />
          ))}
        </Question>
      </View>
    </Screen>
  );
}

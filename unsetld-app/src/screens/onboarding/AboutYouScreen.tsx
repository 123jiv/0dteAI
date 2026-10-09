import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { Profile, SkillId } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { Button, NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, font, hairline } from '../../ui/tokens';
import { Chip, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.about;

type YesNoKey = 'school' | 'work' | 'project' | 'gym';
type Age = NonNullable<Profile['age']>;

const YES_NO: { key: YesNoKey; question: string; hint?: string }[] = [
  { key: 'school', question: COPY.school },
  { key: 'work', question: COPY.work },
  { key: 'project', question: COPY.project, hint: COPY.projectHint },
  { key: 'gym', question: COPY.gym },
];
const AGES: Age[] = ['u16', '16to17', '18plus'];
/** The order the chips show in, and the order a profile keeps them in. */
const SKILLS: SkillId[] = ['coding', 'design', 'video', 'writing', 'language', 'music'];

/** The words of a question, with a grey line under them when there is one. */
function Words({ question, hint, fill }: { question: string; hint?: string; fill?: boolean }) {
  return (
    <View style={{ flex: fill ? 1 : undefined, gap: 2 }}>
      <T v="row" style={{ fontFamily: font.sans }}>
        {question}
      </T>
      {hint ? (
        <T v="note" color={C.stone}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const ROW = { minHeight: 68, paddingVertical: 12, borderTopWidth: hairline, borderColor: C.rule } as const;

/** One pick-one question: the words on the left, its chips on the right. */
function Question({ question, hint, children }: { question: string; hint?: string; children: ReactNode }) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={question}
      style={[ROW, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <Words question={question} hint={hint} fill />
      <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>
    </View>
  );
}

/** Onboarding step 2, and Settings › Your plan › About you. Every answer is optional; a second tap clears one. */
export function AboutYouScreen({ navigation, route }: RootProps<'AboutYou'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);
  const skills = value.skills ?? [];

  const pick = <K extends YesNoKey | 'age'>(key: K, v: Profile[K]) => {
    selection();
    change({ [key]: value[key] === v ? null : v } as Partial<Profile>);
  };

  /** Pick any: a tap adds the skill, a second tap takes it off. None picked is []. */
  const toggleSkill = (id: SkillId) => {
    selection();
    const next = skills.includes(id) ? skills.filter(s => s !== id) : [...skills, id];
    change({ skills: SKILLS.filter(s => next.includes(s)) });
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
        <Question question={COPY.age}>
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
        {/* Pick any: the words on top, the chips wrapping under them. */}
        <View style={[ROW, { borderBottomWidth: hairline, gap: 12 }]}>
          <Words question={COPY.learning} hint={COPY.learningHint} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SKILLS.map(id => (
              <Chip
                key={id}
                role="checkbox"
                title={COPY.skills[id]}
                label={COPY.a11yChip(COPY.learning, COPY.skills[id])}
                on={skills.includes(id)}
                onPress={() => toggleSkill(id)}
              />
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

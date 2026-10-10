import type { ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import type { Profile, SkillId, TrackId } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { Card } from '../../ui/blocks';
import { Button, NavRow, PageTitle, Screen, TextButton } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP } from '../../ui/tokens';
import { Chip, useMinAreas, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.about;

type YesNoKey = 'school' | 'work' | 'project' | 'gym';
type Age = NonNullable<Profile['age']>;
type SchoolLevel = NonNullable<Profile['schoolLevel']>;

const YES_NO: { key: YesNoKey; question: string; hint?: string }[] = [
  { key: 'school', question: COPY.school },
  { key: 'work', question: COPY.work },
  { key: 'project', question: COPY.project, hint: COPY.projectHint },
  { key: 'gym', question: COPY.gym },
];
const AGES: Age[] = ['u16', '16to17', '18plus'];
const SCHOOL_LEVELS: SchoolLevel[] = ['high', 'college'];
/** The order the chips show in, and the order a profile keeps them in. */
const SKILLS: SkillId[] = ['coding', 'design', 'video', 'writing', 'language', 'music'];
/** "What are you learning?" is asked only with one of these areas. */
const LEARNING_AREAS: readonly TrackId[] = ['skills', 'projects', 'career'];

/** The words of a question, with a grey line under them when there is one. */
function Words({ question, hint, fill }: { question: string; hint?: string; fill?: boolean }) {
  return (
    <View style={{ flex: fill ? 1 : undefined, gap: 2 }}>
      <T v="row">{question}</T>
      {hint ? (
        <T v="note" color={C.stone}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** One pick-one question: the words on the left, its chips on the right. */
function Question({ question, hint, children }: { question: string; hint?: string; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={question} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Words question={question} hint={hint} fill />
      <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>
    </View>
  );
}

/** Onboarding step 2, and You › About you. Every answer is optional; a second tap clears one. */
export function AboutYouScreen({ navigation, route }: RootProps<'AboutYou'>) {
  const edit = Boolean(route.params?.edit);
  const { value, change, save } = useProfileDraft(edit);
  const min = useMinAreas(edit);
  const skills = value.skills ?? [];
  const learning = value.tracks.some(t => LEARNING_AREAS.includes(t));

  // School is one of their areas, but they're not in school: every School mission needs a yes.
  // Continue (or Save) takes School off their areas; when that would leave too few, they pick another first.
  const conflict = value.school === false && value.tracks.includes('school');
  const others = value.tracks.filter(t => t !== 'school' && TRACK_BY_ID[t]);
  const stuck = conflict && others.length < min;
  const conflictNote = COPY.schoolConflict(edit, stuck);
  /** School off the areas, and the week's lean with it, when the answers rule it out. */
  const settled = (): Partial<Profile> =>
    conflict ? { tracks: value.tracks.filter(t => t !== 'school'), priority: value.priority === 'school' ? null : value.priority } : {};

  const pick = <K extends YesNoKey | 'age' | 'schoolLevel'>(key: K, v: Profile[K]) => {
    selection();
    const answer = value[key] === v ? null : v;
    const patch = { [key]: answer } as Partial<Profile>;
    // High school or college only follows a yes.
    if (key === 'school' && answer !== true && value.schoolLevel != null) patch.schoolLevel = null;
    change(patch);
    if (key === 'school' && answer === false && value.tracks.includes('school')) {
      AccessibilityInfo.announceForAccessibility(COPY.schoolConflict(edit, others.length < min));
    }
  };

  /** Pick any: a tap adds the skill, a second tap takes it off. None picked is []. */
  const toggleSkill = (id: SkillId) => {
    selection();
    const next = skills.includes(id) ? skills.filter(s => s !== id) : [...skills, id];
    change({ skills: SKILLS.filter(s => next.includes(s)) });
  };

  const next = () => {
    if (stuck) return;
    if (conflict) change(settled());
    navigation.navigate('Pace');
  };

  /** Back to the areas: in onboarding the step before this one; in edit mode the Areas screen, then back here. */
  const changeAreas = () => (edit ? navigation.navigate('Tracks', { edit: true }) : navigation.goBack());

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={edit ? undefined : ONBOARDING.step(2)} />}
      footer={
        edit ? (
          <Button
            title={ONBOARDING.save}
            disabled={stuck}
            onPress={() => {
              save(settled());
              navigation.goBack();
            }}
          />
        ) : (
          <View>
            <Button title={ONBOARDING.continue} disabled={stuck} onPress={next} />
            {/* Skipping keeps the answers given so far, so it can't step past School with too few areas left. */}
            {stuck ? null : <TextButton title={ONBOARDING.skip} style={{ marginTop: 8 }} onPress={next} />}
          </View>
        )
      }>
      <PageTitle title={COPY.title} body={COPY.body} />
      <View style={{ marginTop: 24, gap: GAP.tight }}>
        {YES_NO.map(q => (
          <Card key={q.key} padding={16}>
            <Question question={q.question} hint={q.hint}>
              <Chip title={COPY.yes} label={COPY.a11yChip(q.question, COPY.yes)} on={value[q.key] === true} onPress={() => pick(q.key, true)} />
              <Chip title={COPY.no} label={COPY.a11yChip(q.question, COPY.no)} on={value[q.key] === false} onPress={() => pick(q.key, false)} />
            </Question>
            {q.key === 'school' && value.school === true ? (
              <View style={{ marginTop: 14 }}>
                <Question question={COPY.schoolLevel}>
                  {SCHOOL_LEVELS.map(l => (
                    <Chip
                      key={l}
                      title={COPY.schoolLevels[l]}
                      label={COPY.a11yChip(COPY.schoolLevel, COPY.schoolLevels[l])}
                      on={value.schoolLevel === l}
                      onPress={() => pick('schoolLevel', l)}
                      style={{ paddingHorizontal: 10 }}
                    />
                  ))}
                </Question>
              </View>
            ) : null}
            {q.key === 'school' && conflict ? (
              <View style={{ marginTop: 12, gap: 2 }}>
                <T v="note" color={C.stone}>
                  {conflictNote}
                </T>
                {stuck ? <TextButton title={COPY.changeAreas} align="left" color={C.bone} onPress={changeAreas} /> : null}
              </View>
            ) : null}
          </Card>
        ))}
        <Card padding={16}>
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
        </Card>
        {/* Pick any: the words on top, the chips wrapping under them. Only with Skills, Projects or Career. */}
        {learning ? (
          <Card padding={16} style={{ gap: 12 }}>
            <Words question={COPY.learning} hint={COPY.learningHint} />
            <View accessibilityRole="list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

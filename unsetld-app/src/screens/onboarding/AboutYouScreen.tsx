import { View } from 'react-native';
import type { SkillId } from '../../core/types';
import { ONBOARDING } from '../../content/copy/onboarding';
import type { RootProps } from '../../navigation/types';
import { selection } from '../../services/haptics';
import { Card } from '../../ui/blocks';
import { Button, NavRow, PageTitle, Screen } from '../../ui/kit';
import { SKILLS } from './learning';
import { Chip, useProfileDraft } from './TracksScreen';

const COPY = ONBOARDING.about;

/**
 * You › What you're learning (the You row shows only with Skills, Projects or Career, the areas
 * whose missions can name a skill). Pick any; a second tap takes one off. Saved on Save. Not
 * part of onboarding any more: the school, work, project, gym and age questions are gone, and
 * what earlier versions saved for them stays on the profile.
 */
export function AboutYouScreen({ navigation }: RootProps<'AboutYou'>) {
  // Always edit mode: nothing is written until Save.
  const { value, change, save } = useProfileDraft(true);
  const skills = value.skills ?? [];

  /** Pick any: a tap adds the skill, a second tap takes it off. None picked is []. */
  const toggleSkill = (id: SkillId) => {
    selection();
    const next = skills.includes(id) ? skills.filter(s => s !== id) : [...skills, id];
    change({ skills: SKILLS.filter(s => next.includes(s)) });
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} />}
      footer={
        <Button
          title={ONBOARDING.save}
          onPress={() => {
            save();
            navigation.goBack();
          }}
        />
      }>
      <PageTitle title={COPY.learning} body={COPY.learningHint} />
      <Card padding={16} style={{ marginTop: 24 }}>
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
    </Screen>
  );
}

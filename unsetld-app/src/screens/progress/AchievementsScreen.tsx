// Placeholder from the navigation shell; the screen itself is built per docs/UX_REDESIGN.md.
import type { RootProps } from '../../navigation/types';
import { NavRow, PageTitle, Screen } from '../../ui/kit';

export function AchievementsScreen({ navigation }: RootProps<'Achievements'>) {
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title="Achievements" />
    </Screen>
  );
}

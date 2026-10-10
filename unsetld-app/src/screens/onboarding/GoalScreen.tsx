// Placeholder from the navigation shell; the screen itself is built per docs/UX_REDESIGN.md.
import type { RootProps } from '../../navigation/types';
import { NavRow, PageTitle, Screen } from '../../ui/kit';

export function GoalScreen({ navigation }: RootProps<'Goal'>) {
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title="What are you working toward?" />
    </Screen>
  );
}

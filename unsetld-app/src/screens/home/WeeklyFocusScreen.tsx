// Placeholder from the navigation shell; the screen itself is built per docs/UX_REDESIGN.md.
import type { RootProps } from '../../navigation/types';
import { NavRow, PageTitle, Screen } from '../../ui/kit';

export function WeeklyFocusScreen({ navigation }: RootProps<'WeeklyFocus'>) {
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title="What matters most this week?" />
    </Screen>
  );
}

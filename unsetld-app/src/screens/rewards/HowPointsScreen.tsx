// Placeholder from the navigation shell; the screen itself is built per docs/UX_REDESIGN.md.
import type { RootProps } from '../../navigation/types';
import { NavRow, PageTitle, Screen } from '../../ui/kit';

export function HowPointsScreen({ navigation }: RootProps<'HowPoints'>) {
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <PageTitle title="How points work" />
    </Screen>
  );
}

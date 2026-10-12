// Record › a day (placeholder until the Record group builds it).
import type { RootProps } from '../../navigation/types';
import { NavRow, Screen } from '../../ui/kit';
import { T } from '../../ui/text';

export function RecordDayScreen({ navigation, route }: RootProps<'RecordDay'>) {
  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <T v="title.l">{route.params.day}</T>
    </Screen>
  );
}

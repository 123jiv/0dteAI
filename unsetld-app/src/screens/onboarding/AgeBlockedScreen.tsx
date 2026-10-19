import { useEffect } from 'react';
import { View } from 'react-native';
import { AGE } from '../../content/copy/age';
import type { RootProps } from '../../navigation/types';
import { useApp } from '../../state/store';
import { InlineLink, NavRow, PageTitle, Screen } from '../../ui/kit';
import { blockUnder13, holdsData } from './ageGate';

/**
 * Where an under-13 answer ends, on every launch after it (launch pass P0-4). No retry and no
 * way on: the one thing to open is the Privacy Policy. Should the delete not have finished (the
 * Keychain was unavailable, the app was closed partway), it runs again here.
 */
export function AgeBlockedScreen({ navigation }: RootProps<'AgeBlocked'>) {
  useEffect(() => {
    if (holdsData(useApp.getState())) blockUnder13().catch(() => {});
  }, []);

  return (
    <Screen nav={<NavRow />}>
      <PageTitle title={AGE.blocked.title} body={AGE.blocked.body} />
      <View style={{ marginTop: 20 }}>
        <InlineLink title={AGE.blocked.privacy} onPress={() => navigation.navigate('Doc', { id: 'privacy' })} />
      </View>
    </Screen>
  );
}

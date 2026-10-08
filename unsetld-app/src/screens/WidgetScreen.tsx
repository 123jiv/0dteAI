import { Image } from 'expo-image';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { checkTrustedTime } from '../services/trustedTime';
import { useApp } from '../state/store';
import { Button, NavRow, PageTitle, Screen, Segmented, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

type Tab = 'lock' | 'home';
const TABS: Tab[] = ['lock', 'home'];
const GUIDE = { lock: require('../../assets/guide/widget-lock.jpg'), home: require('../../assets/guide/widget-home.jpg') };

/** O6, and Settings › Add a widget. */
export function WidgetScreen({ navigation, route }: RootProps<'Widget'>) {
  const guide = Boolean(route.params?.guide);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('lock');
  const steps = tab === 'lock' ? COPY.widget.lockSteps : COPY.widget.homeSteps;
  const w = width - MARGIN * 2;
  const h = Math.round((w * 420) / 334);

  const finish = () => {
    if (guide) return navigation.goBack();
    useApp.getState().completeOnboarding(false);
    // Day 1 is on record already, so Today won't check the clock for it: verify it here.
    checkTrustedTime().then(t => {
      if (t.verified) useApp.getState().recordToday(true);
    });
    navigation.reset({ index: 1, routes: [{ name: 'Today' }, { name: 'Paywall', params: { from: 'onboarding' } }] });
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={guide ? undefined : '04 / 04'} />}
      footer={
        guide ? undefined : (
          <View>
            <Button title={COPY.widget.done} onPress={finish} />
            <TextButton title={COPY.widget.later} onPress={finish} style={{ marginTop: 8 }} />
          </View>
        )
      }>
      <PageTitle title={guide ? COPY.widget.pageTitle : COPY.widget.title} />
      <Segmented
        options={TABS}
        value={tab}
        onChange={setTab}
        labels={{ lock: COPY.widget.tabs[0], home: COPY.widget.tabs[1] }}
        style={{ marginTop: 16 }}
      />
      <View style={{ marginTop: 16, width: w, height: h, borderWidth: hairline, borderColor: C.rule, overflow: 'hidden', backgroundColor: '#111' }}>
        <Image
          source={GUIDE[tab]}
          style={{ width: w, height: h }}
          contentFit="cover"
          contentPosition="top"
          transition={150}
          accessibilityLabel={tab === 'lock' ? 'A lock screen with the unsetld Line widget under the clock' : 'A home screen with unsetld widgets'}
        />
      </View>
      <View style={{ marginTop: 20, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {steps.map((s, i) => (
          <View key={s} style={{ minHeight: 44, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderTopColor: C.rule }}>
            <T v="mono" style={{ width: 32 }}>
              {String(i + 1)}
            </T>
            <T v="body" style={{ flex: 1 }}>
              {s}
            </T>
          </View>
        ))}
      </View>
    </Screen>
  );
}

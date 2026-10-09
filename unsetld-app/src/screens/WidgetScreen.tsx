import { Image } from 'expo-image';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { PLATFORM } from '../content/copy/platform';
import type { RootProps } from '../navigation/types';
import { useApp } from '../state/store';
import { Button, NavRow, PageTitle, Screen, Segmented, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

const G = PLATFORM.widgetGuide;
type Tab = 'lock' | 'home';
const TABS: Tab[] = ['lock', 'home'];
const GUIDE = { lock: require('../../assets/guide/widget-lock.jpg'), home: require('../../assets/guide/widget-home.jpg') };

/** O6 (the last onboarding step), and Settings › Add a widget. */
export function WidgetScreen({ navigation, route }: RootProps<'Widget'>) {
  const guide = Boolean(route.params?.guide);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('lock');
  const steps = tab === 'lock' ? G.lockSteps : G.homeSteps;
  const w = width - MARGIN * 2;
  const h = Math.round((w * 420) / 334);

  // Onboarding ends here: today's plan is built, then Home opens under the paywall.
  const finish = () => {
    if (guide) return navigation.goBack();
    useApp.getState().completeOnboarding(false);
    navigation.reset({ index: 1, routes: [{ name: 'Today' }, { name: 'Paywall', params: { from: 'onboarding' } }] });
  };

  return (
    <Screen
      nav={<NavRow onBack={() => navigation.goBack()} step={guide ? undefined : G.step} />}
      footer={
        guide ? undefined : (
          <View>
            <Button title={G.done} onPress={finish} />
            <TextButton title={G.later} onPress={finish} style={{ marginTop: 8 }} />
          </View>
        )
      }>
      <PageTitle title={guide ? G.pageTitle : G.title} body={G.body} />
      <Segmented
        options={TABS}
        value={tab}
        onChange={setTab}
        labels={{ lock: G.tabs[0], home: G.tabs[1] }}
        style={{ marginTop: 20 }}
      />
      <View style={{ marginTop: 16, width: w, height: h, borderWidth: hairline, borderColor: C.rule, overflow: 'hidden', backgroundColor: C.raise }}>
        <Image
          source={GUIDE[tab]}
          style={{ width: w, height: h }}
          contentFit="cover"
          contentPosition="top"
          transition={150}
          accessibilityLabel={tab === 'lock' ? G.a11yLock : G.a11yHome}
        />
      </View>
      <View style={{ marginTop: 20, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {steps.map((s, i) => (
          <View key={s} style={{ minHeight: 44, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderTopColor: C.rule }}>
            <T v="mono" style={{ width: 32 }}>
              {String(i + 1).padStart(2, '0')}
            </T>
            <T v="body" style={{ flex: 1 }}>
              {s}
            </T>
          </View>
        ))}
      </View>

      <T v="label" style={{ marginTop: 32, marginBottom: 8 }}>
        {G.kindsLabel}
      </T>
      <View style={{ borderBottomWidth: hairline, borderBottomColor: C.rule }}>
        {G.kinds.map(k => (
          <View
            key={k.name}
            accessible
            accessibilityLabel={`${k.name}. ${k.body}`}
            style={{ paddingVertical: 12, borderTopWidth: hairline, borderTopColor: C.rule, gap: 4 }}>
            <T v="label" color={C.bone}>
              {k.name}
            </T>
            <T v="small" color={C.stone}>
              {k.body}
            </T>
          </View>
        ))}
      </View>
    </Screen>
  );
}

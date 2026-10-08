import { StackActions } from '@react-navigation/native';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { formatTime } from '../core/time';
import { CHAPTER_BY_ID, VOLUME } from '../content';
import { COPY } from '../content/copy';
import { newNonce } from '../navigation/nonce';
import type { RootProps } from '../navigation/types';
import { restore } from '../services/purchases';
import { useAccessEnabled, useApp, useEntitlements } from '../state/store';
import { showDialog } from '../ui/actions';
import { Footnote, NavRow, PageTitle, SectionHeader, SettingsRow, Toggle } from '../ui/kit';
import { T } from '../ui/text';
import { MARGIN } from '../ui/tokens';

const S = COPY.settings;

function renewText(plan: string | null, renews: string | null): string {
  if (!plan) return S.free;
  const name = plan === 'annual' ? 'Annual' : plan === 'monthly' ? 'Monthly' : 'Lifetime';
  if (plan === 'lifetime' || !renews) return name;
  const d = new Date(renews);
  if (Number.isNaN(d.getTime())) return name;
  return `${name}, renews ${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

export function SettingsScreen({ navigation }: RootProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const saved = useApp(s => s.reading.saved.length);
  const yours = useApp(s => s.yourLines.length);
  const account = useApp(s => s.account);
  const premium = useApp(s => s.premium);
  const ent = useEntitlements();
  const accessEnabled = useAccessEnabled();

  const r = settings.reminders;
  const reminders = r.on ? S.remindersValue(Math.min(r.count, ent.maxReminders), formatTime(r.first), formatTime(r.last)) : 'Off';
  const standard = settings.standard.length ? `${settings.standard[0]}${settings.standard.length > 1 ? ` +${settings.standard.length - 1}` : ''}` : '';
  const chapters = ent.mix.map(c => CHAPTER_BY_ID[c].name).join(', ');
  const openInReader = (sheet: 'chapters' | 'colorway') =>
    navigation.dispatch(StackActions.popTo('Today', { sheet, nonce: newNonce() }));

  const doRestore = async () => {
    try {
      const res = await restore();
      if (res.premium) {
        useApp.getState().setPremium({ active: true });
        showDialog(COPY.paywall.restored);
      } else showDialog(COPY.paywall.noneTitle, COPY.paywall.noneBody);
    } catch {
      showDialog(COPY.paywall.noneTitle, COPY.paywall.noneBody);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <NavRow onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: MARGIN }}>
          <PageTitle title={S.title} />
        </View>

        <SectionHeader>{S.sections.daily}</SectionHeader>
        <SettingsRow first title={S.reminders} value={reminders} onPress={() => navigation.navigate('Day', { edit: true })} />
        <SettingsRow
          title={S.night}
          value={settings.night.on ? formatTime(settings.night.time) : undefined}
          chevron={false}
          onPress={() => navigation.navigate('Day', { edit: true })}
          right={<Toggle value={settings.night.on} onChange={on => update({ night: { ...settings.night, on } })} label={S.night} />}
        />
        <SettingsRow title={S.standard} value={standard} onPress={() => navigation.navigate('Standard', { edit: true })} />

        <SectionHeader>{S.sections.reading}</SectionHeader>
        <SettingsRow first title={S.chapters} value={chapters} onPress={() => openInReader('chapters')} />
        <SettingsRow title={S.colorway} value={ent.colorway.name} onPress={() => openInReader('colorway')} />
        <SettingsRow
          title={S.strong}
          chevron={false}
          right={<Toggle value={settings.strongLanguage} onChange={v => update({ strongLanguage: v })} label={S.strong} />}
        />
        <Footnote>{S.strongNote}</Footnote>
        <View style={{ height: 8 }} />
        <SettingsRow first title={S.saved} value={String(saved)} onPress={() => navigation.navigate('Saved')} />
        <SettingsRow title={S.yourLines} value={ent.premium ? String(yours) : 'Full Edition'} onPress={() => navigation.navigate('YourLines')} />

        <SectionHeader>{S.sections.widgets}</SectionHeader>
        <SettingsRow first title={S.addWidget} onPress={() => navigation.navigate('Widget', { guide: true })} />

        <SectionHeader>{S.sections.unsetld}</SectionHeader>
        <SettingsRow
          first
          title={S.dropAlerts}
          chevron={false}
          right={<Toggle value={settings.dropAlerts} onChange={v => update({ dropAlerts: v })} label={S.dropAlerts} />}
        />
        <Footnote>{S.dropNote}</Footnote>
        {accessEnabled ? (
          <>
            <View style={{ height: 8 }} />
            <SettingsRow first title={S.account} value={account.email ?? (account.userId ? 'Signed in' : S.notSignedIn)} onPress={() => navigation.navigate('Account')} />
          </>
        ) : null}

        <SectionHeader>{S.sections.full}</SectionHeader>
        <SettingsRow
          first
          title={S.plan}
          value={premium.active ? renewText(premium.plan, premium.renews) : S.free}
          onPress={() =>
            premium.active && premium.plan !== 'lifetime' && premium.mode === 'revenuecat'
              ? Linking.openURL(AppConfig.manageSubscriptionsUrl).catch(() => {})
              : !premium.active
                ? navigation.navigate('Paywall', { from: 'settings' })
                : undefined
          }
        />
        <SettingsRow title={S.restore} chevron={false} onPress={doRestore} />

        <SectionHeader>{S.sections.about}</SectionHeader>
        <SettingsRow first title={S.record} onPress={() => navigation.navigate('Doc', { id: 'record' })} />
        {accessEnabled ? <SettingsRow title={S.accessTerms} onPress={() => navigation.navigate('Doc', { id: 'access' })} /> : null}
        <SettingsRow
          title={S.contact}
          value={S.contactEmail}
          chevron={false}
          onPress={() => Linking.openURL(`mailto:${S.contactEmail}`).catch(() => {})}
        />
        <SettingsRow title={S.terms} onPress={() => navigation.navigate('Doc', { id: 'terms' })} />
        <SettingsRow title={S.privacy} onPress={() => navigation.navigate('Doc', { id: 'privacy' })} />

        {IS_PREVIEW ? (
          <>
            <SectionHeader>{S.sections.tester}</SectionHeader>
            <SettingsRow first title={S.devTools} onPress={() => navigation.navigate('DevTools')} />
          </>
        ) : null}

        <T v="mono.s" style={{ marginTop: 40, paddingHorizontal: MARGIN }}>
          {S.footer(AppConfig.version, VOLUME)}
        </T>
      </ScrollView>
    </View>
  );
}

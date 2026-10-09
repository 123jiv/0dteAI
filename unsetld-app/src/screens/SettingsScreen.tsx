import { StackActions } from '@react-navigation/native';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfig, IS_PREVIEW } from '../config/app';
import { photosToClear } from '../core/proofs';
import { formatTime } from '../core/time';
import type { Profile } from '../core/types';
import { DOCS, RULES, TRACK_BY_ID } from '../content';
import { PLATFORM } from '../content/copy/platform';
import { newNonce } from '../navigation/nonce';
import type { RootProps } from '../navigation/types';
import { today } from '../services/clock';
import { deletePhoto } from '../services/proof';
import { restore } from '../services/purchases';
import { useStreak } from '../state/missions';
import { useAccessEnabled, useApp, useEntitlements } from '../state/store';
import { showDialog } from '../ui/actions';
import { Footnote, InlineLink, NavRow, PageTitle, SectionHeader, Segmented, SettingsRow, Toggle } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';
import { enableDropAlerts } from './access';

const S = PLATFORM.settings;
/** Settings → Proof photos: 30 days, 1 year, or keep (0). */
const RETENTION: readonly number[] = [30, 365, 0];

function renewText(plan: string | null, renews: string | null): string {
  if (!plan) return S.free;
  const name = S.planName[plan] ?? S.free;
  if (plan === 'lifetime' || !renews) return name;
  const d = new Date(renews);
  if (Number.isNaN(d.getTime())) return name;
  return S.renews(name, `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`);
}

/** About you asks six things: school, work, business or project, gym, age, and what they're learning. */
const ABOUT_QUESTIONS = 6;

/** How many of the About you questions have an answer. Learning counts once a skill is picked. */
function answered(p: Profile): number {
  const yesNo = [p.school, p.work, p.project, p.gym, p.age].filter(v => v !== null && v !== undefined).length;
  return yesNo + ((p.skills ?? []).length > 0 ? 1 : 0);
}

export function SettingsScreen({ navigation }: RootProps<'Settings'>) {
  const insets = useSafeAreaInsets();
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const profile = useApp(s => s.profile);
  const account = useApp(s => s.account);
  const premium = useApp(s => s.premium);
  const day = useApp(s => s.currentDay);
  const streak = useStreak(day);
  const ent = useEntitlements();
  const accessEnabled = useAccessEnabled();
  const [dropPermOff, setDropPermOff] = useState(false);

  const r = settings.reminders;
  const reminders = r.on ? S.remindersValue(Math.min(r.count, ent.maxReminders), formatTime(r.first), formatTime(r.last)) : S.remindersOff;
  const areaNames = profile.tracks.map(t => TRACK_BY_ID[t]?.short).filter((x): x is string => Boolean(x));
  const retention = RETENTION.includes(settings.proofRetentionDays) ? settings.proofRetentionDays : RETENTION[0];

  const openColorway = () => navigation.dispatch(StackActions.popTo('Today', { sheet: 'colorway', nonce: newNonce() }));

  const doRestore = async () => {
    try {
      const res = await restore();
      if (res.premium) {
        useApp.getState().setPremium({ active: true });
        showDialog(S.restored);
      } else showDialog(S.noneTitle, S.noneBody);
    } catch {
      showDialog(S.restoreFailed);
    }
  };

  // Turning drop alerts on asks for notification permission first; when it's off, the switch stays off.
  const setDropAlerts = async (on: boolean) => {
    setDropPermOff(false);
    if (!on) return update({ dropAlerts: false });
    setDropPermOff((await enableDropAlerts()) === 'notifications-off');
  };

  // A shorter keep time deletes the older photos now, so it asks first when there are any.
  const setRetention = (days: number) => {
    const apply = () => {
      useApp.getState().updateSettings({ proofRetentionDays: days });
      for (const uri of useApp.getState().expireProofPhotos()) deletePhoto(uri);
    };
    const clear = photosToClear(useApp.getState().record, days, today());
    if (!clear.length) return apply();
    showDialog(S.clearTitle(clear.length), S.clearBody(S.retentionSpan[String(days)] ?? ''), [
      { label: S.clearNo, cancel: true },
      { label: S.clearYes, destructive: true, onPress: apply },
    ]);
  };

  const planAction =
    premium.active && premium.plan !== 'lifetime' && premium.mode === 'revenuecat'
      ? () => {
          Linking.openURL(AppConfig.manageSubscriptionsUrl).catch(() => {});
        }
      : !premium.active
        ? () => navigation.navigate('Paywall', { from: 'settings' })
        : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: MARGIN }}>
          <PageTitle title={S.title} />
        </View>

        <SectionHeader>{S.sections.plan}</SectionHeader>
        <SettingsRow
          first
          title={S.tracks}
          value={S.tracksValue(areaNames)}
          accessibilityLabel={S.tracksA11y(areaNames)}
          onPress={() => navigation.navigate('Tracks', { edit: true })}
        />
        <SettingsRow
          title={S.aboutYou}
          value={S.aboutValue(answered(profile), ABOUT_QUESTIONS)}
          onPress={() => navigation.navigate('AboutYou', { edit: true })}
        />
        <SettingsRow
          title={S.pace}
          value={S.paceValue(profile.minutes, profile.intensity)}
          onPress={() => navigation.navigate('Pace', { edit: true })}
        />
        <Footnote>{S.planNote}</Footnote>

        <SectionHeader>{S.sections.reminders}</SectionHeader>
        <SettingsRow first title={S.reminders} value={reminders} onPress={() => navigation.navigate('Day', { edit: true })} />
        <Footnote>{S.remindersNote}</Footnote>

        <SectionHeader>{S.sections.streak}</SectionHeader>
        <SettingsRow first title={S.offDays} value={S.offDaysValue(streak.offDays, RULES.offDayMax)} chevron={false} />
        <Footnote>{S.offDayNote}</Footnote>

        <SectionHeader>{S.sections.proof}</SectionHeader>
        <View style={{ paddingHorizontal: MARGIN, paddingTop: 4, paddingBottom: 12 }}>
          <T v="small" color={C.stone} style={{ marginBottom: 10 }}>
            {S.retentionLabel}
          </T>
          <Segmented
            options={RETENTION}
            value={retention}
            onChange={setRetention}
            labels={S.retention}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
        <SettingsRow first title={S.gallery} onPress={() => navigation.navigate('ProofGallery')} />
        <Footnote>{S.retentionNote}</Footnote>

        <SectionHeader>{S.sections.look}</SectionHeader>
        <SettingsRow first title={S.colorway} value={ent.colorway.name} onPress={openColorway} />
        <SettingsRow title={S.addWidget} onPress={() => navigation.navigate('Widget', { guide: true })} />

        <SectionHeader>{S.sections.unsetld}</SectionHeader>
        <SettingsRow
          first
          title={S.dropAlerts}
          chevron={false}
          right={<Toggle value={settings.dropAlerts} onChange={setDropAlerts} label={S.dropAlerts} />}
        />
        {dropPermOff ? (
          <View style={{ marginHorizontal: MARGIN, paddingVertical: 12, borderBottomWidth: hairline, borderColor: C.rule, gap: 4 }}>
            <T v="small">{S.permOff}</T>
            <InlineLink title={S.openSettings} v="note" onPress={() => Linking.openSettings().catch(() => {})} />
          </View>
        ) : null}
        <Footnote>{S.dropNote}</Footnote>
        {accessEnabled || account.userId ? (
          <>
            <View style={{ height: 8 }} />
            <SettingsRow
              first
              title={S.account}
              value={account.email ?? (account.userId ? S.signedInApple : S.notSignedIn)}
              onPress={() => navigation.navigate('Account')}
            />
          </>
        ) : null}

        <SectionHeader>{S.sections.full}</SectionHeader>
        <SettingsRow first title={S.plan} value={premium.active ? renewText(premium.plan, premium.renews) : S.free} onPress={planAction} />
        <SettingsRow title={S.restore} chevron={false} onPress={doRestore} />

        <SectionHeader>{S.sections.about}</SectionHeader>
        <SettingsRow first title={DOCS.record.title} onPress={() => navigation.navigate('Doc', { id: 'record' })} />
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
          {S.footer(AppConfig.version)}
        </T>
      </ScrollView>
    </View>
  );
}

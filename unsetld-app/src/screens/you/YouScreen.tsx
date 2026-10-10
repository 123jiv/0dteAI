import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfig, IS_PREVIEW } from '../../config/app';
import { focusFor } from '../../core/personalize';
import { programDay } from '../../core/programs';
import { photosToClear } from '../../core/proofs';
import { weekStart } from '../../core/review';
import { formatTime } from '../../core/time';
import type { Profile, TrackId, WeeklyFocus } from '../../core/types';
import { DOCS, PROGRAM_BY_ID, TRACK_BY_ID } from '../../content';
import { FOCUS } from '../../content/copy/focus';
import { PLATFORM } from '../../content/copy/platform';
import { newNonce } from '../../navigation/nonce';
import type { TabProps } from '../../navigation/types';
import { today } from '../../services/clock';
import { deletePhoto } from '../../services/proof';
import { restore } from '../../services/purchases';
import { useAccessEnabled, useApp, useEntitlements } from '../../state/store';
import { showDialog } from '../../ui/actions';
import { Card, LinkRow, SectionLabel } from '../../ui/blocks';
import { InlineLink, Segmented, Toggle } from '../../ui/kit';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';
import { enableDropAlerts } from '../access';

const S = PLATFORM.you;
/** Proof photos: 30 days, 1 year, or keep (0). */
const RETENTION: readonly number[] = [30, 365, 0];
/** "What are you learning?" is only asked with one of these areas (About you). */
const LEARNING_AREAS: readonly TrackId[] = ['skills', 'projects', 'career'];

function renewText(plan: string | null, renews: string | null): string {
  const name = plan ? S.planName[plan] ?? S.member : S.member;
  if (!plan || plan === 'lifetime' || !renews) return name;
  const d = new Date(renews);
  if (Number.isNaN(d.getTime())) return name;
  return S.renews(name, `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`);
}

/**
 * The About you questions this profile is asked: school, work, business or project, gym and age;
 * High school or college? after a yes to school; What are you learning? with Skills, Projects or Career.
 */
function aboutQuestions(p: Profile): number {
  return 5 + (p.school === true ? 1 : 0) + (p.tracks.some(t => LEARNING_AREAS.includes(t)) ? 1 : 0);
}

/** How many of them have an answer. Learning counts once a skill is picked. */
function answered(p: Profile): number {
  const yesNo = [p.school, p.work, p.project, p.gym, p.age].filter(v => v !== null && v !== undefined).length;
  const learning = p.tracks.some(t => LEARNING_AREAS.includes(t)) && (p.skills ?? []).length > 0 ? 1 : 0;
  return yesNo + learning + (p.school === true && p.schoolLevel ? 1 : 0);
}

/** This week's focus in the user's words, or null when none is set for this week. */
function focusLabel(focus: WeeklyFocus | null): string | null {
  if (!focus) return null;
  if (focus.id === 'other') return focus.text?.trim() || FOCUS.options.other;
  return FOCUS.options[focus.id] ?? null;
}

/** A kicker, then one card of rows, then an optional note. No rules: the card is the group. */
function Group({ label, note, first, children }: { label: string; note?: string; first?: boolean; children: ReactNode }) {
  return (
    <View style={{ marginTop: first ? GAP.block : GAP.section - 4 }}>
      <SectionLabel>{label}</SectionLabel>
      <Card padding={0} style={{ paddingHorizontal: 18, paddingVertical: 4 }}>
        {children}
      </Card>
      {note ? (
        <T v="note" color={C.stone} style={{ marginTop: 10 }}>
          {note}
        </T>
      ) : null}
    </View>
  );
}

/** A row that does something in place (restore, write to us) or only says something: no chevron. */
function ActionRow({ title, detail, onPress }: { title: string; detail?: string; onPress?: () => void }) {
  const body = (
    <View style={{ flex: 1, minWidth: 0 }}>
      <T v="row">{title}</T>
      {detail ? (
        <T v="note" color={C.stone} style={{ marginTop: 2 }}>
          {detail}
        </T>
      ) : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={[title, detail].filter(Boolean).join('. ')} style={{ paddingVertical: 14 }}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => ({ paddingVertical: 14, minHeight: 44, flexDirection: 'row', opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

/** A switch with its words. The switch carries the label, so VoiceOver reads it once. */
function ToggleRow({ title, detail, value, onChange }: { title: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
      <View style={{ flex: 1, minWidth: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <T v="row">{title}</T>
        {detail ? (
          <T v="note" color={C.stone} style={{ marginTop: 2 }}>
            {detail}
          </T>
        ) : null}
      </View>
      <Toggle value={value} onChange={onChange} label={detail ? `${title}. ${detail}` : title} />
    </View>
  );
}

/** The You tab: goals, your day, membership, appearance, proof photos, account and help. Settings live here. */
export function YouScreen({ navigation }: TabProps<'You'>) {
  const insets = useSafeAreaInsets();
  const settings = useApp(s => s.settings);
  const update = useApp(s => s.updateSettings);
  const profile = useApp(s => s.profile);
  const account = useApp(s => s.account);
  const premium = useApp(s => s.premium);
  const program = useApp(s => s.program);
  const day = useApp(s => s.currentDay);
  const ent = useEntitlements();
  const accessEnabled = useAccessEnabled();
  const [dropPermOff, setDropPermOff] = useState(false);

  const r = settings.reminders;
  const reminders = r.on ? S.remindersValue(Math.min(r.count, ent.maxReminders), formatTime(r.first), formatTime(r.last)) : S.remindersOff;
  const areaNames = profile.tracks.map(t => TRACK_BY_ID[t]?.short).filter((x): x is string => Boolean(x));
  const retention = RETENTION.includes(settings.proofRetentionDays) ? settings.proofRetentionDays : RETENTION[0];
  const goal = profile.goal?.trim() || null;
  const focus = focusLabel(focusFor(profile, weekStart(day)));
  const plan = program && !program.finishedDay ? PROGRAM_BY_ID[program.id] : undefined;
  const planDay = plan && program ? programDay(plan, program, day) : null;

  const openColorway = () => navigation.navigate('Today', { sheet: 'colorway', nonce: newNonce() });

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

  // A member manages a store subscription with Apple; a lifetime or preview membership has nothing to manage.
  const manage =
    premium.active && premium.plan !== 'lifetime' && premium.mode === 'revenuecat'
      ? () => {
          Linking.openURL(AppConfig.manageSubscriptionsUrl).catch(() => {});
        }
      : undefined;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.ink }}
      contentContainerStyle={{ paddingTop: insets.top + 28, paddingHorizontal: MARGIN, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}>
      <T v="title.l" accessibilityRole="header">
        {S.title}
      </T>

      <Group first label={S.sections.goals} note={S.goalsNote}>
        <LinkRow
          title={S.areas}
          detail={S.areasValue(areaNames)}
          onPress={() => navigation.navigate('Tracks', { edit: true })}
        />
        <LinkRow title={S.goal} detail={goal ?? S.notSet} onPress={() => navigation.navigate('Goal', { edit: true })} />
        <LinkRow title={S.focus} detail={focus ?? S.notSet} onPress={() => navigation.navigate('WeeklyFocus')} />
        <LinkRow
          title={S.aboutYou}
          detail={S.aboutValue(answered(profile), aboutQuestions(profile))}
          onPress={() => navigation.navigate('AboutYou', { edit: true })}
        />
        <LinkRow
          title={S.pace}
          detail={S.paceValue(profile.minutes, profile.intensity)}
          onPress={() => navigation.navigate('Pace', { edit: true })}
        />
      </Group>

      <Group label={S.sections.day}>
        <LinkRow
          title={S.plans}
          detail={plan && planDay ? S.planActive(plan.title, planDay, plan.days) : S.plansValue}
          onPress={() => navigation.navigate('Plans')}
        />
        <LinkRow title={S.reminders} detail={reminders} onPress={() => navigation.navigate('Day', { edit: true })} />
        {/* Drops only matter once rewards and access are on; someone who turned alerts on can always turn them off. */}
        {accessEnabled || settings.dropAlerts ? (
          <ToggleRow title={S.dropAlerts} detail={S.dropNote} value={settings.dropAlerts} onChange={setDropAlerts} />
        ) : null}
        {dropPermOff ? (
          <View style={{ paddingBottom: 14, gap: 4 }}>
            <T v="small">{S.permOff}</T>
            <InlineLink title={S.openSettings} v="note" onPress={() => Linking.openSettings().catch(() => {})} />
          </View>
        ) : null}
      </Group>

      <Group label={S.sections.membership}>
        {premium.active ? (
          manage ? (
            <LinkRow title={S.plus} detail={renewText(premium.plan, premium.renews)} onPress={manage} />
          ) : (
            <ActionRow title={S.plus} detail={renewText(premium.plan, premium.renews)} />
          )
        ) : (
          <LinkRow title={S.plus} detail={S.plusPitch} onPress={() => navigation.navigate('Paywall', { from: 'settings' })} />
        )}
        <ActionRow title={S.restore} onPress={doRestore} />
      </Group>

      <Group label={S.sections.appearance}>
        <LinkRow title={S.colorway} detail={ent.colorway.name} onPress={openColorway} />
        <LinkRow title={S.widgets} detail={S.widgetsValue} onPress={() => navigation.navigate('Widget', { guide: true })} />
      </Group>

      <Group label={S.sections.proof} note={S.retentionNote}>
        <LinkRow title={S.proofHistory} detail={S.proofHistoryValue} onPress={() => navigation.navigate('ProofHistory')} />
        <View style={{ paddingTop: 10, paddingBottom: 16 }}>
          <T v="row" style={{ marginBottom: 12 }}>
            {S.retentionLabel}
          </T>
          <Segmented options={RETENTION} value={retention} onChange={setRetention} labels={S.retention} style={{ alignSelf: 'stretch' }} />
        </View>
      </Group>

      {accessEnabled || account.userId ? (
        <Group label={S.sections.account}>
          <LinkRow
            title={S.account}
            detail={account.email ?? (account.userId ? S.signedInApple : `${S.notSignedIn}. ${S.accountNote}`)}
            onPress={() => navigation.navigate('Account')}
          />
        </Group>
      ) : null}

      <Group label={S.sections.help}>
        <LinkRow title={DOCS.record.title} onPress={() => navigation.navigate('Doc', { id: 'record' })} />
        {accessEnabled ? <LinkRow title={S.accessTerms} onPress={() => navigation.navigate('Doc', { id: 'access' })} /> : null}
        <LinkRow title={S.terms} onPress={() => navigation.navigate('Doc', { id: 'terms' })} />
        <LinkRow title={S.privacy} onPress={() => navigation.navigate('Doc', { id: 'privacy' })} />
        <ActionRow title={S.contact} detail={S.contactEmail} onPress={() => Linking.openURL(`mailto:${S.contactEmail}`).catch(() => {})} />
      </Group>

      {IS_PREVIEW ? (
        <Group label={S.sections.tester}>
          <LinkRow title={S.devTools} detail={S.devToolsValue} onPress={() => navigation.navigate('DevTools')} />
        </Group>
      ) : null}

      <T v="mono.s" style={{ marginTop: GAP.section }}>
        {S.footer(AppConfig.version)}
      </T>
    </ScrollView>
  );
}

import { useEffect, useState } from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { milestoneStatus, type MilestoneId, type MilestoneStatus } from '../core/record';
import { milestoneNo } from '../core/typography';
import { MILESTONES } from '../content';
import { REWARDS_COPY } from '../content/copy/rewards';
import type { RootProps } from '../navigation/types';
import { useDrops } from '../state/lifecycle';
import { useAccessEnabled, useApp } from '../state/store';
import { Button, InlineLink, NavRow, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C } from '../ui/tokens';
import { accessDays, accessRecord, earlyDrop, enableDropAlerts, nextDropChange, runMilestoneAction, type ActionResult } from './access';

const R = REWARDS_COPY;

/** OPEN / USED / PAUSED / 12 DAYS: the same words on Rewards and here. */
export function milestoneStatusText(s: MilestoneStatus): string {
  switch (s.kind) {
    case 'open':
      return R.milestoneStatus.open;
    case 'used':
      return R.milestoneStatus.used;
    case 'paused':
      return R.milestoneStatus.paused;
    case 'locked':
      return R.milestoneStatus.left(s.daysLeft);
  }
}

/** No line for 'used': only the patch can be used, and its status then reads USED. */
export function errorText(r: ActionResult): string | null {
  if (r === 'paused') return R.milestone.pausedError;
  if (r === 'network') return R.milestone.networkError;
  if (r === 'notifications-off') return R.milestone.notificationsOff;
  return null;
}

/** The error under an action, with Open Settings when notifications are off. */
export function ActionError({ result, style }: { result: ActionResult | null; style?: StyleProp<ViewStyle> }) {
  const text = result ? errorText(result) : null;
  if (!text) return null;
  return (
    <View style={[{ gap: 4 }, style]}>
      <T v="note" color={C.stone} accessibilityLiveRegion="polite">
        {text}
      </T>
      {result === 'notifications-off' ? (
        <InlineLink title={R.milestone.openSettings} v="note" onPress={() => Linking.openSettings().catch(() => {})} />
      ) : null}
    </View>
  );
}

/**
 * One Access milestone (early access, the patch, the 365 piece): what it is,
 * its status, and one action when there is one. Its days are active days, the
 * days a mission was proven.
 */
export function MilestoneScreen({ navigation, route }: RootProps<'Milestone'>) {
  const id = route.params.id as MilestoneId;
  const m = MILESTONES.find(x => x.id === id)!;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const dropAlerts = useApp(s => s.settings.dropAlerts);
  const drops = useDrops(s => s.drops);
  const accessEnabled = useAccessEnabled();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const status = milestoneStatus(accessRecord(record), m, day);
  const proven = accessDays(record);

  // Real time for the drop windows, moved on when one opens or closes while this page is up.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const next = nextDropChange(drops, now);
    if (next === null) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(0, next - Date.now() + 500), 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [drops, now]);

  // Early access opens the drop that's open early now; with none, it turns on
  // drop alerts (until they're on). Claims need an account.
  const drop = id === 'early-access' && accessEnabled ? earlyDrop(drops, now) : null;
  const claims = id !== 'early-access' || drop !== null;
  const showAction = status.kind === 'open' && (claims || !dropAlerts);
  const needsAccount = claims && !signedIn;

  const act = async () => {
    if (needsAccount) return navigation.navigate('Account');
    setBusy(true);
    setResult(null);
    const r = claims ? await runMilestoneAction(id) : await enableDropAlerts();
    setBusy(false);
    if (r === 'needs-account') navigation.navigate('Account');
    else setResult(r);
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="mono" color={status.kind === 'locked' ? C.stone : C.bone}>
          {milestoneNo(m.day)}
        </T>
        <T v="label" color={status.kind === 'open' ? C.bone : C.stone}>
          {milestoneStatusText(status)}
        </T>
      </View>
      <T v="title.xl" style={{ marginTop: 12 }} accessibilityRole="header">
        {m.title}
      </T>
      <T v="body" style={{ marginTop: 16 }}>
        {m.detail}
      </T>
      {status.kind === 'locked' ? (
        <View style={{ marginTop: 24, gap: 8 }} accessible accessibilityLabel={R.milestone.progressA11y(proven, m.day)}>
          <View style={{ height: 2, backgroundColor: C.rule }}>
            <View style={{ height: 2, width: `${Math.min(100, (proven / m.day) * 100)}%`, backgroundColor: C.bone }} />
          </View>
          <T v="mono">{R.milestone.progress(proven, m.day)}</T>
        </View>
      ) : null}
      {status.kind === 'paused' ? (
        <T v="note" color={C.stone} style={{ marginTop: 16 }}>
          {R.pausedNote}
        </T>
      ) : null}
      {showAction ? (
        <View style={{ marginTop: 32, gap: 12 }}>
          {needsAccount ? (
            <T v="note" color={C.stone}>
              {R.milestone.signInNote}
            </T>
          ) : null}
          <Button title={drop ? R.milestone.openDrop(drop.collection) : m.action} onPress={act} disabled={busy} />
          <ActionError result={result} />
        </View>
      ) : null}
      <TextButton title={R.milestone.termsLink} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: 16 }} />
    </Screen>
  );
}

import { useEffect, useState } from 'react';
import { Linking, View, type StyleProp, type ViewStyle } from 'react-native';
import { accessState, REOPEN_AFTER } from '../core/record';
import { isKnownStatus, statusState } from '../core/rewards';
import { DOCS } from '../content';
import { REWARDS_COPY } from '../content/copy/rewards';
import type { RootProps } from '../navigation/types';
import { STATUS_DEFAULTS } from '../services/access';
import { useDrops } from '../state/lifecycle';
import { useAccessEnabled, useApp } from '../state/store';
import { Card, Meter } from '../ui/blocks';
import { Button, InlineLink, NavRow, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, GAP } from '../ui/tokens';
import { accessDays, accessRecord, earlyDrop, enableDropAlerts, findStatus, nextDropChange, runMilestoneAction, useStatusTiers, type ActionResult } from './access';
import { LINING } from './rewards/redeem';
import { statusStateText } from './rewards/StatusScreen';

const R = REWARDS_COPY;

/** No line for 'used': only the patch can be used, and its status then reads Used. */
export function errorText(r: ActionResult): string | null {
  if (r === 'paused') {
    const s = useApp.getState();
    return R.milestone.pausedError(Math.max(1, REOPEN_AFTER - accessState(accessRecord(s.record), s.currentDay).reopenProgress));
  }
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
 * One UNSETLD status tier: what it is, where it stands, and one action when there is one
 * (early access: drop alerts, or the drop that's open early now; the patch and the 365
 * piece: claim at unsetld.com). Its days are active days, the days a mission was proven.
 * A tier the app doesn't know (added in the status config) is shown without an action.
 */
export function MilestoneScreen({ navigation, route }: RootProps<'Milestone'>) {
  const tiers = useStatusTiers();
  // An id that isn't a tier (an old link) falls back to the first one rather than crashing.
  const m = findStatus(tiers, route.params?.id ?? '') ?? tiers[0] ?? STATUS_DEFAULTS[0];
  const known = isKnownStatus(m.id) ? m.id : null;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const dropAlerts = useApp(s => s.settings.dropAlerts);
  const drops = useDrops(s => s.drops);
  const accessEnabled = useAccessEnabled();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const ar = accessRecord(record);
  const status = statusState(ar, m, day);
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
  // drop alerts (until they're on). Claims need an account. Display-only tiers have no action,
  // and neither does a tier the status config switched off (an old link or alert still opens it).
  const inEffect = tiers.some(t => t.id === m.id);
  const drop = known === 'early-access' && accessEnabled && inEffect ? earlyDrop(drops, now) : null;
  const claims = known !== 'early-access' || drop !== null;
  const showAction = known !== null && inEffect && Boolean(m.action) && status.kind === 'open' && (claims || !dropAlerts);
  const needsAccount = claims && !signedIn;

  const act = async () => {
    if (!known) return;
    if (needsAccount) return navigation.navigate('Account');
    setBusy(true);
    setResult(null);
    let r: ActionResult;
    try {
      r = claims ? await runMilestoneAction(known) : await enableDropAlerts();
    } catch {
      r = 'network';
    } finally {
      setBusy(false);
    }
    if (r === 'needs-account') navigation.navigate('Account');
    else setResult(r);
  };

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} />}>
      <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <T v="kicker" color={C.stone}>
          {R.status.tierKicker(m.day)}
        </T>
        <T v="meta" color={status.kind === 'open' ? C.bone : C.stone}>
          {statusStateText(status, m)}
        </T>
      </View>
      <T v="title.xl" style={[LINING, { marginTop: 12 }]} accessibilityRole="header">
        {m.title}
      </T>
      {m.detail ? (
        <T v="body" color={C.muted} style={{ marginTop: 16 }}>
          {m.detail}
        </T>
      ) : null}
      {status.kind === 'locked' ? (
        <Card style={{ marginTop: GAP.block }}>
          <View accessible accessibilityLabel={R.milestone.progressA11y(proven, m.day)}>
            <Meter value={proven} max={m.day} />
            <T v="meta" color={C.stone} style={{ marginTop: 10 }}>
              {R.milestone.progress(proven, m.day)}
            </T>
          </View>
        </Card>
      ) : null}
      {status.kind === 'paused' ? (
        <T v="note" color={C.stone} style={{ marginTop: 16 }}>
          {R.status.pausedNote(Math.max(1, REOPEN_AFTER - accessState(ar, day).reopenProgress))}
        </T>
      ) : null}
      {showAction ? (
        <View style={{ marginTop: 32, gap: 12 }}>
          {needsAccount ? (
            <T v="note" color={C.stone}>
              {R.milestone.signInNote}
            </T>
          ) : null}
          <Button title={drop ? R.milestone.openDrop(drop.collection) : (m.action ?? '')} onPress={act} disabled={busy} />
          <ActionError result={result} />
        </View>
      ) : null}
      <TextButton title={DOCS.access.title} align="left" onPress={() => navigation.navigate('Doc', { id: 'access' })} style={{ marginTop: 16 }} />
    </Screen>
  );
}

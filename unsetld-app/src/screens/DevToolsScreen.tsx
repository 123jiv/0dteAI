import { View } from 'react-native';
import { checkIn, completeMission, rankOf, setNonNegotiable } from '../core/rank';
import { addDays, dayKey } from '../core/time';
import { RANK_CONFIG } from '../content';
import type { RootProps } from '../navigation/types';
import { today } from '../services/clock';
import { purchaseMode } from '../services/purchases';
import { useApp } from '../state/store';
import { Button, Card, Header, Screen, SectionLabel, T, ToggleRow } from '../ui/components';
import { space } from '../ui/theme';

/**
 * Tester tools (dev and preview builds only): time travel so streaks, rank-ups,
 * shields and decay can be tested in minutes instead of months.
 */
export function DevToolsScreen({ navigation }: RootProps<'DevTools'>) {
  const offset = useApp(s => s.dayOffset);
  const setOffset = useApp(s => s.setDayOffset);
  const progress = useApp(s => s.progress);
  const premium = useApp(s => s.premium);
  const setPremium = useApp(s => s.setPremium);
  const restoreProgress = useApp(s => s.restoreProgress);
  const pushToast = useApp(s => s.pushToast);
  const update = useApp(s => s.updateSettings);
  const rank = rankOf(RANK_CONFIG, progress.rankXP);

  /** Fast-forward n days, doing the daily work each day (or only opening the app). */
  const grind = (n: number, full: boolean) => {
    let p = useApp.getState().progress;
    let off = offset;
    for (let i = 0; i < n; i++) {
      off += 1;
      const d = addDays(dayKey(new Date()), off);
      p = checkIn(p, RANK_CONFIG, d, { verified: false }).progress;
      if (full) {
        p = setNonNegotiable(p, RANK_CONFIG, d, 'Train').progress;
        p = completeMission(p, RANK_CONFIG, d, 'm-001').progress;
      }
    }
    setOffset(off);
    restoreProgress(p);
    pushToast(`Jumped ${n} days. ${p.rankXP} XP, ${p.streak}-day streak.`, 'info');
  };

  return (
    <Screen scroll>
      <Header title="Tester tools" onBack={() => navigation.goBack()} />
      <Card>
        <T variant="label">Pretend today is</T>
        <T variant="h2" style={{ marginTop: 4 }}>{`${today()}  (${offset >= 0 ? '+' : ''}${offset} days)`}</T>
        <T variant="caption" style={{ marginTop: 4 }}>{`${rank.name} · ${progress.rankXP} XP · streak ${progress.streak} · lifetime ${progress.lifetimeXP}`}</T>
      </Card>

      <SectionLabel>Time travel</SectionLabel>
      <View style={{ gap: space.sm }}>
        <Button title="Next day (then open Today)" variant="secondary" onPress={() => setOffset(offset + 1)} />
        <Button title="Grind 7 days (full daily work)" variant="secondary" onPress={() => grind(7, true)} />
        <Button title="Grind 30 days (full daily work)" variant="secondary" onPress={() => grind(30, true)} />
        <Button title="Grind 30 days (only opening the app)" variant="secondary" onPress={() => grind(30, false)} />
        <Button title="Disappear for 5 days" variant="secondary" onPress={() => setOffset(offset + 5)} />
        <Button title="Disappear for 14 days" variant="secondary" onPress={() => setOffset(offset + 14)} />
        <Button title="Back to real today" variant="ghost" onPress={() => setOffset(0)} />
      </View>
      <T variant="caption" style={{ marginTop: space.sm }}>
        After skipping days, open the Today tab: shields, grace and decay apply on the next check-in.
      </T>

      <SectionLabel>Flags</SectionLabel>
      {purchaseMode === 'preview' ? (
        <ToggleRow title="Premium (preview)" value={premium.active} onChange={v => setPremium({ active: v, plan: v ? 'annual' : null })} />
      ) : null}
      <Button
        title="Replay onboarding"
        variant="ghost"
        onPress={() => {
          update({ onboarded: false });
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        }}
      />
    </Screen>
  );
}

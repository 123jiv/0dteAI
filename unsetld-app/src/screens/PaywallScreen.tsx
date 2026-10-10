import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_PREVIEW } from '../config/app';
import { FEATURES, type Feature } from '../core/features';
import { formatMoney, perMonth, savingsPercent } from '../core/pricing';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import { COLORWAYS, PROGRAMS, RULES } from '../content';
import { PLATFORM } from '../content/copy/platform';
import type { RootProps } from '../navigation/types';
import { selection } from '../services/haptics';
import { scheduleTrialReminder } from '../services/notifications';
import { getPlans, purchase, restore, type Plan, type PlanKind } from '../services/purchases';
import { useAccessEnabled, useApp } from '../state/store';
import { showDialog } from '../ui/actions';
import { Card, SectionLabel } from '../ui/blocks';
import { Icon } from '../ui/icons';
import { Button, Square, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, font, GAP, MARGIN, radius } from '../ui/tokens';

const P = PLATFORM.paywall;

/** What each UNSETLD+ feature in core/features adds, in numbers from the content (rules, plans, colorways). */
const ADDS: Partial<Record<Feature, () => string>> = {
  extraSwaps: () => P.adds.extraSwaps(RULES.rerolls.free, RULES.rerolls.full),
  allPlans: () => P.adds.allPlans(PROGRAMS.length),
  colorways: () => P.adds.colorways(COLORWAYS.length),
  extraReminders: () => P.adds.extraReminders(FREE_MAX_REMINDERS, FULL_MAX_REMINDERS),
};
/** The UNSETLD+ side of core/features, in its order. Moving a feature there moves its row here. */
const PLUS_ROWS = (Object.keys(FEATURES) as Feature[])
  .filter(f => FEATURES[f] === 'plus')
  .map(f => ADDS[f]?.())
  .filter((x): x is string => Boolean(x));

/** UNSETLD+, set like a product page. Prices always come from the store (services/purchases). */
export function PaywallScreen({ navigation }: RootProps<'Paywall'>) {
  const insets = useSafeAreaInsets();
  const setPremium = useApp(s => s.setPremium);
  // Rewards are named as staying free only while they're on.
  const accessEnabled = useAccessEnabled();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<PlanKind>('annual');
  const [busy, setBusy] = useState(false);

  const fetchPlans = useCallback(
    () =>
      getPlans()
        .then(p => (p.length ? setPlans(p) : setFailed(true)))
        .catch(() => setFailed(true)),
    [],
  );
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);
  const load = () => {
    setFailed(false);
    setPlans(null);
    fetchPlans();
  };

  const plan = plans?.find(p => p.kind === kind) ?? null;
  const annual = plans?.find(p => p.kind === 'annual');
  const monthly = plans?.find(p => p.kind === 'monthly');
  const trial = Boolean(plan && plan.kind === 'annual' && plan.trialDays && plan.eligibleForTrial);
  const save = annual && monthly ? savingsPercent(annual.price, monthly.price) : null;

  const close = () => navigation.goBack();

  const buy = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      const r = await purchase(plan);
      if (r.premium) {
        setPremium({ active: true, plan: r.plan });
        if (trial) scheduleTrialReminder(plan.priceString);
        // Leave with a 400ms fade, not the modal's slide down. UIKit reads the
        // transition when it dismisses, so the option lands first.
        if (Platform.OS !== 'web') navigation.setOptions({ animation: 'fade', animationDuration: 400 });
        setTimeout(close, 50);
      }
    } catch {
      showDialog(P.failedTitle, P.failedBody);
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    try {
      const r = await restore();
      if (r.premium) {
        setPremium({ active: true });
        showDialog(P.restored, undefined, [{ label: P.ok, cancel: true, onPress: close }]);
      } else showDialog(P.noneTitle, P.noneBody);
    } catch {
      showDialog(P.restoreFailed);
    }
  };

  const cta = !plan
    ? P.cta.trial
    : plan.kind === 'annual'
      ? trial
        ? P.cta.trial
        : P.cta.annual(plan.priceString)
      : plan.kind === 'monthly'
        ? P.cta.monthly(plan.priceString)
        : P.cta.lifetime(plan.priceString);
  const fine = !plan
    ? ''
    : plan.kind === 'annual'
      ? trial
        ? P.fine.trial(plan.trialDays ?? 3, plan.priceString)
        : P.fine.annual(plan.priceString)
      : plan.kind === 'monthly'
        ? P.fine.monthly(plan.priceString)
        : P.fine.lifetime(plan.priceString);

  const rows: { kind: PlanKind; name: string; sub: string }[] = [
    {
      kind: 'annual',
      name: P.plans.annual,
      sub: annual?.trialDays && annual.eligibleForTrial ? P.sub.annualTrial(annual.trialDays) : P.sub.annual,
    },
    { kind: 'monthly', name: P.plans.monthly, sub: P.sub.monthly },
    { kind: 'lifetime', name: P.plans.lifetime, sub: P.sub.lifetime },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <View style={{ marginTop: insets.top + 8, height: 44, paddingHorizontal: MARGIN - 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={PLATFORM.a11y.close} onPress={close} style={{ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6 }}>
          <Icon name="close" size={24} color={C.stone} />
        </Pressable>
        <TextButton title={P.restore} onPress={doRestore} style={{ paddingHorizontal: 10 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <T v="title.xl" style={{ marginTop: 20 }} accessibilityRole="header">
          {P.title}
        </T>
        <T v="body" color={C.stone} style={{ marginTop: 12 }}>
          {P.description}
        </T>

        <View style={{ marginTop: GAP.block }}>
          <SectionLabel>{P.addsLabel}</SectionLabel>
          <Card style={{ gap: 14 }}>
            {PLUS_ROWS.map(line => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ marginTop: 1 }}>
                  <Icon name="check" size={18} color={C.bone} />
                </View>
                <T v="body" style={{ flex: 1 }}>
                  {line}
                </T>
              </View>
            ))}
          </Card>
        </View>

        <View style={{ marginTop: GAP.block }}>
          <SectionLabel>{P.freeLabel}</SectionLabel>
          <T v="small" color={C.muted}>
            {accessEnabled ? P.free : P.freeNoRewards}
          </T>
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel={P.planLabel} style={{ marginTop: GAP.section - 4 }}>
          <SectionLabel>{P.planLabel}</SectionLabel>
          <View style={{ gap: GAP.tight }}>
            {rows.map(r => {
              const p = plans?.find(x => x.kind === r.kind);
              const on = kind === r.kind;
              return (
                <Pressable
                  key={r.kind}
                  accessibilityRole="radio"
                  // aria-checked rather than accessibilityState: react-native-web only reads the former.
                  aria-checked={on}
                  accessibilityLabel={P.a11yPlan(r.name, p ? p.priceString : P.a11yLoading, P.a11yUnit[r.kind], r.sub)}
                  onPress={() => {
                    if (!on) selection();
                    setKind(r.kind);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 68,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: radius.card,
                    borderWidth: 1,
                    borderColor: on ? C.bone : 'transparent',
                    backgroundColor: pressed ? C.cardPressed : C.card,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  })}>
                  <Square on={on} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <T v="row" style={{ fontSize: 17 }} color={on ? C.bone : C.muted}>
                        {r.name}
                      </T>
                      {r.kind === 'annual' && save ? (
                        <T v="note" color={C.stone}>
                          {P.save(save)}
                        </T>
                      ) : null}
                    </View>
                    <T v="note" color={C.stone}>
                      {r.sub}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <T v="price" color={on ? C.bone : C.muted}>
                        {p ? p.priceString : P.loading}
                      </T>
                      <T v="note" color={C.stone}>
                        {P.unit[r.kind]}
                      </T>
                    </View>
                    {r.kind === 'annual' && p ? (
                      <T v="fine" color={C.stone}>
                        {P.perMonth(formatMoney(perMonth(p.price), p.currencyCode))}
                      </T>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {failed ? (
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T v="note" color={C.stone} style={{ flex: 1 }}>
              {P.priceError}
            </T>
            <TextButton title={P.tryAgain} onPress={load} />
          </View>
        ) : null}

        {trial && plan ? (
          <View style={{ marginTop: 24 }} accessible accessibilityLabel={P.a11yTimeline(plan.priceString)}>
            <View style={{ height: 9, justifyContent: 'center' }}>
              <View style={{ height: 1, backgroundColor: C.ruleStrong }} />
              <View style={{ position: 'absolute', left: 0, width: 9, height: 9, backgroundColor: C.bone }} />
              <View style={{ position: 'absolute', left: '50%', marginLeft: -4.5, width: 9, height: 9, borderWidth: 1, borderColor: C.bone, backgroundColor: C.ink }} />
              <View style={{ position: 'absolute', right: 0, width: 9, height: 9, borderWidth: 1, borderColor: C.bone, backgroundColor: C.ink }} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {P.timeline(plan.priceString).map(([label, value], i) => (
                <View key={label} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}>
                  <T v="label">{label}</T>
                  <T v="note" color={C.stone} style={{ marginTop: 2 }}>
                    {value}
                  </T>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Button title={cta} onPress={buy} disabled={!plan || busy} style={{ marginTop: 28 }} />
        {fine ? (
          <T v="fine" color={C.stone} align="center" style={{ marginTop: 12 }}>
            {fine}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('DocSheet', { id: 'terms' })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <T v="fine" color={C.stone} style={{ textDecorationLine: 'underline' }}>
              {P.terms}
            </T>
          </Pressable>
          <T v="fine" color={C.stone}>
            ·
          </T>
          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('DocSheet', { id: 'privacy' })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <T v="fine" color={C.stone} style={{ textDecorationLine: 'underline' }}>
              {P.privacy}
            </T>
          </Pressable>
        </View>
        {IS_PREVIEW ? (
          <T v="mono.s" align="center" style={{ marginTop: 16, fontFamily: font.mono }}>
            {P.preview}
          </T>
        ) : null}
      </ScrollView>
    </View>
  );
}

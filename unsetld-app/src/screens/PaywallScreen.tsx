import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEATURES, type Feature } from '../core/features';
import { formatMoney, perMonth, savingsPercent } from '../core/pricing';
import { FREE_MAX_REMINDERS, FULL_MAX_REMINDERS } from '../core/reminders';
import { trialLabel, trialTimeline, type Trial } from '../core/trial';
import { COLORWAYS, PROGRAMS, RULES } from '../content';
import { PLATFORM } from '../content/copy/platform';
import type { RootProps } from '../navigation/types';
import { selection } from '../services/haptics';
import { notificationStatus } from '../services/notifications';
import { getPlans, NO_ENTITLEMENT, purchase, purchaseMode, restore, type Plan, type PlanKind } from '../services/purchases';
import { setPremiumFrom } from '../state/premium';
import { useAccessEnabled } from '../state/store';
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
  allPlans: () => P.adds.allPlans(PROGRAMS.length, PROGRAMS.filter(p => p.free).length),
  colorways: () => P.adds.colorways(COLORWAYS.length),
  extraReminders: () => P.adds.extraReminders(FREE_MAX_REMINDERS, FULL_MAX_REMINDERS),
};
/** The ways to pay, in order; once the store answers, only the ones it offers show. */
const KINDS: readonly PlanKind[] = ['annual', 'monthly', 'lifetime'];

/** The free trial this user would get with `p`: a subscription whose intro offer is free, if StoreKit says they're eligible. */
function trialFor(p: Plan | null | undefined): Trial | null {
  return p && p.kind !== 'lifetime' && p.trial && p.eligibleForTrial ? p.trial : null;
}
/** The UNSETLD+ side of core/features, in its order. Moving a feature there moves its row here. */
const PLUS_ROWS = (Object.keys(FEATURES) as Feature[])
  .filter(f => FEATURES[f] === 'plus')
  .map(f => ADDS[f]?.())
  .filter((x): x is string => Boolean(x));

/**
 * UNSETLD+, set like a product page. Prices and the trial always come from the store
 * (services/purchases); a build that can't sell it says so and offers nothing to buy.
 */
export function PaywallScreen({ navigation }: RootProps<'Paywall'>) {
  const insets = useSafeAreaInsets();
  // Rewards are named as staying free only while they're on.
  const accessEnabled = useAccessEnabled();
  const unavailable = purchaseMode === 'unavailable';
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<PlanKind | null>(null);
  const [busy, setBusy] = useState(false);
  // The trial timeline promises a reminder only when one can arrive.
  const [canRemind, setCanRemind] = useState(false);

  const fetchPlans = useCallback(() => {
    if (unavailable) return;
    getPlans()
      .then(p => (p.length ? setPlans(p) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [unavailable]);
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);
  useEffect(() => {
    let live = true;
    notificationStatus()
      .then(s => live && setCanRemind(s === 'granted'))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const load = () => {
    setFailed(false);
    setPlans(null);
    fetchPlans();
  };

  // The one picked; until then Annual, else the first the store offers.
  const plan = plans ? (plans.find(p => p.kind === kind) ?? plans.find(p => p.kind === 'annual') ?? plans[0] ?? null) : null;
  const selected = plan?.kind ?? kind ?? 'annual';
  const annual = plans?.find(p => p.kind === 'annual');
  const monthly = plans?.find(p => p.kind === 'monthly');
  const trial = trialFor(plan);
  const save = annual && monthly ? savingsPercent(annual.price, monthly.price) : null;

  const close = () => navigation.goBack();

  const buy = async () => {
    if (!plan || busy) return;
    setBusy(true);
    try {
      const r = await purchase(plan);
      if (r.premium) {
        // Saved as the store reports it; the trial reminder follows from its end date.
        setPremiumFrom(true, r.info ?? { ...NO_ENTITLEMENT, plan: r.plan }).catch(() => {});
        // Leave with a 400ms fade, not the modal's slide down. UIKit reads the
        // transition when it dismisses, so the option lands first.
        if (Platform.OS !== 'web') navigation.setOptions({ animation: 'fade', animationDuration: 400 });
        setTimeout(close, 50);
      } else if (r.pending) showDialog(P.pendingTitle, P.pendingBody);
      else if (!r.cancelled) showDialog(P.receivedTitle, P.receivedBody);
    } catch {
      showDialog(P.failedTitle, P.failedBody);
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (unavailable) return showDialog(P.unavailableTitle, P.unavailableBody);
    try {
      const r = await restore();
      if (r.premium) {
        setPremiumFrom(true, r.info ?? NO_ENTITLEMENT).catch(() => {});
        showDialog(P.restored, undefined, [{ label: P.ok, cancel: true, onPress: close }]);
      } else showDialog(P.noneTitle, P.noneBody);
    } catch {
      showDialog(P.restoreFailed);
    }
  };

  const cta = !plan
    ? P.cta.subscribe
    : trial
      ? P.cta.trial
      : plan.kind === 'annual'
        ? P.cta.annual(plan.priceString)
        : plan.kind === 'monthly'
          ? P.cta.monthly(plan.priceString)
          : P.cta.lifetime(plan.priceString);
  const fine = !plan
    ? ''
    : trial && plan.kind !== 'lifetime'
      ? P.fine.trial(trialLabel(trial), plan.priceString, plan.kind)
      : plan.kind === 'annual'
        ? P.fine.annual(plan.priceString)
        : plan.kind === 'monthly'
          ? P.fine.monthly(plan.priceString)
          : P.fine.lifetime(plan.priceString);

  const subOf = (k: PlanKind): string => {
    const t = trialFor(plans?.find(p => p.kind === k));
    return k !== 'lifetime' && t ? P.sub.trial(trialLabel(t), k) : P.sub[k];
  };
  const rows = (plans ? KINDS.filter(k => plans.some(p => p.kind === k)) : KINDS).map(k => ({ kind: k, name: P.plans[k], sub: subOf(k) }));

  // The trial, dated: today, the reminder (when one will come), the first charge.
  const timeline = trial && plan ? P.timeline(trialTimeline(trial, new Date(), canRemind), plan.priceString) : null;
  const points = timeline?.points ?? [];

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

        {unavailable ? (
          <View style={{ marginTop: GAP.section - 4 }} accessible accessibilityLiveRegion="polite">
            <T v="body">{P.unavailableTitle}</T>
            <T v="small" color={C.muted} style={{ marginTop: 4 }}>
              {P.unavailableBody}
            </T>
          </View>
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel={P.planLabel} style={{ marginTop: GAP.section - 4 }}>
            <SectionLabel>{P.planLabel}</SectionLabel>
            <View style={{ gap: GAP.tight }}>
              {rows.map(r => {
                const p = plans?.find(x => x.kind === r.kind);
                const on = selected === r.kind;
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
        )}

        {failed && !unavailable ? (
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T v="note" color={C.stone} style={{ flex: 1 }}>
              {P.priceError}
            </T>
            <TextButton title={P.tryAgain} onPress={load} />
          </View>
        ) : null}

        {points.length ? (
          <View style={{ marginTop: 24 }} accessible accessibilityLabel={timeline?.a11y}>
            <View style={{ height: 9, justifyContent: 'center' }}>
              <View style={{ height: 1, backgroundColor: C.ruleStrong }} />
              <View style={{ position: 'absolute', left: 0, width: 9, height: 9, backgroundColor: C.bone }} />
              {points.length === 3 ? (
                <View style={{ position: 'absolute', left: '50%', marginLeft: -4.5, width: 9, height: 9, borderWidth: 1, borderColor: C.bone, backgroundColor: C.ink }} />
              ) : null}
              <View style={{ position: 'absolute', right: 0, width: 9, height: 9, borderWidth: 1, borderColor: C.bone, backgroundColor: C.ink }} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {points.map(([label, value], i) => (
                <View key={label} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === points.length - 1 ? 'flex-end' : 'center' }}>
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
        {purchaseMode === 'preview' ? (
          <T v="mono.s" align="center" style={{ marginTop: 16, fontFamily: font.mono }}>
            {P.preview}
          </T>
        ) : null}
      </ScrollView>
    </View>
  );
}

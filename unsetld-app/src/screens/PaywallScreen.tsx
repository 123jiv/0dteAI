import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_PREVIEW } from '../config/app';
import { formatMoney, perMonth, savingsPercent } from '../core/pricing';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { selection } from '../services/haptics';
import { scheduleTrialReminder } from '../services/notifications';
import { getPlans, purchase, restore, type Plan, type PlanKind } from '../services/purchases';
import { useApp } from '../state/store';
import { showDialog } from '../ui/actions';
import { Icon } from '../ui/icons';
import { Button, Square, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, font, hairline, MARGIN } from '../ui/tokens';

const P = COPY.paywall;

/** Full Edition, set like a product page. Prices always come from StoreKit. */
export function PaywallScreen({ navigation }: RootProps<'Paywall'>) {
  const insets = useSafeAreaInsets();
  const setPremium = useApp(s => s.setPremium);
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
        setTimeout(close, 400);
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
        showDialog(P.restored, undefined, [{ label: 'OK', cancel: true, onPress: close }]);
      } else showDialog(P.noneTitle, P.noneBody);
    } catch {
      showDialog(P.noneTitle, P.noneBody);
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
        <Pressable accessibilityRole="button" accessibilityLabel={COPY.reader.a11y.close} onPress={close} style={{ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6 }}>
          <Icon name="close" size={24} />
        </Pressable>
        <TextButton title={P.restore} onPress={doRestore} style={{ paddingHorizontal: 10 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <T v="label" style={{ marginTop: 24 }}>
          {P.label}
        </T>
        <T v="title.xl" style={{ marginTop: 12 }} accessibilityRole="header">
          {P.title}
        </T>
        <T v="body" color={C.stone} style={{ marginTop: 12 }}>
          {P.description}
        </T>

        <View style={{ marginTop: 28, borderBottomWidth: hairline, borderBottomColor: C.rule }}>
          {P.spec.map(([k, v]) => (
            <View key={k} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderTopColor: C.rule }}>
              <T v="label" style={{ width: 104 }}>
                {k}
              </T>
              <T v="small" style={{ flex: 1 }}>
                {v}
              </T>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={{ marginTop: 32 }}>
          {rows.map((r, i) => {
            const p = plans?.find(x => x.kind === r.kind);
            const on = kind === r.kind;
            return (
              <Pressable
                key={r.kind}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${r.name}, ${p ? p.priceString : 'loading'}${r.kind === 'lifetime' ? ' once' : r.kind === 'annual' ? ' a year' : ' a month'}. ${r.sub}`}
                onPress={() => {
                  if (!on) selection();
                  setKind(r.kind);
                }}
                style={{
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderTopWidth: i === 0 ? 0 : hairline,
                  borderBottomWidth: i === rows.length - 1 ? hairline : 0,
                  borderColor: C.rule,
                  paddingVertical: 10,
                }}>
                <Square on={on} />
                <View style={{ flex: 1, marginLeft: 16 }}>
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

        {failed ? (
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T v="note" color={C.stone} style={{ flex: 1 }}>
              {P.priceError}
            </T>
            <TextButton title={P.tryAgain} onPress={load} />
          </View>
        ) : null}

        {trial && plan ? (
          <View style={{ marginTop: 24 }} accessible accessibilityLabel={`Today, everything opens. Day 2, we remind you. Day 3, ${plan.priceString} billed.`}>
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

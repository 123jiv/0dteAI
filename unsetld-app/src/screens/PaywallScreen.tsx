import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AppConfig } from '../config/app';
import { perMonth, savingsPercent, formatMoney } from '../core/pricing';
import { LANE_NAMES } from '../content';
import type { RootProps } from '../navigation/types';
import { success } from '../services/haptics';
import { getPlans, purchase, purchaseMode, restore, type Plan } from '../services/purchases';
import { useApp } from '../state/store';
import { Button, IconButton, Screen, T } from '../ui/components';
import { Icon } from '../ui/icons';
import { Sheet } from '../ui/overlays';
import { fonts, radius, space, useTheme } from '../ui/theme';

const FEATURES = [
  'Every lane, including The Stoics',
  'All 10 themes for your feed and widgets',
  `Up to ${AppConfig.premiumReminderLimit} reminders a day`,
  'Your own lines on your lock screen and feed',
];

export function PaywallScreen({ navigation, route }: RootProps<'Paywall'>) {
  const theme = useTheme();
  const from = route.params?.from ?? 'settings';
  const setPremium = useApp(s => s.setPremium);
  const pushToast = useApp(s => s.pushToast);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Plan | null>(null);
  // Small phones (iPhone SE): drop the logo and tighten the list so the plans
  // and prices are visible without scrolling.
  const compact = useWindowDimensions().height < 740;

  const fetchPlans = () =>
    getPlans()
      .then(p => {
        setPlans(p);
        setSelected((p.find(x => x.kind === 'annual') ?? p[0])?.id ?? null);
      })
      .catch(() => setError("Couldn't load plans. Check your connection and try again."));
  const retry = () => {
    setError(null);
    fetchPlans();
  };
  useEffect(() => {
    fetchPlans();
  }, []);

  const annual = plans?.find(p => p.kind === 'annual');
  const monthly = plans?.find(p => p.kind === 'monthly');
  const savings = annual && monthly ? savingsPercent(annual.price, monthly.price) : null;
  const plan = plans?.find(p => p.id === selected) ?? null;
  const trial = plan?.kind === 'annual' && plan.trialDays && plan.eligibleForTrial ? plan.trialDays : null;

  const leave = (premium: boolean) => {
    if (!premium) trimToFreeTier(pushToast);
    if (from === 'onboarding') navigation.replace('WidgetGuide', { from: 'onboarding' });
    else navigation.goBack();
  };

  const buy = async (p: Plan) => {
    if (purchaseMode === 'preview') {
      setConfirm(p);
      return;
    }
    setBusy(true);
    try {
      const res = await purchase(p);
      if (res.premium) {
        setPremium({ active: true, plan: res.plan });
        success();
        pushToast('Premium unlocked. Go all in.', 'rank');
        leave(true);
      }
    } catch {
      pushToast('Purchase failed. You were not charged.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const res = await restore();
      if (res.premium) {
        setPremium({ active: true });
        pushToast('Purchases restored.', 'rank');
        leave(true);
      } else {
        pushToast(purchaseMode === 'preview' ? 'Preview mode: nothing to restore.' : 'No purchases found for this Apple ID.', 'info');
      }
    } catch {
      pushToast('Restore failed. Try again.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const ctaTitle = useMemo(() => {
    if (!plan) return 'Continue';
    if (trial) return `Start ${trial}-day free trial`;
    return 'Continue';
  }, [plan, trial]);

  const finePrint = !plan
    ? ''
    : plan.kind === 'lifetime'
      ? `${plan.priceString} once. One-time purchase, no subscription. Charged to your Apple ID.`
      : trial
        ? `${trial} days free, then ${plan.priceString}/year. Cancel anytime in Settings at least 24 hours before the trial ends and you won't be charged. Renews automatically each year until cancelled.`
        : `${plan.priceString}/${plan.kind === 'annual' ? 'year' : 'month'}, charged to your Apple ID. Renews automatically unless cancelled at least 24 hours before the end of the period. Cancel anytime in Settings.`;

  return (
    <Screen
      scroll
      footer={
        <View style={{ gap: space.sm }}>
          <Button title={ctaTitle} onPress={() => plan && buy(plan)} disabled={!plan} loading={busy} />
          <T variant="caption" center style={{ fontSize: 12, lineHeight: 16 }}>
            {finePrint}
          </T>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.lg, marginTop: 2 }}>
            <LinkText label="Restore Purchases" onPress={doRestore} />
            <LinkText label="Terms" onPress={() => navigation.navigate('Legal', { doc: 'terms' })} />
            <LinkText label="Privacy" onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} />
          </View>
        </View>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, marginHorizontal: -8 }}>
        <IconButton icon="close" label="Close" onPress={() => leave(false)} color={theme.muted} />
        {purchaseMode === 'preview' ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.muted, fontFamily: fonts.sansMedium, fontSize: 11 }}>PREVIEW · no real charges</Text>
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', marginTop: compact ? 0 : space.md }}>
        {compact ? null : (
          <Image source={require('../../assets/figure-mark.png')} style={{ width: 64, height: 64 }} accessibilityIgnoresInvertColors />
        )}
        <T variant="label" color={theme.accent} style={{ marginTop: compact ? 0 : space.md }}>
          {`${AppConfig.name} Premium`}
        </T>
        <T variant="title" center style={{ marginTop: space.sm }}>
          Go all in.
        </T>
      </View>

      <View style={{ marginTop: compact ? space.md : space.xl, gap: compact ? space.sm : space.md }}>
        {FEATURES.map(f => (
          <View key={f} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Icon name="check" size={18} color={theme.accent} />
            <T variant={compact ? 'muted' : 'body'} style={{ flex: 1 }}>
              {f}
            </T>
          </View>
        ))}
        <T variant="caption" style={{ marginTop: space.xs }}>
          {"XP and rank are the same for everyone. You can't buy rank."}
        </T>
      </View>

      <View style={{ marginTop: compact ? space.lg : space.xl, gap: compact ? space.sm : space.md }}>
        {!plans && !error ? <ActivityIndicator color={theme.text} style={{ marginVertical: space.xl }} /> : null}
        {error ? (
          <View style={{ alignItems: 'center', gap: space.md }}>
            <T variant="muted" center>
              {error}
            </T>
            <Button title="Try again" variant="secondary" onPress={retry} />
          </View>
        ) : null}
        {plans?.map(p => (
          <PlanCard
            key={p.id}
            plan={p}
            selected={p.id === selected}
            savings={p.kind === 'annual' ? savings : null}
            onPress={() => setSelected(p.id)}
          />
        ))}
      </View>

      <Sheet visible={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <T variant="h2">Preview purchase</T>
        <T variant="muted" style={{ marginTop: space.sm }}>
          {`This is the browser/preview build, so nothing is charged. On iPhone this opens Apple's purchase sheet for ${confirm?.title ?? ''}.`}
        </T>
        <View style={{ gap: space.sm, marginTop: space.xl }}>
          <Button
            title="Simulate purchase"
            onPress={() => {
              const p = confirm;
              setConfirm(null);
              if (!p) return;
              setPremium({ active: true, plan: p.kind });
              success();
              pushToast('Premium unlocked (preview).', 'rank');
              leave(true);
            }}
          />
          <Button title="Cancel" variant="ghost" onPress={() => setConfirm(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

function PlanCard({ plan, selected, savings, onPress }: { plan: Plan; selected: boolean; savings: number | null; onPress: () => void }) {
  const theme = useTheme();
  const period = plan.kind === 'annual' ? '/year' : plan.kind === 'monthly' ? '/month' : ' once';
  const name = plan.kind === 'annual' ? 'Yearly' : plan.kind === 'monthly' ? 'Monthly' : 'Lifetime';
  const trial = plan.kind === 'annual' && plan.trialDays && plan.eligibleForTrial ? plan.trialDays : null;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${plan.priceString}${period}${trial ? `, ${trial} days free first` : ''}${savings ? `, save ${savings} percent` : ''}`}
      onPress={onPress}
      style={{
        borderRadius: radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? `${theme.accent}14` : theme.surface,
        padding: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
      }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? theme.accent : theme.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 15 }}>{name}</Text>
          {savings ? (
            <View style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: theme.onAccent, fontFamily: fonts.sansSemi, fontSize: 10 }}>{`Save ${savings}%`}</Text>
            </View>
          ) : null}
        </View>
        {trial ? (
          <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 3 }}>
            {`${trial} days free, then ${plan.priceString}/year`}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {/* The billed amount is the most prominent price on the screen (Apple 3.1.2). */}
        <Text style={{ color: theme.text, fontFamily: fonts.sansBold, fontSize: 20 }}>
          {plan.priceString}
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: theme.muted }}>{period}</Text>
        </Text>
        {plan.kind === 'annual' ? (
          <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 2 }}>
            {`≈ ${formatMoney(perMonth(plan.price), plan.currencyCode)}/month`}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={{ color: theme.muted, fontFamily: fonts.sansMedium, fontSize: 12, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

/** Free uses the first two picked lanes; the rest come back with Premium. */
export function trimToFreeTier(pushToast: (t: string, k?: 'info') => void) {
  const { settings, premium } = useApp.getState();
  if (premium.active || settings.lanes.length <= AppConfig.freeLaneLimit) return;
  const kept = settings.lanes.slice(0, AppConfig.freeLaneLimit);
  pushToast(`Free uses 2 lanes: ${kept.map(l => LANE_NAMES[l]).join(' + ')}. Change them in Me.`, 'info');
}

export const openExternal = (url: string) => Linking.openURL(url).catch(() => {});

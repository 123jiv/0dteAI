import Constants from 'expo-constants';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { AppConfig } from '../config/app';
import { rankIndex } from '../core/rank';
import { LANE_NAMES, ONBOARDING, RANK_CONFIG, THEMES } from '../content';
import type { TabProps } from '../navigation/types';
import { purchaseMode, restore } from '../services/purchases';
import { useApp, useEntitlements } from '../state/store';
import { Button, Card, Row, Screen, SectionLabel, T } from '../ui/components';
import { Sheet } from '../ui/overlays';
import { RankEmblem } from '../ui/RankEmblem';
import { fonts, space, useTheme } from '../ui/theme';
import { hourLabel } from './components/HourPicker';

export function MeScreen({ navigation }: TabProps<'Me'>) {
  const theme = useTheme();
  const ent = useEntitlements();
  const settings = useApp(s => s.settings);
  const progress = useApp(s => s.progress);
  const premium = useApp(s => s.premium);
  const favorites = useApp(s => s.favorites);
  const customLines = useApp(s => s.customLines);
  const setPremium = useApp(s => s.setPremium);
  const pushToast = useApp(s => s.pushToast);
  const resetProgress = useApp(s => s.resetProgress);
  const [confirmReset, setConfirmReset] = useState(false);
  const ri = rankIndex(RANK_CONFIG, progress.rankXP);
  // Time travel would let anyone farm XP, so it only exists in dev and preview builds.
  const showDev = __DEV__ || purchaseMode === 'preview';

  const doRestore = async () => {
    try {
      const r = await restore();
      if (r.premium) {
        setPremium({ active: true });
        pushToast('Purchases restored.', 'rank');
      } else pushToast(purchaseMode === 'preview' ? 'Preview mode: nothing to restore.' : 'No purchases found for this Apple ID.', 'info');
    } catch {
      pushToast('Restore failed. Try again.', 'warn');
    }
  };

  const sourceLabel = ONBOARDING.source.options.find(o => o.id === settings.source)?.label ?? 'Not set';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xl }}>
        <RankEmblem rank={ri} size={64} color={theme.text} />
        <View style={{ flex: 1 }}>
          <T variant="label">{premium.active ? 'Premium' : 'Free'}</T>
          <Text style={{ color: theme.text, fontFamily: fonts.serif, fontSize: 30 }}>{RANK_CONFIG.ranks[ri].name}</Text>
          <T variant="caption">{`${progress.lifetimeXP.toLocaleString()} lifetime XP · best streak ${progress.bestStreak}d · highest ${RANK_CONFIG.ranks[progress.highestRank].name}`}</T>
        </View>
      </View>

      {!premium.active ? (
        <Card style={{ marginTop: space.xl, borderColor: theme.accent }}>
          <T variant="h2">Go all in</T>
          <T variant="muted" style={{ marginTop: 4 }}>
            Every lane, every theme, up to 12 reminders a day and your own lines on your lock screen.
          </T>
          <Button title="See Premium" onPress={() => navigation.navigate('Paywall', { from: 'settings' })} style={{ marginTop: space.md }} />
        </Card>
      ) : null}

      <SectionLabel>Your lines</SectionLabel>
      <Row title="Favorites" value={`${favorites.length}`} icon="heart" onPress={() => navigation.navigate('Favorites')} />
      <Row
        title="Write your own"
        value={ent.customLines ? `${customLines.length}` : 'Premium'}
        icon="plus"
        onPress={() => (ent.customLines ? navigation.navigate('CustomLines') : navigation.navigate('Paywall', { from: 'feature' }))}
      />

      <SectionLabel>Settings</SectionLabel>
      <Row title="Lanes" value={ent.lanes.map(l => LANE_NAMES[l]).join(', ') || 'None'} onPress={() => navigation.navigate('Lanes')} />
      <Row title="Tone" value={`${settings.tone === 'clean' ? 'Clean' : 'Unfiltered'}${settings.lockScreenClean ? ' · clean lock screen' : ''}`} onPress={() => navigation.navigate('Tone')} />
      <Row
        title="Reminders"
        value={settings.reminders.enabled ? `${ent.remindersPerDay}/day · ${hourLabel(settings.reminders.startHour)}–${hourLabel(settings.reminders.endHour)}` : 'Off'}
        icon="bell"
        onPress={() => navigation.navigate('Reminders')}
      />
      <Row title="Theme" value={ent.theme.name} onPress={() => navigation.navigate('Themes')} />
      <Row title="Add the widget" onPress={() => navigation.navigate('WidgetGuide')} />
      <Row title="How did you find us?" value={sourceLabel} onPress={() => navigation.navigate('Source')} />

      <SectionLabel>Account</SectionLabel>
      {premium.active && purchaseMode === 'revenuecat' ? (
        <Row title="Manage subscription" onPress={() => Linking.openURL(AppConfig.manageSubscriptionsUrl).catch(() => {})} />
      ) : null}
      <Row title="Restore purchases" onPress={doRestore} />
      <Row title="Rewards terms" onPress={() => navigation.navigate('Legal', { doc: 'rewards' })} />
      <Row title="Privacy policy" onPress={() => navigation.navigate('Legal', { doc: 'privacy' })} />
      <Row title="Terms of use" onPress={() => navigation.navigate('Legal', { doc: 'terms' })} />
      <Row title="Reset progress" danger onPress={() => setConfirmReset(true)} />
      {showDev ? <Row title="Tester tools" value="time travel" onPress={() => navigation.navigate('DevTools')} /> : null}

      <View style={{ alignItems: 'center', marginTop: space.xl }}>
        <T variant="caption">{`${AppConfig.name} ${version} · ${THEMES.length} themes · ${purchaseMode === 'preview' ? 'preview purchases' : 'App Store'}`}</T>
        <T variant="caption" style={{ marginTop: 2 }}>
          {AppConfig.tagline}
        </T>
      </View>

      <Sheet visible={confirmReset} onClose={() => setConfirmReset(false)}>
        <T variant="h2">Reset all progress?</T>
        <T variant="muted" style={{ marginTop: space.sm }}>
          Streak, XP, rank and favorites go back to zero. Settings, Premium and your code history stay, so code cooldowns still apply.
        </T>
        <Button
          title="Reset to SETTLED"
          style={{ marginTop: space.xl }}
          onPress={async () => {
            resetProgress();
            setConfirmReset(false);
            pushToast('Progress reset. Everyone starts SETTLED.', 'info');
          }}
        />
        <Button title="Cancel" variant="ghost" onPress={() => setConfirmReset(false)} />
      </Sheet>
    </Screen>
  );
}

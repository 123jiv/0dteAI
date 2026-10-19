import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatTime, type DayKey } from '../../core/time';
import type { Colorway } from '../../core/types';
import { HOME } from '../../content/copy/home';
import { notificationStatus, requestNotifications } from '../../services/notifications';
import { selection } from '../../services/haptics';
import { useApp, useEntitlements } from '../../state/store';
import { Card } from '../../ui/blocks';
import { T } from '../../ui/text';
import { surfacesFor } from './parts';
import { nextOffer, shouldOfferReminders, type OfferPermission, type RemindersOffer } from './remindersOffer';

const COPY = HOME.remindersCard;

/** Reading.remindersOffer, written here only. */
const setOffer = (offer: RemindersOffer) => useApp.setState(s => ({ reading: { ...s.reading, remindersOffer: offer } }));

/** One of the card's two answers: words on the colorway, 44 tall. */
function Answer({ title, color, onPress }: { title: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <T v="meta" color={color}>
        {title}
      </T>
    </Pressable>
  );
}

/**
 * Today, in the weekly focus card's place (launch pass P1-3): once, on the first day with a
 * proof, "Get reminded about open missions?". Onboarding doesn't ask any more. Turn on asks iOS
 * for notifications if it hasn't yet (the timer's start may already have) and turns reminders
 * on; either answer puts it away for good. Unanswered, it stays through that day and is gone at
 * 4:00 AM. Renders nothing when there's nothing to offer.
 */
export function RemindersCard({
  colorway,
  day,
  provenToday,
  focusAsked,
  style,
}: {
  colorway: Colorway;
  day: DayKey;
  provenToday: boolean;
  focusAsked: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reminders = useApp(s => s.settings.reminders);
  const offer = useApp(s => s.reading.remindersOffer);
  const ent = useEntitlements();
  const [permission, setPermission] = useState<OfferPermission>(null);
  const [busy, setBusy] = useState(false);

  // Read once something is proven: the card waits for it rather than showing and then going.
  useEffect(() => {
    if (!provenToday) return;
    let live = true;
    notificationStatus()
      .then(p => live && setPermission(p))
      .catch(() => live && setPermission('undetermined'));
    return () => {
      live = false;
    };
  }, [provenToday, day]);

  const input = { provenToday, remindersOn: reminders.on, permission, offer, day, focusAsked };
  const shown = shouldOfferReminders(input);
  const next = nextOffer(input);

  // First shown: it belongs to today, and only today. Already on: nothing to offer, ever.
  useEffect(() => {
    if (next !== undefined) setOffer(next);
  }, [next]);

  if (!shown) return null;

  const count = Math.min(reminders.count, ent.maxReminders);

  const turnOn = async () => {
    if (busy) return;
    selection();
    setBusy(true);
    const now = await notificationStatus().catch(() => 'undetermined' as const);
    let ok = now === 'granted' || Platform.OS === 'web';
    if (now === 'undetermined') ok = await requestNotifications().catch(() => false);
    const s = useApp.getState();
    // Saved on: the reminders are scheduled from here (state/lifecycle). A No to iOS leaves them off.
    if (ok) s.updateSettings({ reminders: { ...s.settings.reminders, on: true } });
    setOffer('done');
    if (ok) AccessibilityInfo.announceForAccessibility(COPY.turnedOn);
  };

  const notNow = () => {
    selection();
    setOffer('done');
  };

  const s = surfacesFor(colorway);
  return (
    <View style={style}>
      <Card surface={s.card} pressed={s.pressed}>
        <T v="saved" color={colorway.ink} accessibilityRole="header">
          {COPY.title}
        </T>
        <T v="small" color={colorway.secondary} style={{ marginTop: 8 }}>
          {COPY.body(count, formatTime(reminders.first), formatTime(reminders.last))}
        </T>
        <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Answer title={COPY.on} color={colorway.ink} onPress={turnOn} />
          <Answer title={COPY.notNow} color={colorway.secondary} onPress={notNow} />
        </View>
      </Card>
    </View>
  );
}

import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { todayLine } from '../../core/feed';
import { dayCount, pendingLetter } from '../../core/record';
import { minutesIntoDay, minutesOf, widgetDate } from '../../core/time';
import { typo } from '../../core/typography';
import { LINES, POINTS, SCHEDULE } from '../../content';
import { COPY } from '../../content/copy';
import type { RootProps } from '../../navigation/types';
import { now } from '../../services/clock';
import { light, soft } from '../../services/haptics';
import { checkTrustedTime } from '../../services/trustedTime';
import { useAccessEnabled, useApp, useEntitlements, useReaderColorway } from '../../state/store';
import { useWork } from '../../state/work';
import { showActions } from '../../ui/actions';
import { ColorwayBackground } from '../../ui/ColorwayBackground';
import { Icon } from '../../ui/icons';
import type { ShareLine } from '../../ui/ShareCard';
import { T } from '../../ui/text';
import { ease, font, hairline, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';
import { ChaptersSheet } from './ChaptersSheet';
import { ColorwaySheet } from './ColorwaySheet';
import { AccessNote, NightBlock, TodayLine, WorkRow } from './parts';
import { ShareSheet } from './ShareSheet';

/** Night check is due: enabled, after its time, before the 4:00 AM boundary. */
function nightDue(on: boolean, time: number): boolean {
  return on && minutesIntoDay(minutesOf(now())) >= minutesIntoDay(time);
}

/** Today: the day's line, the night check when it's due, and the day's work. */
export function TodayScreen({ navigation, route }: RootProps<'Today'>) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const colorway = useReaderColorway();
  const ent = useEntitlements();
  const accessEnabled = useAccessEnabled();
  const day = useApp(s => s.currentDay);
  const settings = useApp(s => s.settings);
  const record = useApp(s => s.record);
  const saved = useApp(s => s.reading.saved);
  const accessIntroShown = useApp(s => s.reading.accessIntroShown);
  const work = useWork(day);
  const done = record.work[day] ?? {};
  const line = todayLine(LINES, SCHEDULE, day);
  const n = dayCount(record);

  const [sheet, setSheet] = useState<'chapters' | 'colorway' | null>(null);
  const [share, setShare] = useState<ShareLine | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [nudge] = useState(() => new Animated.Value(0));
  const [nightY, setNightY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [clock, setClock] = useState(0);

  // New params from Settings (open a sheet) or a deep link (show the night check).
  const nonce = route.params?.nonce;
  const [seenNonce, setSeenNonce] = useState(nonce);
  const [scrollToNight, setScrollToNight] = useState(0);
  if (nonce !== seenNonce) {
    setSeenNonce(nonce);
    if (route.params?.sheet) setSheet(route.params.sheet);
    if (route.params?.night) setScrollToNight(t => t + 1);
  }
  useEffect(() => {
    if (scrollToNight && nightY) scrollRef.current?.scrollTo({ y: Math.max(0, nightY - 80), animated: true });
  }, [scrollToNight, nightY]);

  // The night check comes due while the app is open, or when it returns to the foreground.
  useEffect(() => {
    const tick = setInterval(() => setClock(c => c + 1), 60_000);
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active') setClock(c => c + 1);
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, []);
  void clock;
  const answer = record.nights[day];
  const showNight = nightDue(settings.night.on, settings.night.time) || answer !== undefined;

  // The first open of each day puts it on record: one soft haptic and a nudge of the walker.
  useFocusEffect(
    useCallback(() => {
      const st = useApp.getState();
      if (!st.settings.onboarded) return;
      if (!st.record.days[day]) {
        st.recordToday(false);
        checkTrustedTime().then(t => {
          if (t.verified) useApp.getState().recordToday(true);
        });
      }
      const after = useApp.getState();
      if (!after.record.days[day] || after.reading.dayHeadShown === day) return;
      after.markDayHead(day);
      soft();
      Animated.sequence([
        Animated.timing(nudge, { toValue: 3, duration: 200, easing: ease.out, useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 200, easing: ease.in, useNativeDriver: true }),
      ]).start();
    }, [day, nudge]),
  );

  // Milestone and comeback letters, a few seconds after Today settles.
  const recordedToday = Boolean(record.days[day]);
  useEffect(() => {
    if (!isFocused || !accessEnabled || !recordedToday || sheet || share) return;
    const letter = pendingLetter(useApp.getState().record, day);
    if (!letter) return;
    const timer = setTimeout(() => navigation.navigate('Letter', { letter }), 2500);
    return () => clearTimeout(timer);
  }, [isFocused, accessEnabled, recordedToday, day, record.lettersShown, navigation, sheet, share]);

  // Day 3: one quiet note about what the record opens.
  const showAccessNote = accessEnabled && n >= 3 && !accessIntroShown;
  useEffect(() => {
    if (showAccessNote && isFocused) {
      const t = setTimeout(() => useApp.getState().markAccessIntro(), 4000);
      return () => clearTimeout(t);
    }
  }, [showAccessNote, isFocused]);

  const lineMenu = () => {
    if (!line) return;
    const isSaved = saved.includes(line.no);
    showActions({
      options: [
        { label: COPY.reader.menu.share, onPress: () => setShare({ text: line.text, no: line.no, attribution: line.attribution }) },
        {
          label: COPY.reader.menu.copy,
          onPress: () => {
            Clipboard.setStringAsync(typo(line.text)).catch(() => {});
            light();
          },
        },
        { label: isSaved ? COPY.reader.menu.unsave : COPY.reader.menu.save, onPress: () => useApp.getState().toggleSave(line.no) },
        { label: COPY.reader.menu.cancel, cancel: true },
      ],
    });
  };

  const ownCount = settings.ownTasks.length;
  const canAdd = ownCount < 3;
  const addRow = () => {
    if (!ent.maxOwnTasks) return navigation.navigate('Paywall', { from: 'tasks' });
    setAdding('');
  };
  const commitAdd = () => {
    const text = (adding ?? '').trim().replace(/\s+/g, ' ');
    if (text) useApp.getState().addOwnTask(/[.?]$/.test(text) ? text : `${text}.`);
    setAdding(null);
  };

  const doneCount = work.filter(w => done[w.key]).length;
  // The bar sits over the list, so it needs a solid ground on every colorway (plates included).
  const barBg = colorway.bgEnd ?? colorway.bg;

  return (
    <View style={{ flex: 1, backgroundColor: colorway.bg }}>
      <StatusBar style={colorway.statusBar} />
      <ColorwayBackground colorway={colorway} />
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }}>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="label" color={colorway.secondary}>
            {widgetDate(day)}
          </T>
          <T v="mono" color={colorway.secondary}>{`DAY ${String(n).padStart(3, '0')}`}</T>
        </View>

        {line ? (
          <View style={{ marginTop: 28 }}>
            <TodayLine
              line={line}
              colorway={colorway}
              saved={saved.includes(line.no)}
              onToggleSave={() => useApp.getState().toggleSave(line.no)}
              onShare={() => setShare({ text: line.text, no: line.no, attribution: line.attribution })}
              onLongPress={lineMenu}
            />
          </View>
        ) : null}

        {showNight ? (
          <View style={{ marginTop: 32 }} onLayout={e => setNightY(e.nativeEvent.layout.y)}>
            <NightBlock colorway={colorway} answer={answer} day={n} onAnswer={held => useApp.getState().answerNight(day, held)} />
          </View>
        ) : null}

        <View style={{ marginTop: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <T v="label" color={colorway.secondary} accessibilityRole="header">
              {COPY.today.work}
            </T>
            <T v="mono" color={colorway.secondary} accessibilityLabel={`${doneCount} of ${work.length} done`}>
              {COPY.today.count(doneCount, work.length)}
            </T>
          </View>
          {work.map((item, i) => (
            <WorkRow
              key={item.key}
              index={i}
              item={item}
              done={done[item.key]}
              colorway={colorway}
              last={i === work.length - 1 && adding === null && !canAdd}
              onPress={() => navigation.navigate('Task', { key: item.key })}
              onLongPress={
                item.source === 'own'
                  ? () =>
                      showActions({
                        options: [
                          { label: COPY.today.removeTask, destructive: true, onPress: () => useApp.getState().removeOwnTask(item.key.slice(2)) },
                          { label: COPY.reader.menu.cancel, cancel: true },
                        ],
                      })
                  : undefined
              }
            />
          ))}
          {adding !== null ? (
            <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: colorway.rule }}>
              <T v="mono" color={colorway.secondary} style={{ width: 40 }}>
                {String(work.length + 1).padStart(2, '0')}
              </T>
              <TextInput
                autoFocus
                value={adding}
                onChangeText={setAdding}
                onSubmitEditing={commitAdd}
                onBlur={commitAdd}
                maxLength={40}
                returnKeyType="done"
                placeholder={COPY.today.taskPlaceholder}
                placeholderTextColor={`${colorway.ink}55`}
                accessibilityLabel={COPY.today.addTask}
                style={{ flex: 1, fontFamily: font.serif, fontSize: 23, color: colorway.ink, paddingVertical: 12 }}
              />
            </View>
          ) : canAdd ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ent.maxOwnTasks ? COPY.today.addTask : `${COPY.today.addTask}, Full Edition`}
              onPress={addRow}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: hairline,
                borderBottomWidth: hairline,
                borderColor: colorway.rule,
                opacity: pressed ? 0.6 : 1,
              })}>
              <T v="mono" color={colorway.secondary} style={{ width: 40 }}>
                +
              </T>
              <T v="body" color={colorway.secondary} style={{ flex: 1 }}>
                {COPY.today.addTask}
              </T>
              {!ent.maxOwnTasks ? (
                <T v="label" color={colorway.secondary}>
                  {COPY.today.locked}
                </T>
              ) : null}
            </Pressable>
          ) : null}
          {accessEnabled ? (
            <T v="note" color={colorway.secondary} style={{ marginTop: 12 }}>
              {COPY.today.footNote(POINTS.perProof, POINTS.maxPerDay)}
            </T>
          ) : null}
        </View>

        {showAccessNote ? (
          <View style={{ marginTop: 40 }}>
            <AccessNote colorway={colorway} onRecord={() => navigation.navigate('Record')} />
          </View>
        ) : null}
      </ScrollView>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient pointerEvents="none" colors={[`${barBg}00`, barBg]} style={{ height: colorway.kind === 'plate' ? 48 : 32 }} />
        <View
          style={{
            backgroundColor: barBg,
            paddingLeft: MARGIN - 4,
            paddingRight: MARGIN - 16,
            paddingBottom: insets.bottom + 8,
            height: insets.bottom + 52,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.reader.a11y.chapters}
            onPress={() => setSheet('chapters')}
            style={({ pressed }) => ({ height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
            <Icon name="index" size={20} color={colorway.secondary} />
            <T v="small" color={colorway.secondary} style={{ marginLeft: 10 }}>
              {COPY.reader.chapters}
            </T>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.reader.a11y.colorway}
            onPress={() => setSheet('colorway')}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Icon name="colorway" size={18} color={colorway.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.reader.a11y.record}
            onPress={() => navigation.navigate('Record')}
            style={({ pressed }) => ({ width: 44, height: 44, marginLeft: -1, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Animated.View style={{ transform: [{ translateX: nudge }] }}>
              <Walker height={26} color={colorway.ink} lapelColor={colorway.secondary} />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <ChaptersSheet
        visible={sheet === 'chapters'}
        onClose={() => setSheet(null)}
        onSaved={() => navigation.navigate('Saved')}
        onYourLines={() => navigation.navigate('YourLines')}
        onFull={() => navigation.navigate('Paywall', { from: 'chapter' })}
      />
      <ColorwaySheet visible={sheet === 'colorway'} onClose={() => setSheet(null)} onFull={() => navigation.navigate('Paywall', { from: 'colorway' })} />
      <ShareSheet
        line={share}
        colorway={ent.colorway}
        premium={ent.premium}
        onClose={() => setShare(null)}
        onLocked={() => {
          setShare(null);
          navigation.navigate('Paywall', { from: 'share' });
        }}
      />
    </View>
  );
}

import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, FlatList, Pressable, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMix, buildPages, todayLine, type Page } from '../../core/feed';
import { dayCount, pendingLetter } from '../../core/record';
import { minutesIntoDay, minutesOf } from '../../core/time';
import { catalogueNo, typo } from '../../core/typography';
import type { ChapterId, Line } from '../../core/types';
import { CHAPTER_BY_ID, chapterLabel, LINE_BY_NO, LINES, SCHEDULE, VOLUME } from '../../content';
import { COPY } from '../../content/copy';
import type { ReaderMode, RootProps } from '../../navigation/types';
import { now } from '../../services/clock';
import { light, soft } from '../../services/haptics';
import { checkTrustedTime } from '../../services/trustedTime';
import { useApp, useAccessEnabled, useEntitlements, useReaderColorway } from '../../state/store';
import { showActions } from '../../ui/actions';
import { ColorwayBackground } from '../../ui/ColorwayBackground';
import { Icon } from '../../ui/icons';
import type { ShareLine } from '../../ui/ShareCard';
import { T } from '../../ui/text';
import { ease, MARGIN } from '../../ui/tokens';
import { Walker } from '../../ui/Walker';
import { ChaptersSheet } from './ChaptersSheet';
import { ColorwaySheet } from './ColorwaySheet';
import { EndCard, LinePage, NightPage, NotePage } from './pages';
import { RunningHead } from './RunningHead';
import { ShareSheet } from './ShareSheet';

/** Night check is due: enabled, after its time, before the 4:00 AM boundary. */
function nightDue(on: boolean, time: number): boolean {
  if (!on) return false;
  return minutesIntoDay(minutesOf(now())) >= minutesIntoDay(time);
}

export function ReaderScreen({ navigation, route }: RootProps<'Reader'>) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const ent = useEntitlements();
  const colorway = useReaderColorway();
  const accessEnabled = useAccessEnabled();
  const settings = useApp(s => s.settings);
  const day = useApp(s => s.currentDay);
  const salt = useApp(s => s.installSalt);
  const saved = useApp(s => s.reading.saved);
  const hidden = useApp(s => s.reading.hidden);
  const counted = useApp(s => s.reading.counted);
  const yourLines = useApp(s => s.yourLines);
  const record = useApp(s => s.record);
  const premium = ent.premium;

  const [height, setHeight] = useState(0);
  const [mode, setMode] = useState<ReaderMode>(route.params?.mode ?? { kind: 'mix' });
  const [startNo, setStartNo] = useState<number | undefined>(route.params?.startNo);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState<'chapters' | 'colorway' | null>(null);
  const [shareLine, setShareLine] = useState<ShareLine | null>(null);
  const [rebuild, setRebuild] = useState(0);
  const [nightOn, setNightOn] = useState(() => nightDue(settings.night.on, settings.night.time) && record.nights[day] === undefined);
  const [dayHead, setDayHead] = useState<string | null>(null);
  const listRef = useRef<FlatList<Page>>(null);
  const lastScroll = useRef(0);
  const [nudge] = useState(() => new Animated.Value(0));

  // New params from Saved, the Chapters sheet, a deep link or a notification:
  // adjust state while rendering, then scroll to the top once committed.
  const nonce = route.params?.nonce;
  const [seenNonce, setSeenNonce] = useState(nonce);
  const [scrollTop, setScrollTop] = useState(0);
  if (nonce !== seenNonce) {
    setSeenNonce(nonce);
    const p = route.params;
    if (p?.sheet) setSheet(p.sheet);
    else {
      setMode(p?.mode ?? { kind: 'mix' });
      setStartNo(p?.startNo);
      if (p?.mode?.kind !== 'saved' && !p?.startNo) setNightOn(nightDue(settings.night.on, settings.night.time) && record.nights[day] === undefined);
      setActive(0);
      setScrollTop(t => t + 1);
    }
  }
  useEffect(() => {
    if (scrollTop) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [scrollTop]);

  // Coming back to the app at night: the night check becomes page 1.
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      if (st !== 'active') return;
      const due = nightDue(useApp.getState().settings.night.on, useApp.getState().settings.night.time);
      const unanswered = useApp.getState().record.nights[useApp.getState().currentDay] === undefined;
      if (due && unanswered && !nightOn) {
        setNightOn(true);
        setActive(0);
        requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }));
      }
    });
    return () => sub.remove();
  }, [nightOn]);

  const today = useMemo(() => todayLine(LINES, SCHEDULE, day), [day]);
  const mixKey = ent.mix.join(',');
  const strong = settings.strongLanguage;

  // The day's mix. `seen` and lifetime count are read once, so the list stays put while reading.
  const mix = useMemo(() => {
    const st = useApp.getState().reading;
    const chapters: ChapterId[] = mode.kind === 'chapter' ? [mode.id] : ent.mix;
    const base = {
      lines: mode.kind === 'volume' ? LINES.filter(l => l.volume === mode.volume) : LINES,
      chapters,
      today: day,
      salt,
      seen: st.seen,
      hidden: new Set(st.hidden),
      strongLanguage: strong,
      lifetimeSeen: st.lifetimeSeen,
    };
    return buildMix({
      ...base,
      exclude: today && mode.kind === 'mix' ? new Set([today.no]) : undefined,
      prevChapter: mode.kind === 'mix' ? today?.chapter : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, mixKey, mode, strong, salt, today, rebuild]);

  // One one-time page a day at most, decided when the day's list is built.
  const oneTime = useMemo(() => {
    const st = useApp.getState();
    if (mode.kind !== 'mix') return null;
    if (accessEnabled && !st.reading.accessIntroShown && dayCount(st.record) >= 3) return 'access-intro' as const;
    if (VOLUME > Math.max(...st.reading.volumesSeen)) return { volume: VOLUME };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, mode, accessEnabled]);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const countedToday = useMemo(() => new Set(counted.day === day ? counted.nos : []), [counted, day]);

  const pages: Page[] = useMemo(() => {
    if (mode.kind === 'saved') {
      const nos = saved.length ? saved : [mode.no];
      const start = Math.max(0, nos.indexOf(mode.no));
      const ordered = [...nos.slice(start), ...nos.slice(0, start)];
      return ordered
        .map(n => LINE_BY_NO[n])
        .filter((l): l is Line => Boolean(l))
        .map(l => ({ kind: 'line', key: `s${l.no}`, line: l, counted: false }));
    }
    const startLine = startNo ? LINE_BY_NO[startNo] ?? null : null;
    const built = buildPages({
      today: mode.kind === 'mix' ? today : null,
      mix,
      yourLines: ent.yourLines ? yourLines : [],
      premium,
      night: mode.kind === 'mix' && nightOn,
      oneTime,
      countedToday,
      startLine,
      salt,
      day,
    });
    return built.filter(p => p.kind !== 'line' || !hiddenSet.has(p.line.no) || p.line.no === startLine?.no);
  }, [mode, saved, startNo, today, mix, ent.yourLines, yourLines, premium, nightOn, oneTime, countedToday, salt, day, hiddenSet]);

  // Recording: the first time each day the reader is focused while the app is
  // active. The first view of the day also shows "DAY N" in the running head
  // for 2.5 s, with one soft haptic and a nudge of the walker.
  const recordedToday = Boolean(record.days[day]);
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
      const now = useApp.getState();
      // Back in the reader after the night check came due: it becomes page 1.
      if (mode.kind === 'mix' && !nightOn && nightDue(now.settings.night.on, now.settings.night.time) && now.record.nights[day] === undefined) {
        setNightOn(true);
        setActive(0);
        setScrollTop(t => t + 1);
      }
      if (!now.record.days[day] || now.reading.dayHeadShown === day) return;
      now.markDayHead(day);
      soft();
      Animated.sequence([
        Animated.timing(nudge, { toValue: 3, duration: 200, easing: ease.out, useNativeDriver: true }),
        Animated.timing(nudge, { toValue: 0, duration: 200, easing: ease.in, useNativeDriver: true }),
      ]).start();
      setDayHead(COPY.reader.dayHead(dayCount(now.record)));
      const t = setTimeout(() => setDayHead(null), 2500);
      return () => clearTimeout(t);
    }, [day, nudge, mode.kind, nightOn]),
  );

  // Milestone and comeback letters: queued until the reader has been idle for 600 ms.
  useEffect(() => {
    if (!isFocused || !accessEnabled || !recordedToday) return;
    const letter = pendingLetter(useApp.getState().record, day);
    if (!letter) return;
    let timer: ReturnType<typeof setTimeout>;
    const tryShow = () => {
      if (Date.now() - lastScroll.current < 600 || sheet || shareLine) {
        timer = setTimeout(tryShow, 400);
        return;
      }
      navigation.navigate('Letter', { letter });
    };
    timer = setTimeout(tryShow, 3000);
    return () => clearTimeout(timer);
  }, [isFocused, accessEnabled, recordedToday, day, record.lettersShown, navigation, sheet, shareLine]);

  // What the user has actually read.
  const page = pages[Math.min(active, pages.length - 1)];
  useEffect(() => {
    if (!page || !isFocused) return;
    const st = useApp.getState();
    if (page.kind === 'line') {
      st.markSeen(page.line.no);
      if (!premium && page.counted && mode.kind !== 'saved') st.countLine(page.line.no);
    }
    if (page.kind === 'access-intro') st.markAccessIntro();
    if (page.kind === 'volume') st.markVolume(page.volume);
    if (active > 0 && !st.settings.hintDone) st.updateSettings({ hintDone: true });
  }, [page, active, premium, mode.kind, isFocused]);

  // FlatList needs these to stay the same object for its whole life.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(v => v.isViewable);
    if (first?.index != null) setActive(first.index);
  });
  const [viewability] = useState({ itemVisiblePercentThreshold: 60 });

  const toggleSave = (no: number) => useApp.getState().toggleSave(no);
  const shareOf = (p: Page): ShareLine | null =>
    p.kind === 'line' ? { text: p.line.text, no: p.line.no, attribution: p.line.attribution } : p.kind === 'yours' ? { text: p.line.text } : null;

  const menu = (p: Page) => {
    if (p.kind !== 'line' && p.kind !== 'yours') return;
    const isSaved = p.kind === 'line' && saved.includes(p.line.no);
    showActions({
      options: [
        { label: COPY.reader.menu.share, onPress: () => setShareLine(shareOf(p)) },
        {
          label: COPY.reader.menu.copy,
          onPress: () => {
            Clipboard.setStringAsync(typo(p.line.text)).catch(() => {});
            light();
          },
        },
        ...(p.kind === 'line'
          ? [
              { label: isSaved ? COPY.reader.menu.unsave : COPY.reader.menu.save, onPress: () => toggleSave(p.line.no) },
              { label: COPY.reader.menu.hide, destructive: true, onPress: () => useApp.getState().hideLine(p.line.no) },
            ]
          : []),
        { label: COPY.reader.menu.cancel, cancel: true },
      ],
    });
  };

  const paywall = (from: 'end' | 'chapter' | 'colorway' | 'share') => navigation.navigate('Paywall', { from });
  const dayN = dayCount(record);

  // Running head for the page in view.
  let left = '';
  let right = '';
  if (page?.kind === 'line') {
    left = chapterLabel(page.line.chapter);
    right = catalogueNo(page.line.no);
  } else if (page?.kind === 'yours') left = chapterLabel('yours');
  else if (page?.kind === 'night') {
    left = COPY.night.label;
    right = `Day ${dayN}`;
  }
  let onClear: (() => void) | undefined;
  if (mode.kind === 'chapter') {
    left = COPY.reader.only(CHAPTER_BY_ID[mode.id].name);
    onClear = () => setMode({ kind: 'mix' });
  } else if (mode.kind === 'saved') {
    left = COPY.reader.saved;
    onClear = () => setMode({ kind: 'mix' });
  } else if (mode.kind === 'volume') {
    left = COPY.reader.volumeOnly(mode.volume);
    onClear = () => setMode({ kind: 'mix' });
  }
  if (dayHead && page?.kind === 'line' && page.today) left = dayHead;
  const tappableChapter = mode.kind === 'mix' && page?.kind === 'line' && !dayHead;
  const chapterOfPage = page?.kind === 'line' ? page.line.chapter : null;
  const canFilter = chapterOfPage && (premium || ent.mix.includes(chapterOfPage));

  const showHint = !settings.hintDone && dayN <= 1 && active === 0 && pages.length > 1;

  const renderItem = ({ item, index }: { item: Page; index: number }) => {
    const isActive = index === active && isFocused;
    switch (item.kind) {
      case 'line':
        return (
          <LinePage
            line={item.line}
            height={height}
            colorway={colorway}
            active={isActive}
            saved={saved.includes(item.line.no)}
            onToggleSave={() => toggleSave(item.line.no)}
            onShare={() => setShareLine(shareOf(item))}
            onLongPress={() => menu(item)}
          />
        );
      case 'yours':
        return (
          <LinePage
            line={item.line}
            height={height}
            colorway={colorway}
            active={isActive}
            saved={false}
            canSave={false}
            onToggleSave={() => {}}
            onShare={() => setShareLine(shareOf(item))}
            onLongPress={() => menu(item)}
          />
        );
      case 'night':
        return (
          <NightPage
            height={height}
            colorway={colorway}
            active={isActive}
            rules={settings.standard}
            answer={record.nights[day]}
            day={dayN}
            onAnswer={held => useApp.getState().answerNight(day, held)}
          />
        );
      case 'end':
        return <EndCard height={height} colorway={colorway} active={isActive} onFull={() => paywall('end')} />;
      case 'access-intro':
        return (
          <NotePage
            height={height}
            colorway={colorway}
            active={isActive}
            label={COPY.oneTime.access.label}
            title={COPY.oneTime.access.title}
            body={COPY.oneTime.access.body}
            links={[{ title: COPY.oneTime.access.link, onPress: () => navigation.navigate('Record') }]}
          />
        );
      case 'volume':
        return (
          <NotePage
            height={height}
            colorway={colorway}
            active={isActive}
            label={COPY.oneTime.volume.label(item.volume)}
            title={COPY.oneTime.volume.title}
            body={COPY.oneTime.volume.body}
            links={[{ title: COPY.oneTime.volume.link, onPress: () => setMode({ kind: 'volume', volume: item.volume }) }]}
          />
        );
      case 'exhausted':
        return (
          <NotePage
            height={height}
            colorway={colorway}
            active={isActive}
            title={COPY.oneTime.exhausted.title}
            body={COPY.oneTime.exhausted.body}
            links={[
              { title: COPY.oneTime.exhausted.chapters, onPress: () => setSheet('chapters') },
              {
                title: COPY.oneTime.exhausted.again,
                onPress: () => {
                  const pool = new Set<ChapterId>(mode.kind === 'chapter' ? [mode.id] : ent.mix);
                  useApp.getState().resetSeen(LINES.filter(l => pool.has(l.chapter)).map(l => l.no));
                  setRebuild(r => r + 1);
                  listRef.current?.scrollToOffset({ offset: 0, animated: false });
                },
              },
            ]}
          />
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colorway.bg }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      <StatusBar style={colorway.statusBar} />
      <ColorwayBackground colorway={colorway} />
      {height > 0 ? (
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={p => p.key}
          renderItem={renderItem}
          extraData={[active, colorway.id, saved, record.nights[day], isFocused]}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={viewability}
          onScroll={() => {
            lastScroll.current = Date.now();
          }}
          scrollEventThrottle={64}
          windowSize={5}
          initialNumToRender={2}
          style={{ backgroundColor: 'transparent' }}
        />
      ) : null}

      <RunningHead
        left={left}
        right={right}
        color={colorway.secondary}
        onPressLeft={tappableChapter && canFilter ? () => setMode({ kind: 'chapter', id: chapterOfPage! }) : undefined}
        leftHint={tappableChapter && canFilter ? `Reads ${CHAPTER_BY_ID[chapterOfPage!].name} only` : undefined}
        onClear={onClear}
      />

      {showHint ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: MARGIN, bottom: insets.bottom + 30 + 44 }}>
          <T v="note" color={colorway.secondary}>
            {COPY.reader.hint}
          </T>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: MARGIN - 4,
          right: MARGIN - 16,
          bottom: insets.bottom + 30 - 22,
          height: 44,
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

      <ChaptersSheet
        visible={sheet === 'chapters'}
        inMix={mode.kind === 'mix'}
        onClose={() => setSheet(null)}
        onReadChapter={id => {
          setMode({ kind: 'chapter', id });
          setActive(0);
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        onShowMix={() => {
          if (mode.kind !== 'mix') {
            setMode({ kind: 'mix' });
            setActive(0);
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }
        }}
        onSaved={() => navigation.navigate('Saved')}
        onYourLines={() => navigation.navigate('YourLines')}
        onFull={() => paywall('chapter')}
      />
      <ColorwaySheet visible={sheet === 'colorway'} onClose={() => setSheet(null)} onFull={() => paywall('colorway')} />
      <ShareSheet
        line={shareLine}
        colorway={ent.colorway}
        premium={premium}
        onClose={() => setShareLine(null)}
        onLocked={() => {
          setShareLine(null);
          paywall('share');
        }}
      />
    </View>
  );
}

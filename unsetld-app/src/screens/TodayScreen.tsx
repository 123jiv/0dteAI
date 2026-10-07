import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildPool, customToLine, feedFor } from '../core/lines';
import { rankOf } from '../core/rank';
import type { Line } from '../core/types';
import { LANE_NAMES, LINES, LINES_BY_ID, RANK_CONFIG } from '../content';
import type { TabProps } from '../navigation/types';
import { tap } from '../services/haptics';
import { checkTrustedTime } from '../services/trustedTime';
import { useApp, useEntitlements } from '../state/store';
import { IconButton, T, TextureBackground } from '../ui/components';
import { Icon } from '../ui/icons';
import { fonts, radius, space, useTheme } from '../ui/theme';
import { ShareSheet } from './components/ShareSheet';

export function TodayScreen({ navigation, route }: TabProps<'Today'>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ent = useEntitlements();
  const settings = useApp(s => s.settings);
  const custom = useApp(s => s.customLines);
  const progress = useApp(s => s.progress);
  const favorites = useApp(s => s.favorites);
  const toggleFavorite = useApp(s => s.toggleFavorite);
  const dailyCheckIn = useApp(s => s.dailyCheckIn);
  const pushToast = useApp(s => s.pushToast);
  const [height, setHeight] = useState(0);
  const [shareLine, setShareLine] = useState<Line | null>(null);
  const listRef = useRef<FlatList<Line>>(null);
  const day = useApp(s => s.currentDay);
  const isFocused = useIsFocused();

  const lanesKey = ent.lanes.join(',');
  const openedId = route.params?.lineId;
  const feed = useMemo(() => {
    const pool = buildPool(LINES, { lanes: ent.lanes, tone: settings.tone, custom: ent.customLines ? custom : [] });
    const base = feedFor(pool, progress.installSalt, day, 80);
    const opened = openedId ? LINES_BY_ID[openedId] ?? custom.map(customToLine).find(c => c.id === openedId) : undefined;
    return opened ? [opened, ...base.filter(l => l.id !== opened.id)] : base;
    // dayOffset: re-pick when the dev tools time-travel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanesKey, settings.tone, custom, ent.customLines, progress.installSalt, day, openedId]);

  useEffect(() => {
    if (route.params?.lineId) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [route.params?.lineId]);

  // Opening the app and seeing today's line is the daily check-in.
  // Keyed on the current day, so reopening the app on a new day checks in too.
  const checkedIn = Boolean(progress.days[day]?.line);
  useEffect(() => {
    if (!isFocused || checkedIn) return;
    let cancelled = false;
    checkTrustedTime().then(t => {
      if (cancelled) return;
      if (t.suspect) {
        pushToast("Your phone's clock looks off. Set it to automatic to earn XP.", 'warn');
        return;
      }
      dailyCheckIn(t.verified);
    });
    return () => {
      cancelled = true;
    };
  }, [isFocused, checkedIn, day, dailyCheckIn, pushToast]);

  const todayRec = progress.days[day];
  const left = (todayRec?.nonNegotiable ? 0 : 1) + (todayRec?.mission ? 0 : 1);
  const rank = rankOf(RANK_CONFIG, progress.rankXP);
  const streak = progress.streak;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? (
        <FlatList
          ref={listRef}
          data={feed}
          keyExtractor={l => l.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={5}
          renderItem={({ item, index }) => (
            <LineCard
              line={item}
              height={height}
              topInset={insets.top}
              isToday={index === 0 && !route.params?.lineId}
              favorite={favorites.includes(item.id)}
              onFavorite={() => toggleFavorite(item.id)}
              onShare={() => setShareLine(item)}
            />
          )}
        />
      ) : null}

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + space.sm, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${streak} day streak. Rank ${rank.name}, ${progress.rankXP} XP`}
          onPress={() => navigation.navigate('Rank')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${theme.surface}e6`, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: theme.border }}>
          <Icon name="flame" size={16} color={theme.accent} />
          <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 13 }}>{streak}</Text>
          <View style={{ width: 1, height: 12, backgroundColor: theme.border, marginHorizontal: 4 }} />
          <Text style={{ color: theme.text, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1 }}>{rank.name}</Text>
          <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 12 }}>{`${progress.rankXP} XP`}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {left > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${left} things left today. Open Rank.`}
            onPress={() => navigation.navigate('Rank')}
            style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ color: theme.onAccent, fontFamily: fonts.sansSemi, fontSize: 12 }}>{`${left} left today`}</Text>
          </Pressable>
        ) : null}
      </View>

      <ShareSheet line={shareLine} onClose={() => setShareLine(null)} rankName={rank.name} />
    </View>
  );
}

// Module-level so FlatList gets a stable callback (it can't change after mount).
function onViewableItemsChanged({ viewableItems }: { viewableItems: ViewToken[] }) {
  if (viewableItems.length) tap();
}

function LineCard({
  line,
  height,
  topInset,
  isToday,
  favorite,
  onFavorite,
  onShare,
}: {
  line: Line;
  height: number;
  topInset: number;
  isToday: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onShare: () => void;
}) {
  const theme = useTheme();
  const [pop] = useState(() => new Animated.Value(0));
  const fav = () => {
    const nowFav = !favorite;
    onFavorite();
    if (nowFav) {
      pop.setValue(0);
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(pop, { toValue: 0, duration: 420, delay: 250, useNativeDriver: true }),
      ]).start();
    }
  };
  const long = line.text.length > 90;
  return (
    <Pressable
      onPress={fav}
      accessibilityRole="button"
      accessibilityLabel={`${line.text}${line.author ? `, ${line.author}` : ''}`}
      accessibilityHint={favorite ? 'Double tap to remove from favorites' : 'Double tap to favorite'}
      style={{ height, justifyContent: 'center', paddingHorizontal: space.xl + 4, overflow: 'hidden' }}>
      <TextureBackground texture={theme.texture} />
      <View style={{ position: 'absolute', top: topInset + 64, left: space.xl + 4, right: space.xl }}>
        {isToday ? (
          <T variant="label" color={theme.accent}>
            Today
          </T>
        ) : null}
      </View>
      <T variant="label" style={{ marginBottom: space.lg }}>
        {LANE_NAMES[line.lane] ?? ''}
      </T>
      <Text
        style={{ color: theme.text, fontFamily: fonts.serif, fontSize: long ? 30 : 38, lineHeight: long ? 36 : 45 }}
        maxFontSizeMultiplier={1.4}>
        {line.text}
      </Text>
      {line.author ? (
        <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: space.lg }}>
          {`${line.author}${line.ref ? `, ${line.ref}` : ''}${line.translator ? ` · trans. ${line.translator}` : ''}`}
        </Text>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          alignSelf: 'center',
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }],
        }}>
        <Icon name="heart-filled" size={96} color={theme.accent} />
      </Animated.View>

      <View style={{ position: 'absolute', right: space.lg, bottom: space.xxl, gap: space.md, alignItems: 'center' }}>
        <IconButton icon={favorite ? 'heart-filled' : 'heart'} label={favorite ? 'Remove favorite' : 'Favorite'} onPress={fav} color={favorite ? theme.accent : theme.text} size={26} />
        <IconButton icon="share" label="Share as story" onPress={onShare} size={26} />
      </View>
      {isToday ? (
        <View style={{ position: 'absolute', bottom: space.xl, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <T variant="caption">Swipe up for more</T>
        </View>
      ) : null}
    </Pressable>
  );
}

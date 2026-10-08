import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { DayKey } from '../../core/time';
import { breakBeats, catalogueNo, lineSize, typo } from '../../core/typography';
import type { Colorway, Line, TaskDone, WorkItem } from '../../core/types';
import { CHAPTER_BY_ID, chapterLabel } from '../../content';
import { COPY } from '../../content/copy';
import { light, medium } from '../../services/haptics';
import { proofImage } from '../../services/proof';
import { Icon } from '../../ui/icons';
import { Button, InlineLink } from '../../ui/kit';
import { clockTime } from '../../ui/ProofStamp';
import { T, useSerifScale } from '../../ui/text';
import { ease, font, hairline } from '../../ui/tokens';

/** Today's line: smaller than the old reader page, so the work fits under it. */
export function TodayLine({
  line,
  colorway,
  saved,
  onToggleSave,
  onShare,
  onLongPress,
}: {
  line: Line;
  colorway: Colorway;
  saved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onLongPress: () => void;
}) {
  const scale = useSerifScale();
  const size = lineSize(line.text, scale * 0.82);
  const lastTap = useRef(0);
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 400, easing: ease.out, useNativeDriver: true }).start();
  }, [a, line.no]);
  const attribution = line.attribution ? `${line.attribution.author} · ${line.attribution.source}`.toUpperCase() : null;
  const onPress = () => {
    const t = Date.now();
    if (t - lastTap.current < 300) {
      lastTap.current = 0;
      light();
      onToggleSave();
    } else lastTap.current = t;
  };
  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="label" color={colorway.secondary}>
          {chapterLabel(line.chapter)}
        </T>
        <T v="mono" color={colorway.secondary}>
          {catalogueNo(line.no)}
        </T>
      </View>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        accessibilityRole="text"
        accessibilityLabel={`Today's line. ${line.text}${line.attribution ? `. ${line.attribution.author}` : ''}`}
        style={{ marginTop: 16 }}>
        <Text allowFontScaling={false} lineBreakStrategyIOS="push-out" numberOfLines={5} style={{ fontFamily: font.serif, color: colorway.ink, ...size }}>
          {breakBeats(typo(line.text))}
        </Text>
        {attribution ? (
          <T v="label" color={colorway.secondary} style={{ marginTop: 12 }}>
            {attribution}
          </T>
        ) : null}
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 12, marginLeft: -11, gap: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? COPY.reader.a11y.unsave : COPY.reader.a11y.save}
          accessibilityState={{ selected: saved }}
          onPress={() => {
            light();
            onToggleSave();
          }}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icon name={saved ? 'bookmark-filled' : 'bookmark'} size={22} color={saved ? colorway.ink : colorway.secondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={COPY.reader.a11y.share}
          onPress={onShare}
          style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Icon name="share" size={22} color={colorway.secondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** The night check, inline on Today once it's due. */
export function NightBlock({
  colorway,
  answer,
  day,
  onAnswer,
}: {
  colorway: Colorway;
  answer: boolean | undefined;
  day: number;
  onAnswer: (held: boolean) => void;
}) {
  return (
    <View style={{ paddingTop: 24, borderTopWidth: hairline, borderTopColor: colorway.rule }} accessibilityLiveRegion="polite">
      <T v="label" color={colorway.secondary}>
        {COPY.night.label}
      </T>
      {answer === undefined ? (
        <>
          <T v="title.m" color={colorway.ink} style={{ marginTop: 12 }} accessibilityRole="header">
            {COPY.night.question}
          </T>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <Button
              title={COPY.night.held}
              ink={colorway.ink}
              ground={colorway.bg}
              style={{ flex: 1, height: 48 }}
              onPress={() => {
                medium();
                onAnswer(true);
              }}
            />
            <Button title={COPY.night.notToday} kind="outline" ink={colorway.ink} style={{ flex: 1, height: 48 }} onPress={() => onAnswer(false)} />
          </View>
        </>
      ) : (
        <View style={{ marginTop: 12, gap: 6 }}>
          <T v="title.m" color={colorway.ink}>
            {answer ? COPY.night.heldTitle : COPY.night.notedTitle}
          </T>
          <T v="body" color={colorway.secondary}>
            {answer ? COPY.night.heldBody(day) : COPY.night.notedBody(day)}
          </T>
        </View>
      )}
    </View>
  );
}

export function sourceLabel(item: WorkItem): string {
  if (item.source === 'rule') return COPY.today.yourStandard;
  if (item.source === 'own') return COPY.today.yourTask;
  return COPY.today.fromUnsetld(item.chapter ? CHAPTER_BY_ID[item.chapter].name : '');
}

/** One task of today's work. Tap to prove it. */
export function WorkRow({
  index,
  item,
  done,
  colorway,
  onPress,
  onLongPress,
  last,
}: {
  index: number;
  item: WorkItem;
  done: TaskDone | undefined;
  colorway: Colorway;
  onPress: () => void;
  onLongPress?: () => void;
  last: boolean;
}) {
  const thumb = done?.proof ? proofImage(done.proof.uri) : null;
  const sub = done ? (done.proof ? COPY.today.proven(clockTime(done.doneAt)) : COPY.today.done(clockTime(done.doneAt))) : sourceLabel(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.text} ${sub}`}
      accessibilityHint={done ? undefined : COPY.today.proveHint}
      accessibilityState={{ checked: Boolean(done) }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: colorway.rule,
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="mono" color={colorway.secondary} style={{ width: 40 }}>
        {String(index + 1).padStart(2, '0')}
      </T>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="list" color={done ? colorway.secondary : colorway.ink}>
          {item.text}
        </T>
        <T v="note" color={colorway.secondary} style={{ marginTop: 2 }}>
          {sub}
        </T>
      </View>
      {done?.proof ? (
        <View style={{ width: 28, height: 35, borderWidth: hairline, borderColor: colorway.rule, backgroundColor: colorway.rule, overflow: 'hidden' }}>
          {thumb ? <Image source={{ uri: thumb }} style={{ width: 28, height: 35 }} contentFit="cover" /> : null}
        </View>
      ) : (
        <View style={{ width: 14, height: 14, backgroundColor: done ? colorway.ink : 'transparent', borderWidth: done ? 0 : 1, borderColor: `${colorway.ink}66` }} />
      )}
    </Pressable>
  );
}

/** The once-only note on Day 3. */
export function AccessNote({ colorway, onRecord }: { colorway: Colorway; onRecord: () => void }) {
  return (
    <View style={{ gap: 8 }}>
      <T v="label" color={colorway.secondary}>
        {COPY.oneTime.access.label}
      </T>
      <T v="body" color={colorway.ink}>
        {COPY.oneTime.access.body}
      </T>
      <InlineLink title={COPY.oneTime.access.link} color={colorway.ink} onPress={onRecord} />
    </View>
  );
}

export type { DayKey };

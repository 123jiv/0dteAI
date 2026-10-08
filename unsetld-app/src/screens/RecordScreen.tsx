import { useEffect, useState } from 'react';
import { Animated, Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  accessState,
  barcode,
  barcodeGeometry,
  memberPriceOpenUnused,
  milestoneStatus,
  ROAD,
  roadPosition,
  stats,
  type MilestoneStatus,
} from '../core/record';
import { shortDate } from '../core/time';
import { milestoneNo } from '../core/typography';
import type { Milestone } from '../core/types';
import { MILESTONES } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { useAccessEnabled, useApp } from '../state/store';
import { InlineLink, NavRow, Screen, TextButton } from '../ui/kit';
import { T } from '../ui/text';
import { color as C, ease, font, hairline, MARGIN } from '../ui/tokens';
import { Walker } from '../ui/Walker';

const R = COPY.record;

function Barcode({ width }: { width: number }) {
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const bars = barcode(record, day);
  const { pitch, bar } = barcodeGeometry(bars.length, width);
  const total = bars.length * pitch;
  return (
    <View>
      <Svg width={width} height={60} accessibilityElementsHidden importantForAccessibility="no">
        {bars.map((b, i) => {
          const x = width - total + i * pitch + (pitch - bar) / 2;
          if (b.kind === 'missed') return <Rect key={b.day} x={x} y={54} width={bar} height={6} fill={C.ash} />;
          return <Rect key={b.day} x={x} y={0} width={bar} height={60} fill={b.kind === 'today' ? C.signal : C.bone} />;
        })}
      </Svg>
      <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="mono">{bars.length ? shortDate(bars[0].day) : ''}</T>
        <T v="mono">{R.today}</T>
      </View>
    </View>
  );
}

function Stat({ label, value, unit, divider }: { label: string; value: string; unit: string; divider?: boolean }) {
  return (
    <View style={{ flex: 1, height: 76, justifyContent: 'center', paddingLeft: divider ? 14 : 0, borderLeftWidth: divider ? hairline : 0, borderLeftColor: C.rule }}>
      <T v="label">{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 6 }}>
        <T v="mono.l" color={C.bone}>
          {value}
        </T>
        <T v="mono" style={{ fontSize: 13 }}>
          {unit}
        </T>
      </View>
    </View>
  );
}

function Road({ width, n }: { width: number; n: number }) {
  const [x] = useState(() => new Animated.Value(0));
  const target = roadPosition(n) * width;
  useEffect(() => {
    Animated.timing(x, { toValue: target, duration: 300, easing: ease.out, useNativeDriver: true }).start();
  }, [target, x]);
  const walkerW = 22;
  return (
    <View style={{ width, height: 56 }} accessible accessibilityLabel={`Day ${n} on the road to 365`}>
      <View style={{ position: 'absolute', top: 36, left: 0, width: target, height: 1.5, backgroundColor: C.bone }} />
      <View style={{ position: 'absolute', top: 36, left: target, right: 0, height: 1, backgroundColor: C.ruleStrong }} />
      {ROAD.map((d, i) => {
        const tx = (width * (i + 1)) / ROAD.length;
        const passed = n >= d;
        const lastOne = i === ROAD.length - 1;
        return (
          <View key={d}>
            <View style={{ position: 'absolute', top: 32, left: tx - (lastOne ? 1 : 0.5), width: 1, height: 8, backgroundColor: passed ? C.bone : C.ruleStrong }} />
            <View style={{ position: 'absolute', top: 44, ...(lastOne ? { right: 0 } : { left: tx - 20, width: 40, alignItems: 'center' }) }}>
              <T v="mono.s" color={passed ? C.bone : C.stone}>
                {String(d)}
              </T>
            </View>
          </View>
        );
      })}
      <Animated.View style={{ position: 'absolute', top: 36 - 49, left: -walkerW / 2, transform: [{ translateX: x }] }}>
        <Walker height={49} />
      </Animated.View>
    </View>
  );
}

function statusText(s: MilestoneStatus): string {
  switch (s.kind) {
    case 'open':
      return R.status.open;
    case 'used':
      return R.status.used;
    case 'paused':
      return R.status.paused;
    case 'locked':
      return R.status.left(s.daysLeft);
  }
}

function MilestoneRow({ m, status, onPress, last }: { m: Milestone; status: MilestoneStatus; onPress: () => void; last: boolean }) {
  const open = status.kind !== 'locked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Day ${m.day}, ${m.title}. ${m.short} ${statusText(status)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: hairline,
        borderBottomWidth: last ? hairline : 0,
        borderColor: C.rule,
        opacity: pressed ? 0.6 : 1,
      })}>
      <T v="mono" color={open ? C.bone : C.stone} style={{ width: 48 }}>
        {milestoneNo(m.day)}
      </T>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="row" color={open ? C.bone : C.muted}>
          {m.title}
        </T>
        <T v="note" color={C.stone}>
          {m.short}
        </T>
      </View>
      <T v="label" color={status.kind === 'open' ? C.bone : C.stone}>
        {statusText(status)}
      </T>
    </Pressable>
  );
}

/** Record: days on record, the barcode, three stats, and Access. */
export function RecordScreen({ navigation }: RootProps<'Record'>) {
  const { width } = useWindowDimensions();
  const w = width - MARGIN * 2;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const accessEnabled = useAccessEnabled();
  const s = stats(record, day);
  const access = accessState(record, day);
  const mpOpen = memberPriceOpenUnused(record, MILESTONES, day, collection);

  return (
    <Screen nav={<NavRow onBack={() => navigation.goBack()} right={<TextButton title={R.settings} onPress={() => navigation.navigate('Settings')} />} />}>
      <T v="label" style={{ marginTop: 24 }}>
        {R.label}
      </T>
      <View
        style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-end' }}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${s.total} ${R.daysOnRecord(s.total)}`}>
        <T v="numeral" style={{ fontFamily: font.serifRegular }}>
          {String(s.total)}
        </T>
        <T v="italic" color={C.stone} style={{ marginLeft: 12, paddingBottom: 14 }}>
          {R.daysOnRecord(s.total)}
        </T>
      </View>

      <View style={{ marginTop: 32 }}>
        <Barcode width={w} />
      </View>

      <View style={{ marginTop: 32, flexDirection: 'row', borderTopWidth: hairline, borderBottomWidth: hairline, borderColor: C.rule }}>
        <Stat label={R.run} value={String(s.run)} unit={R.days(s.run)} />
        <Stat label={R.longest} value={String(s.longest)} unit={R.days(s.longest)} divider />
        <Stat label={R.held} value={String(s.held)} unit={`${R.of} ${s.total}`} divider />
      </View>

      {accessEnabled ? (
        <View>
          <View style={{ marginTop: 48, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <T v="title.m" accessibilityRole="header">
              {R.access}
            </T>
            <TextButton title={R.details} onPress={() => navigation.navigate('Doc', { id: 'record' })} />
          </View>
          <T v="note" color={C.stone}>
            {R.accessNote}
          </T>
          <View style={{ marginTop: 32 }}>
            <Road width={w} n={s.total} />
          </View>
          {access.paused ? (
            <T v="note" color={C.stone} style={{ marginTop: 12 }}>
              {R.pausedNote}
            </T>
          ) : null}
          <View style={{ marginTop: 24 }}>
            {MILESTONES.map((m, i) => (
              <MilestoneRow
                key={m.id}
                m={m}
                status={milestoneStatus(record, m, day, collection)}
                last={i === MILESTONES.length - 1}
                onPress={() => navigation.navigate('Milestone', { id: m.id })}
              />
            ))}
          </View>
          {mpOpen ? (
            <View style={{ marginTop: 24, gap: 4 }}>
              <T v="body" color={C.stone}>
                {R.memberOpen}
              </T>
              <InlineLink title={R.memberLink} onPress={() => navigation.navigate('Milestone', { id: s.total >= 180 ? 'member-price-15' : 'member-price' })} />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ height: 64 }} />
    </Screen>
  );
}

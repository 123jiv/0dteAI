import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { allProofs, codeForCollection, pointsBalance, provenOn, tierStatus, type TierStatus } from '../core/points';
import {
  accessState,
  barcode,
  barcodeGeometry,
  milestoneStatus,
  ROAD,
  roadPosition,
  stats,
  type MilestoneStatus,
} from '../core/record';
import { shortDate } from '../core/time';
import { milestoneNo } from '../core/typography';
import type { Milestone } from '../core/types';
import { MILESTONES, POINTS } from '../content';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { openStore, redeem } from '../services/access';
import { light } from '../services/haptics';
import { putDayOnRecord, useAccessEnabled, useApp, useAppActive } from '../state/store';
import { showDialog } from '../ui/actions';
import { InlineLink, NavRow, Screen, TextButton } from '../ui/kit';
import { ProofThumb } from './ProofGalleryScreen';
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
      {/* The first date sits under the first bar, moving left only as far as it must to clear TODAY. */}
      <View style={{ marginTop: 8, flexDirection: 'row' }}>
        <View style={{ width: width - total + (pitch - bar) / 2, flexShrink: 1 }} />
        <T v="mono">{bars.length ? shortDate(bars[0].day) : ''}</T>
        <View style={{ flexGrow: 1, minWidth: 12 }} />
        <T v="mono">{R.today}</T>
      </View>
    </View>
  );
}

function Stat({ label, value, unit, divider }: { label: string; value: string; unit: string; divider?: boolean }) {
  // Padding and borders count toward a flex basis, so they sit on an inner view: the three columns stay equal.
  return (
    <View style={{ flex: 1, height: 76 }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingLeft: divider ? 14 : 0, borderLeftWidth: divider ? hairline : 0, borderLeftColor: C.rule }}>
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
    </View>
  );
}

function Road({ width, n }: { width: number; n: number }) {
  const target = roadPosition(n) * width;
  // Starts where the road last stood, so the walker only walks when the count has changed.
  const [x] = useState(() => new Animated.Value(roadPosition(useApp.getState().reading.road) * width));
  useEffect(() => {
    let live = true;
    // Reduce Motion: no translate; the walker and the walked line move without the walk.
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (!live) return;
        if (reduce) x.setValue(target);
        else Animated.timing(x, { toValue: target, duration: 300, easing: ease.out, useNativeDriver: false }).start();
      });
    useApp.getState().markRoad(n);
    return () => {
      live = false;
    };
  }, [n, target, x]);
  const walkerW = 22;
  return (
    <View style={{ width, height: 56 }} accessible accessibilityLabel={`Day ${n} on the road to 365`}>
      {/* The walked part follows the walker, over the rest of the road. */}
      <View style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 1, backgroundColor: C.ruleStrong }} />
      <Animated.View style={{ position: 'absolute', top: 36, left: 0, width: x, height: 1.5, backgroundColor: C.bone }} />
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

function tierText(s: TierStatus): string {
  return s.kind === 'ready' ? R.tierStatus.ready : s.kind === 'used' ? R.tierStatus.used : R.tierStatus.short(s.need);
}

/** A code tier: points on the left, what it's worth, and its status. Tappable when ready. */
function TierRow({ points, percent, status, last, onPress }: { points: number; percent: number; status: TierStatus; last: boolean; onPress: () => void }) {
  const ready = status.kind === 'ready';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${points} points, ${R.tierTitle(percent)}. ${tierText(status)}`}
      accessibilityState={{ disabled: !ready }}
      disabled={!ready}
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
      <T v="mono" color={ready ? C.bone : C.stone} style={{ width: 48 }}>
        {String(points)}
      </T>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <T v="row" color={ready ? C.bone : C.muted}>
          {R.tierTitle(percent)}
        </T>
        <T v="note" color={C.stone}>
          {R.tierSub(points, POINTS.maxOff)}
        </T>
      </View>
      <T v="label" color={ready ? C.bone : C.stone}>
        {tierText(status)}
      </T>
    </Pressable>
  );
}

/** Record: days on record, the barcode, three stats, proof and codes, and Access. */
export function RecordScreen({ navigation }: RootProps<'Record'>) {
  const { width } = useWindowDimensions();
  const w = width - MARGIN * 2;
  const record = useApp(s => s.record);
  const day = useApp(s => s.currentDay);
  const collection = useApp(s => s.remote.collection);
  const signedIn = useApp(s => Boolean(s.account.userId));
  const accessEnabled = useAccessEnabled();
  const s = stats(record, day);
  const access = accessState(record, day);
  const balance = pointsBalance(record, POINTS);
  const claimed = codeForCollection(record, collection);
  const proofs = allProofs(record);
  const recent = proofs.slice(0, 6);
  const thumb = Math.floor((w - 16) / 3);
  const [codeError, setCodeError] = useState<string | null>(null);
  const active = useAppActive();

  // Record in the foreground counts as an open (a widget tap lands here): today is always on record while it shows.
  useFocusEffect(
    useCallback(() => {
      if (active) putDayOnRecord(day);
    }, [active, day]),
  );

  const getCode = (tier: (typeof POINTS.tiers)[number]) => {
    if (!signedIn) return navigation.navigate('Account');
    showDialog(R.redeemTitle(tier.points, tier.percent), R.redeemBody(POINTS.maxOff, POINTS.codeValidDays), [
      { label: R.redeemNo, cancel: true },
      {
        label: R.redeemYes,
        onPress: async () => {
          setCodeError(null);
          const r = await redeem(tier.points, tier.percent);
          if (r.ok) {
            useApp.getState().claimCode(tier, { code: r.code, url: r.url });
            light();
          } else setCodeError(r.reason === 'used' ? R.oneEach : COPY.milestone.networkError);
        },
      },
    ]);
  };

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

      <View style={{ marginTop: 48, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T v="title.m" accessibilityRole="header">
          {R.proof}
        </T>
        {accessEnabled ? (
          <T v="body" color={C.stone}>
            {R.points(balance)}
          </T>
        ) : null}
      </View>
      <T v="note" color={C.stone}>
        {accessEnabled ? R.proofNote(POINTS.perProof) : R.proofNoteNoPoints}
      </T>
      {recent.length ? (
        <View style={{ marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {recent.map(p => (
            <View key={`${p.day}:${p.key}`} style={{ width: thumb, gap: 6 }}>
              <ProofThumb uri={p.proof.uri} size={thumb} label={COPY.proof.a11yPhoto(shortDate(p.day))} onPress={() => navigation.navigate('ProofGallery')} />
              <T v="mono.s">{shortDate(p.day)}</T>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <T v="note" color={C.stone}>
          {R.provenToday(provenOn(record, day))}
        </T>
        {proofs.length > recent.length ? <TextButton title={R.seeAll} onPress={() => navigation.navigate('ProofGallery')} /> : null}
      </View>

      {accessEnabled ? (
        <View style={{ marginTop: 32 }}>
          <T v="label">{R.codes}</T>
          <View style={{ marginTop: 8 }}>
            {POINTS.tiers.map((t, i) => (
              <TierRow
                key={t.points}
                points={t.points}
                percent={t.percent}
                status={tierStatus(record, POINTS, t, collection)}
                last={i === POINTS.tiers.length - 1}
                onPress={() => getCode(t)}
              />
            ))}
          </View>
          {claimed ? (
            <View style={{ marginTop: 16, gap: 6 }}>
              <T v="mono.l" selectable accessibilityLabel={`Your code: ${claimed.code}`}>
                {claimed.code}
              </T>
              <T v="note" color={C.stone}>
                {R.codeExpires(shortDate(claimed.expires))}
              </T>
              <InlineLink title={R.useCode} onPress={() => openStore(claimed.url)} />
              {Platform.OS === 'web' ? (
                <T v="mono.s" style={{ marginTop: 4 }}>
                  {R.previewCode}
                </T>
              ) : null}
            </View>
          ) : null}
          {codeError ? (
            <T v="note" color={C.stone} style={{ marginTop: 12 }}>
              {codeError}
            </T>
          ) : null}
        </View>
      ) : null}

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
                status={milestoneStatus(record, m, day)}
                last={i === MILESTONES.length - 1}
                onPress={() => navigation.navigate('Milestone', { id: m.id })}
              />
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ height: 64 }} />
    </Screen>
  );
}

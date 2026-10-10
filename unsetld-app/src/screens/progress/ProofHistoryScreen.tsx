import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { proofMonths, type ProofEntry, type ProofMonth } from '../../core/progress';
import { addDays, type DayKey } from '../../core/time';
import type { ProofPhoto } from '../../core/types';
import { MISSION_BY_ID, TRACK_BY_ID } from '../../content';
import { PROGRESS, tileDate } from '../../content/copy/progress';
import type { RootProps } from '../../navigation/types';
import { proofImage } from '../../services/proof';
import { useApp } from '../../state/store';
import { Card, EmptyState } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { NavRow, PageTitle } from '../../ui/kit';
import { clockTime, ProofStamp } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, GAP, MARGIN } from '../../ui/tokens';

const H = PROGRESS.history;
/** Thumbnails are square with this corner radius (§8). */
const TILE_RADIUS = 6;
const TILE_GAP = 6;

/** The mission's title; a retired one keeps its own, a removed one gets one from its id or its area. */
function titleOf(e: ProofEntry): string {
  return MISSION_BY_ID[e.done.missionId]?.title ?? H.fallbackTitle(e.done.missionId, TRACK_BY_ID[e.done.track]?.short ?? '');
}

/** "School", or '' for an area an old record names that the app no longer has. */
const areaOf = (e: ProofEntry) => TRACK_BY_ID[e.done.track]?.short ?? '';

/**
 * A square proof thumbnail (also for other screens that show a proof). When the photo is gone it
 * shows a quiet placeholder: `placeholder` for a photo the retention setting cleared, or "Not on
 * this phone" for one that is missing. Thumbnails under 64pt show no text.
 */
export function ProofThumb({
  uri,
  size,
  height = size,
  onPress,
  label,
  placeholder,
}: {
  uri: string;
  size: number;
  height?: number;
  onPress?: () => void;
  label: string;
  placeholder?: string;
}) {
  const src = proofImage(uri);
  const text = uri ? H.notHere : (placeholder ?? H.notHere);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ width: size, height, borderRadius: TILE_RADIUS, backgroundColor: C.card, overflow: 'hidden', opacity: pressed ? 0.8 : 1 })}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height }} contentFit="cover" />
      ) : size >= 64 ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 8 }]}>
          <T v="mono.s" align="center">
            {text}
          </T>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * One proof on the grid. A photo fills the square (a before/after pair shows the after, with a
 * small mark). A photo that's gone, a timer-only proof, or an old entry with neither is a quiet
 * tile with the area and the date, so the history never has a hole in it.
 */
function Tile({ e, size, onPress }: { e: ProofEntry; size: number; onPress: () => void }) {
  const src = e.cover ? proofImage(e.cover.uri) : null;
  const area = areaOf(e);
  const pair = e.done.photos.some(p => p.kind === 'before');
  const seconds = e.done.timerSeconds ?? 0;
  const state = src ? 'photo' : e.tile === 'photo' ? (e.cover?.uri ? 'missing' : 'cleared') : e.tile;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={H.a11yTile(titleOf(e), area, e.day, state, seconds)}
      accessibilityHint={H.a11yTileHint}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: TILE_RADIUS,
        backgroundColor: pressed ? C.cardPressed : C.card,
        overflow: 'hidden',
        opacity: pressed && src ? 0.8 : 1,
      })}>
      {src ? (
        <>
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={e.key} />
          {pair ? (
            <View style={{ position: 'absolute', right: 6, bottom: 6, borderRadius: 4, padding: 3, backgroundColor: 'rgba(10,10,10,0.6)' }}>
              <Icon name="before-after" size={14} color={C.bone} />
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ flex: 1, padding: 9, justifyContent: 'space-between' }}>
          {/* Sentence case at note size: "Organization" fits a third of the screen on one line. */}
          <T v="note" color={C.stone} numberOfLines={1}>
            {area}
          </T>
          {state === 'timer' ? (
            <T v="saved" color={C.muted} style={{ fontVariant: ['lining-nums'] }}>
              {H.timerTile(seconds)}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T v="mono.s">{tileDate(e.day)}</T>
            <Icon name={state === 'timer' ? 'timer' : state === 'none' ? 'check' : 'camera'} size={14} color={C.ash} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

type Row = { type: 'month'; key: string; month: ProofMonth } | { type: 'grid'; key: string; entries: ProofEntry[] };

/** Months and rows of three, for one virtualized list. */
function rowsOf(months: ProofMonth[]): Row[] {
  const rows: Row[] = [];
  for (const m of months) {
    rows.push({ type: 'month', key: m.month, month: m });
    for (let i = 0; i < m.entries.length; i += 3) rows.push({ type: 'grid', key: `${m.month}:${i}`, entries: m.entries.slice(i, i + 3) });
  }
  return rows;
}

/**
 * Proof history (§8): every proven mission, by month, as a private visual record. Photos the
 * retention setting cleared, and timer-only proofs, keep their place as quiet tiles. Tap one for
 * the viewer: the photo with its stamp, what it proved and when.
 */
export function ProofHistoryScreen({ navigation }: RootProps<'ProofHistory'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const record = useApp(s => s.record);
  const today = useApp(s => s.currentDay);
  const keepDays = useApp(s => s.settings.proofRetentionDays);
  const months = proofMonths(record);
  const rows = rowsOf(months);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = openKey ? (months.flatMap(m => m.entries).find(e => e.key === openKey) ?? null) : null;
  const w = width - MARGIN * 2;
  const size = Math.floor((w - TILE_GAP * 2) / 3);
  const thisYear = today.slice(0, 4);
  // A photo gone from the record says how long photos are kept only when that's why it went:
  // it's older than the setting. One cleared under a shorter earlier setting just says cleared.
  const cutoff = keepDays > 0 ? addDays(today, -keepDays) : null;
  const clearedOn = (day: DayKey) => (cutoff && day < cutoff ? H.cleared(keepDays) : H.cleared(0));
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Progress' }));

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={back} />
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View>
            <PageTitle title={H.title} />
            <T v="meta" color={C.stone} style={{ marginTop: 10 }}>
              {H.privacy}
            </T>
          </View>
        }
        ListEmptyComponent={
          <View style={{ marginTop: GAP.block }}>
            <EmptyState title={H.empty.title} body={H.empty.body} />
          </View>
        }
        ListFooterComponent={
          rows.length ? (
            <T v="note" color={C.stone} style={{ marginTop: GAP.block }}>
              {H.keep(keepDays)}
            </T>
          ) : null
        }
        renderItem={({ item }) =>
          item.type === 'month' ? (
            <View
              style={{ marginTop: GAP.section, marginBottom: 14 }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={`${PROGRESS.month(item.month.month, thisYear)}. ${H.monthMeta(item.month.activeDays, item.month.missions)}`}>
              <T v="title.m">{PROGRESS.month(item.month.month, thisYear)}</T>
              <T v="meta" color={C.stone} style={{ marginTop: 4 }}>
                {H.monthMeta(item.month.activeDays, item.month.missions)}
              </T>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: TILE_GAP, marginBottom: TILE_GAP }}>
              {item.entries.map(e => (
                <Tile key={e.key} e={e} size={size} onPress={() => setOpenKey(e.key)} />
              ))}
            </View>
          )
        }
      />
      {open ? <Viewer entry={open} width={w} maxHeight={height * 0.62} cleared={clearedOn(open.day)} onClose={() => setOpenKey(null)} /> : null}
    </View>
  );
}

/** One photo at 4:5 with the stamp printed on it; the placeholder when it's gone. */
function Photo({ photo, day, width, maxHeight, label, cleared, said }: { photo: ProofPhoto; day: DayKey; width: number; maxHeight: number; label: string; cleared: string; said: string }) {
  const src = proofImage(photo.uri);
  // A photo that's gone keeps a smaller frame: the placeholder needs no 4:5 of empty space.
  const h = src ? Math.min((width * 5) / 4, maxHeight) : Math.min(width, 200);
  // Same insets as the mission's proof frame: a half-width stamp needs the room for BEFORE.
  const small = width < 200;
  const inset = small ? 6 : 12;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={src ? said : photo.uri ? H.notHere : cleared}
      style={{ width, height: h, borderRadius: TILE_RADIUS, backgroundColor: C.card, overflow: 'hidden' }}>
      {src ? (
        <>
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={{ position: 'absolute', left: inset, right: inset, bottom: inset }}>
            <ProofStamp day={day} takenAt={photo.takenAt} label={label} small={small} />
          </View>
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 16, gap: 10 }]}>
          <Icon name="camera" size={22} color={C.ash} />
          <T v="meta" color={C.stone} align="center">
            {photo.uri ? H.notHere : cleared}
          </T>
        </View>
      )}
    </View>
  );
}

/** The proof full width (the photo, the before and after, or the timer), with what it proved. */
function Viewer({ entry, width, maxHeight, cleared, onClose }: { entry: ProofEntry; width: number; maxHeight: number; cleared: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { done, day } = entry;
  const title = titleOf(entry);
  const mission = MISSION_BY_ID[done.missionId];
  const before = done.photos.find(p => p.kind === 'before');
  const after = done.photos.find(p => p.kind === 'after');
  const pair = before && after ? [before, after] : null;
  const single = pair ? null : entry.cover;
  const half = Math.floor((width - 8) / 2);
  const area = areaOf(entry);
  const seconds = done.timerSeconds ?? 0;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.ink }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <NavRow onClose={onClose} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: 16, paddingBottom: insets.bottom + 40 }}>
        {area ? (
          <T v="kicker" color={C.stone}>
            {area}
          </T>
        ) : null}
        <T v="title.m" accessibilityRole="header" style={{ marginTop: area ? 10 : 0 }}>
          {title}
        </T>
        <View style={{ marginTop: 24 }}>
          {pair ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Photo photo={pair[0]} day={day} width={half} maxHeight={maxHeight} label={H.stampBefore} cleared={cleared} said={`${H.before}. ${H.a11yPhoto(title)}`} />
              <Photo photo={pair[1]} day={day} width={half} maxHeight={maxHeight} label={H.stampAfter} cleared={cleared} said={`${H.after}. ${H.a11yPhoto(title)}`} />
            </View>
          ) : single ? (
            <Photo photo={single} day={day} width={width} maxHeight={maxHeight} label={title.toUpperCase()} cleared={cleared} said={H.a11yPhoto(title)} />
          ) : seconds > 0 ? (
            <Card style={{ paddingVertical: 28 }}>
              <View accessible accessibilityLabel={H.timer(seconds)} style={{ alignItems: 'flex-start', gap: 10 }}>
                <Icon name="timer" size={22} color={C.muted} />
                <T v="stat">{PROGRESS.mmss(seconds)}</T>
                <T v="meta" color={C.stone}>
                  {H.timerLabel}
                </T>
              </View>
            </Card>
          ) : null}
        </View>
        <View style={{ marginTop: 18, gap: 6 }}>
          <T v="meta" color={C.bone}>
            {H.proven(clockTime(done.doneAt), day, done.points)}
          </T>
          {seconds > 0 && (pair || single) ? (
            <T v="meta" color={C.stone}>
              {H.timer(seconds)}
            </T>
          ) : null}
        </View>
        {mission ? (
          <T v="note" color={C.stone} style={{ marginTop: 16 }}>
            {mission.proof}
          </T>
        ) : null}
        <T v="note" color={C.stone} style={{ marginTop: 8 }}>
          {H.checked}
        </T>
      </ScrollView>
    </View>
  );
}

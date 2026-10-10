import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allDone } from '../core/progress';
import { addDays, shortDate, type DayKey } from '../core/time';
import type { Mission, MissionDone, ProofPhoto } from '../core/types';
import { MISSION_BY_ID, TRACK_BY_ID } from '../content';
import { PROGRESS } from '../content/copy/progress';
import type { RootProps } from '../navigation/types';
import { proofImage } from '../services/proof';
import { useApp } from '../state/store';
import { NavRow, PageTitle } from '../ui/kit';
import { clockTime, ProofStamp } from '../ui/ProofStamp';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

const G = PROGRESS.gallery;

/**
 * A proof thumbnail. When the photo is gone it shows a quiet placeholder: `placeholder`
 * (e.g. "Photo cleared after 30 days") for a photo the retention setting cleared, or
 * "Not on this phone" for one that is missing. Thumbnails under 64pt show no text.
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
  const text = uri ? G.notHere : placeholder ?? G.notHere;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height,
        borderWidth: hairline,
        borderColor: C.rule,
        backgroundColor: C.raise,
        overflow: 'hidden',
        opacity: pressed ? 0.8 : 1,
      })}>
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

interface Item {
  day: DayKey;
  done: MissionDone;
  mission: Mission | undefined;
  title: string;
  /** The photo on the grid: the after photo of a pair, else the only one. */
  cover: ProofPhoto | null;
}

/** Proven missions with photos, newest first. */
function items(record: Parameters<typeof allDone>[0]): Item[] {
  return allDone(record)
    .filter(m => m.verification?.status === 'accepted' && (m.photos?.length ?? 0) > 0)
    .reverse()
    .map(({ day, ...done }) => {
      const mission = MISSION_BY_ID[done.missionId];
      return {
        day,
        done,
        mission,
        title: mission?.title ?? G.fallbackTitle(done.missionId, TRACK_BY_ID[done.track]?.short ?? ''),
        cover: (done.photos ?? []).find(p => p.kind !== 'before') ?? done.photos?.[0] ?? null,
      };
    });
}

/** One photo at 4:5 with the stamp printed on it; the placeholder when it's gone. */
function Photo({ photo, day, width, maxHeight, label, cleared, said }: { photo: ProofPhoto; day: DayKey; width: number; maxHeight: number; label: string; cleared: string; said: string }) {
  const src = proofImage(photo.uri);
  const h = Math.min((width * 5) / 4, maxHeight);
  // Same insets as the mission's proof frame: a half-width stamp needs the room for BEFORE.
  const small = width < 200;
  const inset = small ? 6 : 12;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={src ? said : photo.uri ? G.notHere : cleared}
      style={{ width, height: h, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise, overflow: 'hidden' }}>
      {src ? (
        <>
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={{ position: 'absolute', left: inset, right: inset, bottom: inset }}>
            <ProofStamp day={day} takenAt={photo.takenAt} label={label} small={small} />
          </View>
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
          <T v="mono" align="center">
            {photo.uri ? G.notHere : cleared}
          </T>
        </View>
      )}
    </View>
  );
}

/** Every proven mission's photo, newest first, with the mission it proved. */
export function ProofGalleryScreen({ navigation }: RootProps<'ProofGallery'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const record = useApp(s => s.record);
  const today = useApp(s => s.currentDay);
  const keepDays = useApp(s => s.settings.proofRetentionDays);
  const list = items(record);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = openKey ? (list.find(i => `${i.day}:${i.done.missionId}` === openKey) ?? null) : null;
  const gap = 8;
  const size = Math.floor((width - MARGIN * 2 - gap * 2) / 3);
  const w = width - MARGIN * 2;
  // A photo gone from the record says how long photos are kept only when that's why it went:
  // it's older than the setting. One cleared under a shorter earlier setting just says cleared.
  const cutoff = keepDays > 0 ? addDays(today, -keepDays) : null;
  const clearedOn = (day: DayKey) => (cutoff && day < cutoff ? G.cleared(keepDays) : G.cleared(0));
  const back = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Today'));

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={back} />
      <FlatList
        data={list}
        keyExtractor={i => `${i.day}:${i.done.missionId}`}
        numColumns={3}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40, gap: 20 }}
        ListHeaderComponent={<PageTitle title={G.title} body={G.note(keepDays)} style={{ marginBottom: 12 }} />}
        ListEmptyComponent={
          <View style={{ marginTop: 16, gap: 8 }}>
            <T v="title.m">{G.empty}</T>
            <T v="body" color={C.stone}>
              {G.emptyBody}
            </T>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: size, gap: 6 }}>
            <ProofThumb
              uri={item.cover?.uri ?? ''}
              size={size}
              height={Math.round((size * 5) / 4)}
              placeholder={clearedOn(item.day)}
              label={G.a11yThumb(item.title, shortDate(item.day))}
              onPress={() => setOpenKey(`${item.day}:${item.done.missionId}`)}
            />
            {/* The thumbnail already says the title and date to VoiceOver. */}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: 6 }}>
              <T v="note" numberOfLines={2}>
                {item.title}
              </T>
              <T v="mono.s">{shortDate(item.day)}</T>
            </View>
          </View>
        )}
      />
      {open ? <Viewer item={open} width={w} maxHeight={height * 0.62} cleared={clearedOn(open.day)} onClose={() => setOpenKey(null)} /> : null}
    </View>
  );
}

/** The photo (or the before and after) full width, with what it proved. */
function Viewer({ item, width, maxHeight, cleared, onClose }: { item: Item; width: number; maxHeight: number; cleared: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { done, day, title, mission } = item;
  const before = (done.photos ?? []).find(p => p.kind === 'before');
  const after = (done.photos ?? []).find(p => p.kind === 'after');
  const pair = before && after ? [before, after] : null;
  const single = pair ? null : item.cover;
  const half = Math.floor((width - 8) / 2);
  // The mission's area, "School". Older records may name an area that's gone: then nothing shows.
  const area = TRACK_BY_ID[done.track]?.short ?? '';
  const proven = G.proven(clockTime(done.doneAt), shortDate(day), done.points);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.ink }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <NavRow onClose={onClose} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: 16, paddingBottom: insets.bottom + 40 }}>
        {area ? <T v="label">{area}</T> : null}
        <T v="title.m" accessibilityRole="header" style={{ marginTop: area ? 8 : 0 }}>
          {title}
        </T>
        <View style={{ marginTop: 20 }}>
          {pair ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Photo photo={pair[0]} day={day} width={half} maxHeight={maxHeight} label={G.stampBefore} cleared={cleared} said={`${G.before}. ${G.a11yPhoto(title)}`} />
              <Photo photo={pair[1]} day={day} width={half} maxHeight={maxHeight} label={G.stampAfter} cleared={cleared} said={`${G.after}. ${G.a11yPhoto(title)}`} />
            </View>
          ) : single ? (
            <Photo photo={single} day={day} width={width} maxHeight={maxHeight} label={title.toUpperCase()} cleared={cleared} said={G.a11yPhoto(title)} />
          ) : null}
        </View>
        <View style={{ marginTop: 16, gap: 6 }}>
          <T v="mono" color={C.bone}>
            {proven}
          </T>
          {done.timerSeconds ? <T v="mono">{G.timer(done.timerSeconds)}</T> : null}
        </View>
        {mission ? (
          <T v="note" color={C.stone} style={{ marginTop: 16 }}>
            {mission.proof}
          </T>
        ) : null}
        <T v="note" color={C.stone} style={{ marginTop: 8 }}>
          {G.checked}
        </T>
      </ScrollView>
    </View>
  );
}

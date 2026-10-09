import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allDone } from '../core/progress';
import { shortDate, type DayKey } from '../core/time';
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
    .filter(m => m.verification.status === 'accepted' && m.photos.length > 0)
    .reverse()
    .map(({ day, ...done }) => {
      const mission = MISSION_BY_ID[done.missionId];
      return {
        day,
        done,
        mission,
        title: mission?.title ?? G.fallbackTitle(done.missionId),
        cover: done.photos.find(p => p.kind !== 'before') ?? done.photos[0] ?? null,
      };
    });
}

/** One photo at 4:5 with the stamp printed on it; the placeholder when it's gone. */
function Photo({ photo, day, width, maxHeight, label, cleared, said }: { photo: ProofPhoto; day: DayKey; width: number; maxHeight: number; label: string; cleared: string; said: string }) {
  const src = proofImage(photo.uri);
  const h = Math.min((width * 5) / 4, maxHeight);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={src ? said : photo.uri ? G.notHere : cleared}
      style={{ width, height: h, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise, overflow: 'hidden' }}>
      {src ? (
        <>
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
            <ProofStamp day={day} takenAt={photo.takenAt} label={label} small={width < 200} />
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
  const keepDays = useApp(s => s.settings.proofRetentionDays);
  const list = items(record);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = openKey ? (list.find(i => `${i.day}:${i.done.missionId}` === openKey) ?? null) : null;
  const gap = 8;
  const size = Math.floor((width - MARGIN * 2 - gap * 2) / 3);
  const w = width - MARGIN * 2;
  const cleared = G.cleared(keepDays);

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={() => navigation.goBack()} />
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
              placeholder={cleared}
              label={G.a11yThumb(item.title, shortDate(item.day))}
              onPress={() => setOpenKey(`${item.day}:${item.done.missionId}`)}
            />
            <T v="note" numberOfLines={2}>
              {item.title}
            </T>
            <T v="mono.s">{shortDate(item.day)}</T>
          </View>
        )}
      />
      {open ? <Viewer item={open} width={w} maxHeight={height * 0.62} cleared={cleared} onClose={() => setOpenKey(null)} /> : null}
    </View>
  );
}

/** The photo (or the before and after) full width, with what it proved. */
function Viewer({ item, width, maxHeight, cleared, onClose }: { item: Item; width: number; maxHeight: number; cleared: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { done, day, title, mission } = item;
  const before = done.photos.find(p => p.kind === 'before');
  const after = done.photos.find(p => p.kind === 'after');
  const pair = before && after ? [before, after] : null;
  const single = pair ? null : item.cover;
  const half = Math.floor((width - 8) / 2);
  const track = TRACK_BY_ID[done.track]?.short.toUpperCase() ?? '';
  const proven = G.proven(clockTime(done.doneAt), shortDate(day), done.points);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.ink }]} accessibilityViewIsModal>
      <NavRow onClose={onClose} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGIN, paddingTop: 16, paddingBottom: insets.bottom + 40 }}>
        <T v="label">{[PROGRESS.slot[done.slot], track].filter(Boolean).join(' · ')}</T>
        <T v="title.m" accessibilityRole="header" style={{ marginTop: 8 }}>
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

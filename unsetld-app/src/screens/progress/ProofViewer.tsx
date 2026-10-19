// A proof full screen, over the page that opened it (Proof history, a day's page): the photo with
// its stamp, the before and after, or the timer; what it proved and when. Private: no share, no
// export. A photo that's gone says why instead of leaving a hole.
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, type DayKey } from '../../core/time';
import type { ProofPhoto } from '../../core/types';
import { historyMission } from '../../content';
import { PROGRESS } from '../../content/copy/progress';
import { proofImage } from '../../services/proof';
import { useApp } from '../../state/store';
import { Card } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { NavRow, TextButton } from '../../ui/kit';
import { clockTime, ProofStamp } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, MARGIN } from '../../ui/tokens';
import { useLayoutWidth } from './measure';
import { TILE_RADIUS } from './ProofTile';
import type { ProofView } from './proofView';

const H = PROGRESS.history;

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
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
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

/**
 * The proof full width (the photo, the before and after, or the timer), with what it proved.
 * `onOpenDay`: a quiet link to the proof's day on the record (not shown on the day's own page).
 */
export function ProofViewer({ proof, onClose, onOpenDay }: { proof: ProofView; onClose: () => void; onOpenDay?: () => void }) {
  const insets = useSafeAreaInsets();
  const today = useApp(s => s.currentDay);
  const keepDays = useApp(s => s.settings.proofRetentionDays);
  const [frame, onLayout] = useLayoutWidth();
  const { height } = useWindowDimensions();
  const width = frame - MARGIN * 2;
  const { day, title, area, photos, cover } = proof;
  // How it was proven, for a mission retired since too (history only: content historyMission).
  const mission = historyMission(proof.missionId);
  const before = photos.find(p => p.kind === 'before');
  const after = photos.find(p => p.kind === 'after');
  const pair = before && after ? [before, after] : null;
  const single = pair ? null : cover;
  const half = Math.floor((width - 8) / 2);
  const seconds = proof.timerSeconds;
  // A photo gone from the record says how long photos are kept only when that's why it went:
  // it's older than the setting. One cleared under a shorter earlier setting just says cleared.
  const cutoff = keepDays > 0 ? addDays(today, -keepDays) : null;
  const cleared = cutoff && day < cutoff ? H.cleared(keepDays) : H.cleared(0);
  const maxHeight = Math.round(height * 0.62);
  return (
    <View onLayout={onLayout} style={[StyleSheet.absoluteFill, { backgroundColor: C.ink }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
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
                <T v="stat">{PROGRESS.clock(seconds)}</T>
                <T v="meta" color={C.stone}>
                  {H.timerLabel}
                </T>
              </View>
            </Card>
          ) : null}
        </View>
        <View style={{ marginTop: 18, gap: 6 }}>
          <T v="meta" color={C.bone}>
            {H.proven(clockTime(proof.doneAt), day, today, proof.points)}
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
        {onOpenDay ? <TextButton title={H.openDay} onPress={onOpenDay} align="left" color={C.muted} style={{ marginTop: 12 }} /> : null}
      </ScrollView>
    </View>
  );
}

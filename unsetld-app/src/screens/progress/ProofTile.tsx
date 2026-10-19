// One proof as the record shows it (Recent proof, Proof history, a day's page): the photo, or a
// quiet tile that keeps its place when there's no photo to show. Never a broken image.
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { PROGRESS, tileDate } from '../../content/copy/progress';
import { proofImage } from '../../services/proof';
import { Icon } from '../../ui/icons';
import { T } from '../../ui/text';
import { color as C } from '../../ui/tokens';
import type { ProofView } from './proofView';

/** Thumbnails are square with this corner radius (§8). */
export const TILE_RADIUS = 6;

/**
 * What a tile shows: the photo; a photo the retention setting cleared (uri '') or one missing from
 * this phone; a timer-only proof; or an old entry with neither.
 */
export type TileState = 'photo' | 'cleared' | 'missing' | 'timer' | 'none';

export function tileState(p: ProofView): TileState {
  if (p.cover) return proofImage(p.cover.uri) ? 'photo' : p.cover.uri ? 'missing' : 'cleared';
  return p.timerSeconds > 0 ? 'timer' : 'none';
}

/** Whether any of the proof's photos is still on this phone (there's something to open). */
export const hasPhoto = (p: ProofView) => p.photos.some(ph => Boolean(proofImage(ph.uri)));

/**
 * A square proof. A photo fills it (a before/after pair shows the after, with a small mark).
 * Otherwise a quiet tile: under 72pt one centred mark (the timer's time, a camera for a photo
 * that's gone); larger, the mission at the top (or its area, where the mission is the heading
 * already: `name`), the timer's time in the middle and the date at the bottom, so the record never
 * has a hole in it. With no `onPress` and no `label` it's decoration (inside a row that says it all).
 */
export function ProofTile({
  proof,
  size,
  label,
  hint,
  onPress,
  name = 'title',
}: {
  proof: ProofView;
  size: number;
  label?: string;
  hint?: string;
  onPress?: () => void;
  name?: 'title' | 'area';
}) {
  const state = tileState(proof);
  const src = state === 'photo' && proof.cover ? proofImage(proof.cover.uri) : null;
  const pair = proof.photos.some(p => p.kind === 'before');
  const compact = size < 72;
  const icon = state === 'timer' ? 'timer' : state === 'none' ? 'check' : 'camera';

  const content = src ? (
    <>
      <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" recyclingKey={proof.key} />
      {pair && size >= 64 ? (
        <View style={{ position: 'absolute', right: 6, bottom: 6, borderRadius: 4, padding: 3, backgroundColor: 'rgba(10,10,10,0.6)' }}>
          <Icon name="before-after" size={14} color={C.bone} />
        </View>
      ) : null}
    </>
  ) : compact ? (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {state === 'timer' ? (
        <T v="mono" color={C.muted}>
          {PROGRESS.clock(proof.timerSeconds)}
        </T>
      ) : (
        <Icon name={icon} size={18} color={C.ash} />
      )}
    </View>
  ) : (
    <View style={{ flex: 1, padding: 9, justifyContent: 'space-between' }}>
      {/* Sentence case at note size; the mission's title takes two lines where the tile allows. */}
      <T v="note" color={name === 'area' ? C.stone : C.muted} numberOfLines={name === 'area' || state === 'timer' || size < 96 ? 1 : 2}>
        {name === 'area' ? proof.area : proof.title}
      </T>
      {state === 'timer' ? (
        <T v="saved" color={C.muted}>
          {PROGRESS.clock(proof.timerSeconds)}
        </T>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T v="mono.s">{tileDate(proof.day)}</T>
        <Icon name={icon} size={14} color={C.ash} />
      </View>
    </View>
  );

  const frame = { width: size, height: size, borderRadius: TILE_RADIUS, overflow: 'hidden' as const };
  if (!onPress) {
    return (
      <View
        accessible={Boolean(label)}
        accessibilityRole={label ? 'image' : undefined}
        accessibilityLabel={label}
        aria-hidden={label ? undefined : true}
        style={[frame, { backgroundColor: C.card }]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [frame, { backgroundColor: pressed ? C.cardPressed : C.card, opacity: pressed && src ? 0.8 : 1 }]}>
      {content}
    </Pressable>
  );
}

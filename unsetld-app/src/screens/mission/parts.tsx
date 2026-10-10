// Pieces shared by the Mission screen's stages: the heading (area, title, time and points),
// the Proof card, a proof photo with its stamp, and the camera notes. Quiet: spacing and one
// raised card, no rules between parts (UX_REDESIGN 2 and 5).
import { Image } from 'expo-image';
import { Linking, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DayKey } from '../../core/time';
import type { Mission, ProofPhoto, TrackId } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { MISSION } from '../../content/copy/mission';
import { PROOF_KIND } from '../../content/copy/proof';
import { proofImage } from '../../services/proof';
import { Card, ProofMeta } from '../../ui/blocks';
import { Icon } from '../../ui/icons';
import { TextButton } from '../../ui/kit';
import { ProofStamp } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, GAP, radius } from '../../ui/tokens';

/**
 * Lining figures for serif text with numbers in it. Cormorant's default old-style figures
 * make "10" read as "Io" ("Stretch for 10 Minutes", "+10").
 */
export const LINING = { fontVariant: ['lining-nums' as const] };

/** The mission's goal area, "School": the one it's in the day for when given, else its own. */
export function areaName(m: Mission, area?: TrackId): string {
  return TRACK_BY_ID[area ?? m.track]?.short ?? '';
}

/**
 * The top of a mission, in the same order as its card on Today: the area (kicker), the
 * title (serif), then time and points. How it's proven follows in the Proof card.
 */
export function MissionHeading({ mission, area }: { mission: Mission; area?: TrackId }) {
  const name = areaName(mission, area);
  return (
    <View style={{ marginTop: 16 }}>
      {name ? (
        <T v="kicker" color={C.stone} style={{ marginBottom: 12 }}>
          {name}
        </T>
      ) : null}
      <T v="title.xl" accessibilityRole="header" style={LINING}>
        {mission.title}
      </T>
      <T v="meta" color={C.muted} style={{ marginTop: 12 }} accessibilityLabel={MISSION.a11y.meta(mission.minutes, mission.points)}>
        {MISSION.meta(mission.minutes, mission.points)}
      </T>
    </View>
  );
}

/** The one instruction sentence under the heading. */
export function Instruction({ children }: { children: string }) {
  return (
    <T v="body" color={C.muted} style={{ marginTop: 20, fontSize: 17, lineHeight: 25 }}>
      {children}
    </T>
  );
}

const plain = (x: string) => x.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\.$/, '');

/**
 * The mission's proof line says something the method line doesn't. Not when it repeats
 * it (every TIMER mission), or is a bare "Before and after." under the before-and-after method.
 */
export function addsTo(mission: Mission, method: string): boolean {
  const p = plain(mission.proof ?? '');
  if (!p || p === plain(method)) return false;
  return !(mission.proofType === 'BEFORE_AFTER' && p === 'before and after');
}

/**
 * The Proof card: PROOF with the proof icons and label ("Timer + photo"), how it's
 * proven ("Run the 30-minute focus timer. When it ends, take a photo."), then what the
 * proof shows, unless that says the same thing. Visible before anything starts.
 */
export function ProofCard({ mission, style }: { mission: Mission; style?: StyleProp<ViewStyle> }) {
  const method = MISSION.method(mission.proofType, mission.timerMinutes);
  const extra = addsTo(mission, method) ? mission.proof : null;
  const kind = PROOF_KIND[mission.proofType] ?? PROOF_KIND.PHOTO;
  return (
    <View accessible accessibilityLabel={MISSION.a11y.proof(kind.a11y, extra ? [method, extra] : [method])} style={[{ marginTop: GAP.block }, style]}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <T v="kicker" color={C.stone}>
            {MISSION.proof}
          </T>
          <ProofMeta type={mission.proofType} color={C.muted} size={16} />
        </View>
        <T v="body" style={{ marginTop: 14 }}>
          {method}
        </T>
        {extra ? (
          <T v="body" color={C.stone} style={{ marginTop: 6 }}>
            {extra}
          </T>
        ) : null}
      </Card>
    </View>
  );
}

/** "✓ Proven 9:47 AM · +15", as on the proven card on Today. */
export function ProvenLine({ time, points, style }: { time: string; points: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityLabel={MISSION.a11y.proven(time, points)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, style]}>
      <Icon name="check" size={16} color={C.bone} />
      <T v="meta" color={C.bone}>
        {MISSION.proven.line(time, points)}
      </T>
    </View>
  );
}

/**
 * A proof photo at 4:5 with the stamp in its corner. Fills the width it's
 * given. A photo that's gone (cleared, or not on this phone) leaves the frame
 * and the stamp.
 */
export function ProofFrame({
  photo,
  day,
  label,
  small = false,
  a11y,
  style,
}: {
  photo: Pick<ProofPhoto, 'uri' | 'takenAt'>;
  day: DayKey;
  label?: string;
  small?: boolean;
  a11y: string;
  style?: StyleProp<ViewStyle>;
}) {
  const src = proofImage(photo.uri);
  const inset = small ? 8 : 12;
  return (
    <View style={[{ aspectRatio: 4 / 5, borderRadius: radius.card, backgroundColor: C.card, overflow: 'hidden' }, style]}>
      {src ? (
        <Image
          // A file name can come back (after a rejected attempt, or in the preview): the key and no cache make sure the new photo shows.
          key={`${photo.uri}:${photo.takenAt}`}
          source={{ uri: src }}
          cachePolicy="none"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={a11y}
        />
      ) : null}
      <View style={{ position: 'absolute', left: inset, right: inset, bottom: inset }}>
        <ProofStamp day={day} takenAt={photo.takenAt} label={label} small={small} />
      </View>
    </View>
  );
}

/** The after photo still to come, beside a waiting before: an empty frame with its icon. */
export function AfterSlot({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ aspectRatio: 4 / 5, borderRadius: radius.card, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 10 }, style]}>
      <Icon name="camera" size={22} color={C.stone} />
      <T v="kicker" color={C.stone}>
        {MISSION.before.after}
      </T>
    </View>
  );
}

/** One photo full width, or before and after side by side. */
export function ProofPhotos({ photos, day, single }: { photos: readonly ProofPhoto[]; day: DayKey; single: string }) {
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    const p = photos[0];
    return <ProofFrame photo={p} day={day} label={single} a11y={p.kind === 'after' ? MISSION.a11y.after : MISSION.a11y.photo} style={{ width: '100%' }} />;
  }
  return (
    <View style={{ flexDirection: 'row', gap: GAP.tight }}>
      {photos.map(p => (
        <ProofFrame
          key={p.kind}
          photo={p}
          day={day}
          small
          label={p.kind === 'before' ? MISSION.before.label : MISSION.before.after}
          a11y={p.kind === 'before' ? MISSION.a11y.before : MISSION.a11y.after}
          style={{ flex: 1 }}
        />
      ))}
    </View>
  );
}

/** Above the camera button: camera access is off (with Open Settings), or the preview's file picker note. */
export function CameraNote({ denied }: { denied: boolean }) {
  if (denied) {
    return (
      <View style={{ marginBottom: 8 }}>
        <T v="small">{MISSION.camera.off}</T>
        <TextButton title={MISSION.camera.settings} color={C.bone} align="left" onPress={() => Linking.openSettings().catch(() => {})} />
      </View>
    );
  }
  if (Platform.OS === 'web') {
    return (
      <T v="meta" color={C.stone} align="center" style={{ marginBottom: 12 }}>
        {MISSION.camera.preview}
      </T>
    );
  }
  return null;
}

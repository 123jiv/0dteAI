// Pieces shared by the Mission screen's stages: the heading, the PROOF block, a
// proof photo with its stamp, and the camera notes.
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DayKey } from '../../core/time';
import type { Mission, ProofPhoto } from '../../core/types';
import { TRACK_BY_ID } from '../../content';
import { MISSION } from '../../content/copy/mission';
import { proofImage } from '../../services/proof';
import { TextButton } from '../../ui/kit';
import { ProofStamp } from '../../ui/ProofStamp';
import { T } from '../../ui/text';
import { color as C, hairline } from '../../ui/tokens';

/** The mission's goal area: "School". */
export function areaName(m: Mission): string {
  return TRACK_BY_ID[m.track]?.short ?? '';
}

/** Title and the minutes / points line at the top of a mission. */
export function MissionHeading({ mission }: { mission: Mission }) {
  return (
    <View style={{ marginTop: 20 }}>
      <T v="title.xl" accessibilityRole="header">
        {mission.title}
      </T>
      <T v="mono" style={{ marginTop: 14 }} accessibilityLabel={MISSION.a11y.meta(mission.minutes, mission.points)}>
        {MISSION.meta(mission.minutes, mission.points)}
      </T>
    </View>
  );
}

/** A labelled block under a hairline. */
export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28, paddingTop: 16, borderTopWidth: hairline, borderTopColor: C.rule, gap: 8 }}>
      <T v="label" accessibilityRole="header">
        {label}
      </T>
      {children}
    </View>
  );
}

const same = (a: string, b: string) => {
  const n = (x: string) => x.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\.$/, '');
  return n(a) === n(b);
};

/** PROOF: how it's proven ("Take one photo."), then what the proof shows, unless that says the same thing. */
export function ProofBlock({ mission }: { mission: Mission }) {
  const method = MISSION.method(mission.proofType, mission.timerMinutes);
  return (
    <Section label={MISSION.proof}>
      <T v="body">{method}</T>
      {mission.proof && !same(mission.proof, method) ? (
        <T v="body" color={C.stone}>
          {mission.proof}
        </T>
      ) : null}
    </Section>
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
  const inset = small ? 6 : 12;
  return (
    <View style={[{ aspectRatio: 4 / 5, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise, overflow: 'hidden' }, style]}>
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

/** One photo full width, or before and after side by side. */
export function ProofPhotos({ photos, day, single }: { photos: readonly ProofPhoto[]; day: DayKey; single: string }) {
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    const p = photos[0];
    return <ProofFrame photo={p} day={day} label={single} a11y={p.kind === 'after' ? MISSION.a11y.after : MISSION.a11y.photo} style={{ width: '100%' }} />;
  }
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
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
      <T v="mono.s" align="center" style={{ marginBottom: 10 }}>
        {MISSION.camera.preview}
      </T>
    );
  }
  return null;
}

/** 2pt bar, bone on rule. `value` 0–1. */
export function Bar({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 1000) / 10}%` as const;
  return (
    <View style={[{ height: 2, backgroundColor: C.rule }, style]}>
      <View style={{ height: 2, width: pct, backgroundColor: C.bone }} />
    </View>
  );
}

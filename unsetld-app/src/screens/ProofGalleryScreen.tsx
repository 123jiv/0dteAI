import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { proofDays } from '../core/points';
import { shortDate } from '../core/time';
import { COPY } from '../content/copy';
import type { RootProps } from '../navigation/types';
import { proofImage } from '../services/proof';
import { useApp } from '../state/store';
import { Icon } from '../ui/icons';
import { NavRow, PageTitle } from '../ui/kit';
import { ProofStamp } from '../ui/ProofStamp';
import { T } from '../ui/text';
import { color as C, hairline, MARGIN } from '../ui/tokens';

const P = COPY.proof;

/** A square proof thumbnail; a quiet placeholder when the photo isn't on this phone. */
export function ProofThumb({ uri, size, onPress, label }: { uri: string; size: number; onPress?: () => void; label: string }) {
  const src = proofImage(uri);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={{ width: size, height: size, borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise, overflow: 'hidden' }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 8 }]}>
          <T v="mono.s" align="center">
            {P.onPhone}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Every proof, newest first. */
export function ProofGalleryScreen({ navigation }: RootProps<'ProofGallery'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const record = useApp(s => s.record);
  const rules = useApp(s => s.settings.standard);
  const days = proofDays(record);
  const [open, setOpen] = useState<string | null>(null);
  const gap = 8;
  const size = Math.floor((width - MARGIN * 2 - gap * 2) / 3);
  const shown = open ? record.proofs[open] : null;
  const shownSrc = shown ? proofImage(shown.uri) : null;
  const w = width - MARGIN * 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavRow onBack={() => navigation.goBack()} />
      <FlatList
        data={days}
        keyExtractor={d => d}
        numColumns={3}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: insets.bottom + 40, gap: 16 }}
        ListHeaderComponent={<PageTitle title={P.galleryTitle} style={{ marginBottom: 16 }} />}
        ListEmptyComponent={
          <View style={{ marginTop: 16, gap: 8 }}>
            <T v="title.m">{P.galleryEmpty}</T>
            <T v="body" color={C.stone}>
              {P.galleryEmptyBody}
            </T>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ width: size, gap: 6 }}>
            <ProofThumb uri={record.proofs[item].uri} size={size} label={P.a11yPhoto(shortDate(item))} onPress={() => setOpen(item)} />
            <T v="mono.s">{shortDate(item)}</T>
          </View>
        )}
      />
      {open && shown ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.ink }]} accessibilityViewIsModal>
          <View style={{ marginTop: insets.top + 8, height: 44, paddingHorizontal: MARGIN - 10, justifyContent: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={COPY.reader.a11y.close} onPress={() => setOpen(null)} style={{ width: 44, height: 44, justifyContent: 'center', paddingLeft: 6 }}>
              <Icon name="close" size={24} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: MARGIN, marginTop: 16 }}>
            <View style={{ width: w, height: Math.min((w * 5) / 4, height * 0.62), borderWidth: hairline, borderColor: C.rule, backgroundColor: C.raise }}>
              {shownSrc ? <Image source={{ uri: shownSrc }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <View style={{ position: 'absolute', left: 12, bottom: 12 }}>
                <ProofStamp day={open} takenAt={shown.takenAt} lineNo={shown.lineNo} />
              </View>
            </View>
            {shown.rule !== null && rules[shown.rule] ? (
              <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}>
                <T v="mono" style={{ width: 40 }}>
                  {String(shown.rule + 1).padStart(2, '0')}
                </T>
                <T v="list">{rules[shown.rule]}</T>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

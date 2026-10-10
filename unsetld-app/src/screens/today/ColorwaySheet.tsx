import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { COLORWAY_BY_ID, COLORWAYS, MISSION_BY_ID } from '../../content';
import { HOME } from '../../content/copy/home';
import { selection } from '../../services/haptics';
import { useApp, useEntitlements } from '../../state/store';
import { SWATCHES } from '../../ui/colorwayAssets';
import { Button } from '../../ui/kit';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/text';
import { color as C, font, hairline, MARGIN } from '../../ui/tokens';

/** The sheet's closing slide (ui/Sheet), and a frame to spare. */
const CLOSE_MS = 280;

/**
 * Colorway picker (You › Appearance opens it over Today). Today behind it changes live, the
 * tab bar included; locked picks revert on close. Each swatch shows one of today's mission
 * titles, the way it would read on Today. It sits in a transparent modal so it covers the tab
 * bar, and anything it opens (the paywall) waits until that modal is gone.
 */
export function ColorwaySheet({ visible, onClose, onFull }: { visible: boolean; onClose: () => void; onFull: () => void }) {
  // The modal stays up for the sheet's closing slide.
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  useEffect(() => {
    if (visible || !shown) return;
    const t = setTimeout(() => setShown(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible, shown]);
  // What to open once the modal is down: on iOS when it says it's dismissed (presenting a
  // screen while a modal is still going away fails there), elsewhere as soon as it's hidden.
  const after = useRef<(() => void) | null>(null);
  const gone = useCallback(() => {
    const run = after.current;
    after.current = null;
    run?.();
  }, []);
  useEffect(() => {
    if (shown) return;
    if (Platform.OS !== 'ios') {
      gone();
      return;
    }
    // In case onDismiss never comes.
    const t = setTimeout(gone, 600);
    return () => clearTimeout(t);
  }, [shown, gone]);

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        // Android back: same as closing the sheet, so a locked preview doesn't stay on.
        useApp.getState().setPreviewColorway(null);
        onClose();
      }}
      onDismiss={Platform.OS === 'ios' ? gone : undefined}>
      <ColorwayPicker
        visible={visible}
        onClose={onClose}
        onFull={() => {
          after.current = onFull;
        }}
      />
    </Modal>
  );
}

function ColorwayPicker({ visible, onClose, onFull }: { visible: boolean; onClose: () => void; onFull: () => void }) {
  const { width } = useWindowDimensions();
  const ent = useEntitlements();
  const day = useApp(s => s.currentDay);
  const plan = useApp(s => s.plans[day]);
  const titles = (plan?.missions ?? []).map(p => MISSION_BY_ID[p.missionId]?.title).filter((t): t is string => Boolean(t));
  const preview = useApp(s => s.previewColorway);
  const setPreview = useApp(s => s.setPreviewColorway);
  const update = useApp(s => s.updateSettings);
  const current = preview ?? ent.colorway.id;
  const lockedPreview = preview && !ent.premium && !COLORWAY_BY_ID[preview]?.free ? COLORWAY_BY_ID[preview] : null;
  const w = Math.floor((width - MARGIN * 2 - 16) / 2);
  const h = Math.round((w * 16) / 9);

  const close = () => {
    setPreview(null);
    onClose();
  };

  const pick = (id: string) => {
    selection();
    const c = COLORWAY_BY_ID[id];
    if (ent.premium || c.free) {
      update({ colorway: id });
      setPreview(null);
    } else setPreview(id);
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      detent={0.6}
      dim={0.15}
      accessibilityLabel={HOME.colorway.title}
      footer={
        lockedPreview ? (
          <View style={{ paddingHorizontal: MARGIN, paddingTop: 12, gap: 12, borderTopWidth: hairline, borderTopColor: C.rule }}>
            <T v="small">{HOME.colorway.lockedBar(lockedPreview.name)}</T>
            <Button
              title={HOME.colorway.seeFull}
              onPress={() => {
                close();
                onFull();
              }}
            />
          </View>
        ) : undefined
      }>
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGIN, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <T v="title.m" style={{ marginTop: 8, marginBottom: 20 }} accessibilityRole="header">
          {HOME.colorway.title}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {COLORWAYS.map((c, i) => {
            const on = c.id === current;
            const locked = !ent.premium && !c.free;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityLabel={`${c.name}${locked ? HOME.colorway.lockedA11y : ''}`}
                aria-checked={on}
                onPress={() => pick(c.id)}
                style={{ width: w }}>
                <View style={{ padding: 3, margin: -4, borderWidth: 1, borderColor: on ? C.bone : 'transparent' }}>
                  <View style={{ width: w, height: h, borderWidth: hairline, borderColor: C.rule, overflow: 'hidden', backgroundColor: c.bg }}>
                    <Image source={SWATCHES[c.id]} style={{ position: 'absolute', width: w, height: h }} contentFit="cover" />
                    <T
                      v="body"
                      color={c.ink}
                      style={{ fontFamily: font.serif, fontSize: 15, lineHeight: 17, margin: 12 }}
                      maxFontSizeMultiplier={1}>
                      {titles.length ? titles[i % titles.length] : HOME.colorway.previewFallback}
                    </T>
                  </View>
                </View>
                {/* Name, and the lock under it: side by side they don't fit a 159-wide swatch. */}
                <View style={{ marginTop: 12, gap: 2 }}>
                  <T v="kicker" color={on ? C.bone : C.stone} numberOfLines={1}>
                    {c.name}
                  </T>
                  {locked ? (
                    <T v="mono.s" color={C.stone}>
                      {HOME.colorway.locked}
                    </T>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

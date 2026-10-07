import { useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfig } from '../../config/app';
import type { Line } from '../../core/types';
import { LANE_NAMES } from '../../content';
import { shareCard } from '../../services/share';
import { useApp } from '../../state/store';
import { Button, TextureBackground } from '../../ui/components';
import { fonts, space, useTheme } from '../../ui/theme';

/** Story-sized (9:16) share image with a small UNSETLD watermark. */
export function ShareSheet({ line, onClose, rankName }: { line: Line | null; onClose: () => void; rankName: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pushToast = useApp(s => s.pushToast);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  if (!line) return null;

  const share = async () => {
    setBusy(true);
    const res = await shareCard(cardRef);
    setBusy(false);
    if (res === 'failed') pushToast("Couldn't create the image. Try again.", 'warn');
    if (res === 'preview') {
      pushToast('On iPhone this opens the share sheet. In the preview, screenshot the card.', 'info');
      return;
    }
    if (res === 'shared') onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, alignItems: 'center' }}>
        {/* Rendered at 360×640 points and exported at 1080×1920 for Stories. */}
        <View style={{ flex: 1, justifyContent: 'center', width: '100%', alignItems: 'center' }}>
          <View style={{ transform: [{ scale: 0.78 }] }}>
            <View ref={cardRef} collapsable={false} style={{ width: 360, height: 640, backgroundColor: theme.bg, overflow: 'hidden', justifyContent: 'center', padding: 36 }}>
              <TextureBackground texture={theme.texture} />
              <Text style={{ color: theme.accent, fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 2, marginBottom: 18 }}>
                {(LANE_NAMES[line.lane] ?? '').toUpperCase()}
              </Text>
              <Text style={{ color: theme.text, fontFamily: fonts.serif, fontSize: line.text.length > 90 ? 32 : 40, lineHeight: line.text.length > 90 ? 38 : 47 }} allowFontScaling={false}>
                {line.text}
              </Text>
              {line.author ? (
                <Text style={{ color: theme.muted, fontFamily: fonts.sans, fontSize: 13, marginTop: 16 }} allowFontScaling={false}>
                  {line.author}
                </Text>
              ) : null}
              <View style={{ position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', gap: 6 }}>
                <Image source={require('../../../assets/figure-mark.png')} style={{ width: 26, height: 26, opacity: 0.85 }} />
                <Text style={{ color: theme.muted, fontFamily: fonts.sansSemi, fontSize: 10, letterSpacing: 2.5 }} allowFontScaling={false}>
                  {`${AppConfig.name.toLowerCase()} · ${rankName.toLowerCase()}`}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ width: '100%', maxWidth: 420, paddingHorizontal: space.xl, gap: space.sm }}>
          <Button title="Share to Stories" icon="share" onPress={share} loading={busy} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ alignItems: 'center', padding: space.md }}>
            <Text style={{ color: theme.muted, fontFamily: fonts.sansMedium, fontSize: 15 }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

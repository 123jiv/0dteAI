import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typo } from '../../core/typography';
import type { Colorway } from '../../core/types';
import { COLORWAYS } from '../../content';
import { COPY } from '../../content/copy';
import { light } from '../../services/haptics';
import { shareCard, type ShareFormat } from '../../services/share';
import { SWATCHES } from '../../ui/colorwayAssets';
import { Button, Segmented, TextButton } from '../../ui/kit';
import { ShareCard, type ShareLine } from '../../ui/ShareCard';
import { Sheet } from '../../ui/Sheet';
import { T } from '../../ui/text';
import { color as C, MARGIN } from '../../ui/tokens';

const FORMATS: ShareFormat[] = ['story', 'post'];
const DETENT = 0.92;
// Everything in the sheet but the preview: grabber 22, top padding 8, segmented 34,
// 24, squares 20 + 28, 24, Share 54, 8, Copy line 44.
const CHROME = 22 + 8 + 34 + 24 + 20 + 28 + 24 + 54 + 8 + 44;

export function ShareSheet({
  line,
  colorway,
  premium,
  onClose,
  onLocked,
}: {
  line: ShareLine | null;
  colorway: Colorway;
  premium: boolean;
  onClose: () => void;
  onLocked: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useState<ShareFormat>('story');
  const [cw, setCw] = useState<Colorway>(colorway);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(false);
  const captureRef = useRef<View>(null);
  const [last, setLast] = useState<ShareLine | null>(line);
  if (line && line !== last) {
    setLast(line);
    setCw(colorway);
    setCopied(false);
    setNote(false);
  }

  const shown = line ?? last;
  // Ten 28pt squares on one row: 8pt gaps where they fit, tighter on narrow phones.
  const squareGap = Math.min(8, Math.floor((width - MARGIN * 2 - 280) / 9));
  // The preview is 391 tall (Story at 220x391), less on short phones so Copy line still fits.
  const previewH = Math.max(200, Math.min(391, Math.round(height * DETENT) - CHROME - insets.bottom));
  const share = async () => {
    const r = await shareCard(captureRef, format);
    if (r === 'preview') setNote(true);
  };
  const copy = async () => {
    if (!shown) return;
    await Clipboard.setStringAsync(typo(shown.text)).catch(() => {});
    light();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet visible={Boolean(line)} onClose={onClose} detent={DETENT} accessibilityLabel={COPY.reader.menu.share}>
      {shown ? (
        <View style={{ flex: 1, paddingHorizontal: MARGIN, paddingTop: 8 }}>
          <Segmented options={FORMATS} value={format} onChange={setFormat} labels={{ story: COPY.share.tabs[0], post: COPY.share.tabs[1] }} />
          <View style={{ marginTop: 24, alignItems: 'center', height: previewH, justifyContent: 'center' }}>
            <View style={{ borderWidth: 1, borderColor: C.rule }}>
              <ShareCard line={shown} colorway={cw} format={format} width={format === 'story' ? Math.round((previewH * 1080) / 1920) : Math.min(300, previewH)} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: squareGap, marginTop: 20, justifyContent: 'center' }}>
            {COLORWAYS.map(c => {
              const locked = !premium && !c.free;
              const on = c.id === cw.id;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}${locked ? ', Full Edition' : ''}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => (locked ? onLocked() : setCw(c))}
                  // 44 tall; sideways only into half the gap, so neighbours don't overlap.
                  hitSlop={{ top: 8, bottom: 8, left: squareGap / 2, right: squareGap / 2 }}
                  style={{ width: 28, height: 28, opacity: locked ? 0.4 : 1 }}>
                  <Image source={SWATCHES[c.id]} style={{ width: 28, height: 28 }} contentFit="cover" />
                  {on ? <View style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderWidth: 1, borderColor: C.bone }} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Button title={COPY.share.button} onPress={share} style={{ marginTop: 24 }} />
          <TextButton title={copied ? COPY.share.copied : COPY.share.copy} onPress={copy} style={{ marginTop: 8 }} />
          {note ? (
            <T v="note" color={C.stone} align="center">
              {COPY.share.previewNote}
            </T>
          ) : null}
          {/* Capture copy: 360 pt wide renders 1080 px on a 3× screen. */}
          <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
            <ShareCard ref={captureRef} line={shown} colorway={cw} format={format} width={360} />
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

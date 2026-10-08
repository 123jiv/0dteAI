import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { breakBeats, catalogueNo, shareSize, typo } from '../core/typography';
import type { Colorway } from '../core/types';
import type { ShareFormat } from '../services/share';
import { ColorwayBackground } from './ColorwayBackground';
import { font } from './tokens';
import { Walker } from './Walker';

export interface ShareLine {
  text: string;
  no?: number;
  attribution?: { author: string; source: string };
}

/**
 * The story (1080×1920) or post (1080×1080) card, drawn at any width: every
 * measurement is the spec's pixel value times width/1080. No chapter, day
 * count, URL, rank or promo.
 */
export const ShareCard = forwardRef<View, { line: ShareLine; colorway: Colorway; format: ShareFormat; width: number }>(
  function ShareCard({ line, colorway, format, width }, ref) {
    const post = format === 'post';
    const k = (width / 1080) * (post ? 0.8 : 1);
    const u = width / 1080;
    const height = post ? width : (width * 1920) / 1080;
    const size = shareSize(line.text) * k;
    const text = breakBeats(typo(line.text));
    const attribution = line.attribution ? `${line.attribution.author} · ${line.attribution.source}`.toUpperCase() : null;
    return (
      <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: colorway.bg }}>
        <ColorwayBackground colorway={colorway} />
        <View
          style={{
            position: 'absolute',
            left: 76 * u,
            right: 76 * u,
            top: post ? undefined : 653 * u,
            ...(post ? { top: 0, bottom: 0, justifyContent: 'center', paddingBottom: height * 0.1 } : null),
          }}>
          <Text allowFontScaling={false} style={{ fontFamily: font.serif, color: colorway.ink, fontSize: size, lineHeight: size * 1.06, letterSpacing: -size * 0.012 }}>
            {text}
          </Text>
          {attribution ? (
            <Text allowFontScaling={false} style={{ fontFamily: font.sansMedium, fontSize: 26 * k, letterSpacing: 26 * k * 0.18, color: colorway.secondary, marginTop: 40 * k }}>
              {attribution}
            </Text>
          ) : null}
        </View>
        {line.no ? (
          <Text
            allowFontScaling={false}
            style={{ position: 'absolute', left: 76 * u, top: (post ? 960 : 1800) * u, fontFamily: font.mono, fontSize: 30 * k, color: colorway.secondary, letterSpacing: 1 * k }}>
            {catalogueNo(line.no)}
          </Text>
        ) : null}
        <View style={{ position: 'absolute', right: 76 * u, bottom: (post ? 64 : 104) * u, alignItems: 'flex-end' }}>
          <Walker height={76 * k} color={colorway.ink} lapelColor={colorway.secondary} />
          <Text allowFontScaling={false} style={{ fontFamily: font.serif, fontSize: 34 * k, color: colorway.ink, marginTop: 8 * k }}>
            unsetld
          </Text>
        </View>
      </View>
    );
  },
);

// The one quiet line under a field when what the user wrote isn't something the app can use
// (core/safety). For support, where to get help: on a phone set to the US, Call 988 and Text
// 988; elsewhere, findahelpline.com. Said by VoiceOver as it appears. Nothing is counted or sent.
import { Linking, Pressable, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { HELP_LINKS, inUS, SAFETY, safetyLine } from '../content/copy/safety';
import type { SafetyResult } from '../core/safety';
import { T } from './text';
import { color as C, GAP } from './tokens';
import { useAnnounce } from './useAnnounce';

/** The phone's locale ("en-US"), from the built-in Intl: no extra module. Empty when it can't tell. */
function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  } catch {
    return '';
  }
}

/** Read once: the region doesn't change while the app runs. */
const US = inUS(deviceLocale());

function HelpLink({ title, label, url }: { title: string; label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => Linking.openURL(url).catch(() => {})}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <T v="note" color={C.bone} style={{ textDecorationLine: 'underline', textDecorationColor: C.bone }}>
        {title}
      </T>
    </Pressable>
  );
}

export function SafetyNote({ result, style, onLayout }: { result: SafetyResult | null; style?: StyleProp<ViewStyle>; onLayout?: (e: LayoutChangeEvent) => void }) {
  const line = result ? safetyLine(result, US) : null;
  // VoiceOver on iOS reads no live region: the line is said as it appears.
  useAnnounce(line);
  if (!result || !line) return null;
  const S = SAFETY.support;
  return (
    <View style={style} onLayout={onLayout}>
      <T v="note" color={C.muted} accessibilityLiveRegion="polite">
        {line}
      </T>
      {result.level === 'support' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP.card * 2 }}>
          {US ? (
            <>
              <HelpLink title={S.call} label={S.callA11y} url={HELP_LINKS.call} />
              <HelpLink title={S.text} label={S.textA11y} url={HELP_LINKS.text} />
            </>
          ) : (
            <HelpLink title={S.site} label={S.siteA11y} url={HELP_LINKS.site} />
          )}
        </View>
      ) : null}
    </View>
  );
}

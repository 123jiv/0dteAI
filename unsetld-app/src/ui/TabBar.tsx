// The bottom navigation: Today, Record, Rewards, You (Rewards only while rewards are on or a
// code taken still works: RootNavigator). Always there on the main screens, gone on anything
// opened from them (a mission, proof history, a plan).
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV } from '../content/copy/nav';
import type { TabParams } from '../navigation/types';
import { selection } from '../services/haptics';
import { useReaderColorway } from '../state/store';
import { ColorwayBackground } from './ColorwayBackground';
import { Icon, type IconName } from './icons';
import { T } from './text';
import { color as C } from './tokens';

const ICONS: Record<keyof TabParams, IconName> = {
  Today: 'tab-today',
  Record: 'tab-record',
  Rewards: 'tab-rewards',
  You: 'tab-you',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const colorway = useReaderColorway();
  const active = state.routes[state.index]?.name as keyof TabParams;
  // Today wears the colorway; the bar takes its colours there so it reads as one page.
  const onToday = active === 'Today';
  const bg = onToday ? (colorway.bgEnd ?? colorway.bg) : C.ink;
  const on = onToday ? colorway.ink : C.bone;
  // Both meet 4.5:1 on their background (stone on ink 5.8:1). The selected tab also gets a
  // mark, since on some colorways ink and secondary are close.
  const off = onToday ? colorway.secondary : C.stone;
  return (
    <View
      accessibilityRole="tablist"
      onLayout={e => setHeight(e.nativeEvent.layout.height)}
      style={{ flexDirection: 'row', backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, paddingHorizontal: 8 }}>
      {onToday && colorway.kind === 'plate' && height > 0 ? (
        // Today's plate covers the screen above the bar. Drawn again here, the same size and
        // mirrored from the bar's top edge, it carries on without a seam instead of a flat band.
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', pointerEvents: 'none' }]}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: windowHeight - height, transform: [{ scaleY: -1 }] }}>
            <ColorwayBackground colorway={colorway} />
          </View>
        </View>
      ) : null}
      {state.routes.map((route, i) => {
        const name = route.name as keyof TabParams;
        const focused = state.index === i;
        const press = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (focused || e.defaultPrevented) return;
          selection();
          navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={NAV[name].a11y}
            aria-selected={focused}
            accessibilityState={{ selected: focused }}
            onPress={press}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4, minHeight: 44 }}>
            {focused ? <View style={{ position: 'absolute', bottom: -3, width: 18, height: 2, borderRadius: 1, backgroundColor: on }} /> : null}
            <Icon name={ICONS[name]} size={22} color={focused ? on : off} />
            <T v="kicker" color={focused ? on : off} style={{ fontSize: 10, letterSpacing: 1 }}>
              {NAV[name].label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

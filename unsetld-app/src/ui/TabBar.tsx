// The bottom navigation: Today, Progress, Rewards, You. Always there on the four main
// screens, gone on anything opened from them (a mission, proof history, a plan).
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV } from '../content/copy/nav';
import type { TabParams } from '../navigation/types';
import { selection } from '../services/haptics';
import { useReaderColorway } from '../state/store';
import { Icon, type IconName } from './icons';
import { T } from './text';
import { color as C } from './tokens';

const ICONS: Record<keyof TabParams, IconName> = {
  Today: 'tab-today',
  Progress: 'tab-progress',
  Rewards: 'tab-rewards',
  You: 'tab-you',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorway = useReaderColorway();
  const active = state.routes[state.index]?.name as keyof TabParams;
  // Today wears the colorway; the bar takes its colours there so it reads as one page.
  const onToday = active === 'Today';
  const bg = onToday ? (colorway.bgEnd ?? colorway.bg) : C.ink;
  const on = onToday ? colorway.ink : C.bone;
  const off = onToday ? colorway.secondary : C.ash;
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, paddingHorizontal: 8 }}>
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

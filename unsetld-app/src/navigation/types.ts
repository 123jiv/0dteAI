import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParams = {
  Today: { lineId?: string } | undefined;
  Rank: undefined;
  Me: undefined;
};

export type RootParams = {
  Onboarding: undefined;
  Paywall: { from: 'onboarding' | 'settings' | 'feature'; reason?: string } | undefined;
  WidgetGuide: { from?: 'onboarding' } | undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Favorites: undefined;
  CustomLines: undefined;
  Lanes: undefined;
  Tone: undefined;
  Reminders: undefined;
  Themes: undefined;
  Legal: { doc: 'privacy' | 'terms' | 'rewards' };
  DevTools: undefined;
  Source: undefined;
};

export type RootProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;
export type TabProps<K extends keyof TabParams> = CompositeScreenProps<
  BottomTabScreenProps<TabParams, K>,
  NativeStackScreenProps<RootParams>
>;

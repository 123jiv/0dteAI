import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomLinesScreen } from '../screens/CustomLinesScreen';
import { DevToolsScreen } from '../screens/DevToolsScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { MeScreen } from '../screens/MeScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { RankScreen } from '../screens/RankScreen';
import { LanesScreen, RemindersScreen, SourceScreen, ThemesScreen, ToneScreen } from '../screens/SettingsScreens';
import { TodayScreen } from '../screens/TodayScreen';
import { WidgetGuideScreen } from '../screens/WidgetGuideScreen';
import { useApp } from '../state/store';
import { Icon, type IconName } from '../ui/icons';
import { fonts, useTheme } from '../ui/theme';
import type { RootParams, TabParams } from './types';

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();

const TAB_ICONS: Record<keyof TabParams, IconName> = { Today: 'home', Rank: 'rank', Me: 'me' };

function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          height: 58 + insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.muted,
        tabBarIcon: ({ color }) => <Icon name={TAB_ICONS[route.name]} color={color} size={22} />,
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.4 }}>{route.name}</Text>
        ),
      })}>
      <Tabs.Screen name="Today" component={TodayScreen} />
      <Tabs.Screen name="Rank" component={RankScreen} />
      <Tabs.Screen name="Me" component={MeScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  // Read once: the navigator only mounts after the store has hydrated.
  const onboarded = useApp.getState().settings.onboarded;
  const theme = useTheme();
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: Platform.OS === 'web' ? 'none' : 'default',
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="WidgetGuide" component={WidgetGuideScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="CustomLines" component={CustomLinesScreen} />
      <Stack.Screen name="Lanes" component={LanesScreen} />
      <Stack.Screen name="Tone" component={ToneScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Themes" component={ThemesScreen} />
      <Stack.Screen name="Source" component={SourceScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} />
    </Stack.Navigator>
  );
}

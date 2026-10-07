import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { DarkTheme, NavigationContainer, createNavigationContainerRef, type LinkingOptions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import type { RootParams } from './navigation/types';
import { configureNotifications, onReminderOpened } from './services/notifications';
import { useBootstrap, useSideEffects } from './state/lifecycle';
import { useApp, useEntitlements } from './state/store';
import { ToastHost } from './ui/overlays';
import { PhoneFrame } from './ui/PhoneFrame';
import { RankUpCelebration } from './ui/RankUpCelebration';
import { ThemeProvider, toTheme } from './ui/theme';

configureNotifications();

export const navigationRef = createNavigationContainerRef<RootParams>();

// Deep links (widgets, notifications) on iOS. The browser preview has none, so
// navigation never touches the page URL and the preview works anywhere.
const linking: LinkingOptions<RootParams> | undefined =
  Platform.OS === 'web'
    ? undefined
    : {
        prefixes: [Linking.createURL('/'), 'unsetld://'],
        config: { screens: { Main: { screens: { Today: 'today', Rank: 'rank', Me: 'me' } } } },
      };

function Shell() {
  useBootstrap();
  useSideEffects();
  const ent = useEntitlements();
  const theme = useMemo(() => toTheme(ent.theme), [ent.theme]);

  useEffect(
    () =>
      onReminderOpened(lineId => {
        if (navigationRef.isReady()) navigationRef.navigate('Main', { screen: 'Today', params: { lineId } });
      }),
    [],
  );

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: { ...DarkTheme.colors, background: theme.bg, card: theme.bg, text: theme.text, border: theme.border, primary: theme.accent },
    }),
    [theme],
  );

  return (
    <ThemeProvider theme={theme}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
          <RootNavigator />
        </NavigationContainer>
        <RankUpCelebration />
        <ToastHost />
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const hydrated = useApp(s => s.hydrated);
  const ready = fontsLoaded && hydrated;
  return (
    <SafeAreaProvider>
      <PhoneFrame>{ready ? <Shell /> : <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />}</PhoneFrame>
    </SafeAreaProvider>
  );
}

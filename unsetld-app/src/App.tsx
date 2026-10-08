import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond/500Medium_Italic';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { DarkTheme, NavigationContainer, StackActions, createNavigationContainerRef } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { newNonce } from './navigation/nonce';
import { RootNavigator } from './navigation/RootNavigator';
import type { RootParams } from './navigation/types';
import { takeEarlyDropTap } from './services/notifications';
import { useIntent } from './state/intents';
import { useBootstrap, useSideEffects } from './state/lifecycle';
import { useAccessEnabled, useApp } from './state/store';
import { ActionHost } from './ui/actions';
import { PhoneFrame } from './ui/PhoneFrame';
import { color as C } from './ui/tokens';

export const navigationRef = createNavigationContainerRef<RootParams>();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.ink, card: C.ink, text: C.bone, border: C.rule, primary: C.bone },
};

/** Widget taps, deep links and notification taps land here once navigation is ready. */
function useIntents(ready: boolean) {
  const intent = useIntent(s => s.intent);
  const nonce = useIntent(s => s.nonce);
  const accessEnabled = useAccessEnabled();
  useEffect(() => {
    if (!intent || !ready || !navigationRef.isReady()) return;
    useIntent.getState().clear();
    const earlyDrop = takeEarlyDropTap();
    if (!useApp.getState().settings.onboarded) return;
    const stamp = newNonce();
    navigationRef.dispatch(StackActions.popTo('Today', { nonce: stamp, night: intent.kind === 'night' }));
    if (intent.kind === 'record') navigationRef.navigate('Record');
    // An early drop alert opens the early-access page, where the drop opens.
    else if (earlyDrop && accessEnabled) navigationRef.navigate('Milestone', { id: 'early-access' });
  }, [intent, nonce, ready, accessEnabled]);
}

function Shell() {
  useBootstrap();
  useSideEffects();
  const [ready, setReady] = useState(false);
  useIntents(ready);
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <NavigationContainer ref={navigationRef} theme={navTheme} onReady={() => setReady(true)}>
        <RootNavigator />
      </NavigationContainer>
      <ActionHost />
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    IBMPlexMono_400Regular,
  });
  const hydrated = useApp(s => s.hydrated);
  const ready = fontsLoaded && hydrated;
  return (
    <SafeAreaProvider>
      <PhoneFrame>{ready ? <Shell /> : <View style={{ flex: 1, backgroundColor: C.ink }} />}</PhoneFrame>
    </SafeAreaProvider>
  );
}

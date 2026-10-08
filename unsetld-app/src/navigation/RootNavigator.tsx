import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { AccountScreen } from '../screens/AccountScreen';
import { DayScreen } from '../screens/DayScreen';
import { DevToolsScreen } from '../screens/DevToolsScreen';
import { DocScreen } from '../screens/DocScreen';
import { LetterScreen } from '../screens/LetterScreen';
import { MilestoneScreen } from '../screens/MilestoneScreen';
import { ChaptersScreen } from '../screens/onboarding/ChaptersScreen';
import { FirstLineScreen } from '../screens/onboarding/FirstLineScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { ProofCaptureScreen } from '../screens/ProofCaptureScreen';
import { ProofGalleryScreen } from '../screens/ProofGalleryScreen';
import { ReaderScreen } from '../screens/reader/ReaderScreen';
import { RecordScreen } from '../screens/RecordScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StandardScreen } from '../screens/StandardScreen';
import { WidgetScreen } from '../screens/WidgetScreen';
import { YourLinesScreen } from '../screens/YourLinesScreen';
import { useApp } from '../state/store';
import { color as C } from '../ui/tokens';
import type { RootParams } from './types';

const Stack = createNativeStackNavigator<RootParams>();
const web = Platform.OS === 'web';

/** One native stack, no tab bar. Sheets inside the reader are drawn by the reader itself. */
export function RootNavigator() {
  // Read once: the navigator only mounts after the store has hydrated.
  const onboarded = useApp.getState().settings.onboarded;
  return (
    <Stack.Navigator
      initialRouteName={onboarded ? 'Reader' : 'Name'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.ink },
        animation: web ? 'none' : 'default',
      }}>
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="FirstLine" component={FirstLineScreen} options={{ animation: web ? 'none' : 'fade', gestureEnabled: false }} />
      <Stack.Screen name="Standard" component={StandardScreen} />
      <Stack.Screen name="Chapters" component={ChaptersScreen} />
      <Stack.Screen name="Day" component={DayScreen} />
      <Stack.Screen name="Widget" component={WidgetScreen} />
      <Stack.Screen name="Reader" component={ReaderScreen} options={{ animation: web ? 'none' : 'fade' }} />
      <Stack.Screen name="Record" component={RecordScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Saved" component={SavedScreen} />
      <Stack.Screen name="YourLines" component={YourLinesScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Doc" component={DocScreen} />
      <Stack.Screen name="Milestone" component={MilestoneScreen} />
      <Stack.Screen name="DevTools" component={DevToolsScreen} />
      <Stack.Screen name="ProofGallery" component={ProofGalleryScreen} />
      <Stack.Screen name="ProofCapture" component={ProofCaptureScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="DocSheet" component={DocScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="Letter"
        component={LetterScreen}
        options={{ presentation: 'fullScreenModal', animation: web ? 'none' : 'fade', animationDuration: 400 }}
      />
    </Stack.Navigator>
  );
}

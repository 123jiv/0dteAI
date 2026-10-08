import { registerRootComponent } from 'expo';

import App from './src/App';
import { configureNotifications, listenForResponses } from './src/services/notifications';
import { handleNotificationEvent } from './src/state/intents';

// Module scope, before the first render: night-check answers from the
// notification's Held / Not today buttons must work from a cold start.
configureNotifications();
listenForResponses(handleNotificationEvent);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
registerRootComponent(App);

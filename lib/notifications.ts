import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

// expo-notifications removed push support from Expo Go in SDK 53.
// Guard every access behind this flag — lazy require() inside functions
// means the module is never loaded when this is true.
const isExpoGo = Constants.appOwnership === 'expo';

// Lazily load expo-notifications so it is never imported in Expo Go
// (the module throws a hard error at initialisation time in that environment).
function loadNotifications(): typeof import('expo-notifications') | null {
  if (isExpoGo || !Constants.isDevice) return null;
  try {
    // require() is lazy — only executes when this function is called, after the
    // isExpoGo guard above has already short-circuited in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

export type NotificationData =
  | { type: 'borrow_request_new'; itemId: string }
  | { type: 'borrow_request_approved'; itemId: string }
  | { type: 'borrow_request_denied' }
  | { type: 'borrow_request_cancelled' }
  | { type: 'friend_request_new' }
  | { type: 'friend_request_accepted' };

/**
 * Set the foreground notification handler (show banner + sound when app is open).
 * Call once at app startup.
 */
export function configureNotifications(): void {
  const N = loadNotifications();
  if (!N) return;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    N.setNotificationChannelAsync('default', {
      name: 'Lenderoo',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => {});
  }
}

/**
 * Request permission, obtain the Expo push token, and persist it to the DB.
 * Safe to call multiple times — exits early if already granted or unavailable.
 */
export async function registerPushToken(userId: string): Promise<void> {
  const N = loadNotifications();
  if (!N) return;

  const { status: existing } = await N.getPermissionsAsync();
  const { status } =
    existing === 'granted'
      ? { status: existing }
      : await N.requestPermissionsAsync();

  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  const { data: token } = await N.getExpoPushTokenAsync({ projectId });
  if (!token) return;

  await supabase.from('users').update({ push_token: token }).eq('id', userId);
}

/**
 * Subscribe to notification taps. Returns a cleanup function for useEffect.
 */
export function addNotificationTapListener(): () => void {
  const N = loadNotifications();
  if (!N) return () => {};

  const sub = N.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData | undefined;
    if (data?.type) handleNotificationTap(data);
  });

  return () => sub.remove();
}

/**
 * Navigate to the relevant screen when a notification is tapped.
 */
export function handleNotificationTap(data: NotificationData): void {
  switch (data.type) {
    case 'borrow_request_new':
    case 'borrow_request_cancelled':
      router.push('/(tabs)/library' as any);
      break;
    case 'borrow_request_approved':
    case 'borrow_request_denied':
      if ('itemId' in data && data.itemId) {
        router.push(`/item/${data.itemId}` as any);
      }
      break;
    case 'friend_request_new':
    case 'friend_request_accepted':
      router.push('/(tabs)/friends' as any);
      break;
  }
}

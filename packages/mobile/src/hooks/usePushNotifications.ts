import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | undefined
  >();
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    // Skip all notification setup on web platform
    if (Platform.OS === 'web') {
      return;
    }

    // Set up notification handler for native platforms
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    async function registerForPushNotificationsAsync() {
      let token;

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          // Failed to get push token for push notification!
          return;
        }
        try {
          const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;
          if (!projectId) {
            token = await Notifications.getExpoPushTokenAsync({
              projectId: undefined,
            });
          } else {
            token = await Notifications.getExpoPushTokenAsync({
              projectId,
            });
          }
        } catch (e) {
          token = await Notifications.getExpoPushTokenAsync({
            projectId: undefined,
          });
        }
      } else {
        // Must use physical device for Push Notifications
      }

      return token;
    }

    registerForPushNotificationsAsync().then(async (token) => {
      setExpoPushToken(token);
      if (token && user?.id) {
        try {
          await api.post('/notifications/register', {
            pushToken: token.data,
            platform: Platform.OS,
          });
        } catch (error) {
          console.error('Error registering push token:', error);
        }
      }
    });

    // Set up notification listeners
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification Response", response);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  return {
    expoPushToken,
    notification,
  };
};

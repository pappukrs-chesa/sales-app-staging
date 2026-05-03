import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// API Configuration - Always use production URL
const API_BASE_URL = 'https://api.chesadentalcare.com';

const NotificationContext = createContext({});

// Configure how notifications should be displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if this is a high-priority notification
    const isHighPriority = notification.request.content.data?.priority === 'high' ||
                           notification.request.content.data?.type === 'lead_followup' ||
                           notification.request.content.data?.type === 'offer';

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      // Force heads-up display for high priority notifications
      ...(Platform.OS === 'android' && {
        sound: true,
        vibrate: [0, 250, 250, 250],
      }),
    };
  },
});

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();
  const { user } = useAuth();

  useEffect(() => {
    // Setup notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      // Store notification locally
      storeNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  // Register/update FCM token whenever user logs in or app is accessed
  useEffect(() => {
    const registerToken = async () => {
      // Check for employeeid (from login response)
      const empId = user?.employeeid || user?.empid || user?.id;

      if (empId) {
        console.log('User logged in, registering FCM token for employee:', empId);
        const tokens = await registerForPushNotificationsAsync();

        if (tokens) {
          setExpoPushToken(tokens.expoPushToken);
          setFcmToken(tokens.fcmToken);

          // Register/update token with backend
          await registerTokenWithBackend(tokens.fcmToken, empId.toString());
        }
      } else {
        console.log('No user logged in, skipping FCM token registration');
      }
    };

    registerToken();
  }, [user?.employeeid, user?.empid, user?.id]); // Triggers when user logs in

  const registerTokenWithBackend = async (token, empid) => {
    try {
      console.log('Registering FCM token with backend for employee:', empid);
      console.log('FCM Token:', token);

      // Safely construct device info with only plain string values
      // Use JSON.parse(JSON.stringify()) to ensure no special objects or functions
      const rawDeviceInfo = {
        brand: Device.brand || 'Unknown',
        modelName: Device.modelName || 'Unknown',
        osName: Device.osName || Platform.OS,
        osVersion: Device.osVersion || 'Unknown'
      };

      // Double-ensure all values are plain strings
      const deviceInfo = JSON.parse(JSON.stringify({
        brand: String(rawDeviceInfo.brand).trim(),
        modelName: String(rawDeviceInfo.modelName).trim(),
        osName: String(rawDeviceInfo.osName).trim(),
        osVersion: String(rawDeviceInfo.osVersion).trim()
      }));

      const payload = {
        fcmToken: String(token).trim(),
        empId: String(empid).trim(),
        deviceType: String(Platform.OS).trim(),
        deviceInfo: deviceInfo
      };

      console.log('Sending registration payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${API_BASE_URL}/notifications/register-token`, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Token registered successfully:', response.data);

      // Store registration status locally
      await AsyncStorage.setItem('fcmTokenRegistered', 'true');
      await AsyncStorage.setItem('lastTokenUpdate', new Date().toISOString());

      return response.data;
    } catch (error) {
      console.error('❌ Error registering token:', error.message);

      // Detailed error logging
      if (error.response) {
        console.error('Server Response Error:');
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
      } else if (error.request) {
        console.error('Network Error - No response received');
        console.error('Request:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }

      // Don't show alert to user, just log the error
      // Token will be retried on next app launch
      return null;
    }
  };

  const storeNotification = async (notification) => {
    try {
      const { title, body, data } = notification.request.content;

      const newNotification = {
        id: `${Date.now()}-${Math.random()}`,
        title,
        body,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      };

      // Get existing notifications
      const stored = await AsyncStorage.getItem('notifications');
      const notifications = stored ? JSON.parse(stored) : [];

      // Add new notification at the beginning
      notifications.unshift(newNotification);

      // Keep only last 50 notifications
      const trimmedNotifications = notifications.slice(0, 50);

      // Save back to AsyncStorage
      await AsyncStorage.setItem('notifications', JSON.stringify(trimmedNotifications));
      console.log('Notification stored locally');
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  };

  const handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;

    // Handle different notification types
    if (data.type === 'payment_rejected' && data.orderId) {
      // Navigate to the specific order details page for re-upload
      console.log('Navigate to order for payment re-upload:', data.orderId);
      router.push(`/${data.orderId}`);
    } else if (data.type === 'payment_update_rejected' && data.orderId) {
      // Navigate to the specific order details page for payment update re-upload
      console.log('Navigate to order for payment update re-upload:', data.orderId);
      router.push(`/${data.orderId}`);
    } else if (data.type === 'lead_followup') {
      // Navigate to leads page (home/index tab)
      console.log('Navigate to leads page for follow-up');
    } else if (data.entityType === 'Order') {
      // Navigate to order details
      console.log('Navigate to order:', data.entityId);
    } else if (data.entityType === 'Lead' && data.entityId) {
      // Navigate to specific lead details
      console.log('Navigate to lead:', data.entityId);
    } else if (data.type === 'offer') {
      // Navigate to offers
      console.log('Navigate to offers');
    }
  };

  const deactivateToken = async () => {
    try {
      if (!fcmToken) {
        console.log('No FCM token to deactivate');
        return;
      }

      console.log('Deactivating FCM token on logout...');

      await axios.post(`${API_BASE_URL}/notifications/deactivate-token`, {
        fcmToken: fcmToken
      }, {
        timeout: 5000,
      });

      console.log('✅ Token deactivated successfully');

      // Clear local storage
      await AsyncStorage.removeItem('fcmTokenRegistered');
      await AsyncStorage.removeItem('lastTokenUpdate');

      // Clear state
      setFcmToken('');
      setExpoPushToken('');

    } catch (error) {
      console.error('❌ Error deactivating token:', error.message);
      // Don't block logout if this fails
    }
  };

  const value = {
    expoPushToken,
    fcmToken,
    notification,
    registerTokenWithBackend,
    deactivateToken,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

async function registerForPushNotificationsAsync() {
  let expoPushToken;
  let fcmToken;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // Create high-priority channel for heads-up notifications
    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Get native FCM/APNs token (works in all standalone builds - preview & production)
      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      fcmToken = devicePushToken.data;
      console.log('✅ Device Push Token (FCM):', fcmToken);

      // Also try to get Expo Push Token (optional, may fail due to server issues)
      try {
        const expoPushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || 'e74f18d3-3b49-45c2-a445-f0ced0f89538',
        });
        expoPushToken = expoPushTokenData.data;
        console.log('✅ Expo Push Token:', expoPushToken);
      } catch (expoError) {
        // Expo server might be down, but that's OK - we have the FCM token
        console.log('⚠️ Expo Push Token unavailable (server issue), continuing with FCM token');
      }

      return { expoPushToken: expoPushToken || fcmToken, fcmToken };
    } catch (error) {
      console.error('❌ Error getting device push token:', error);
      console.error('This usually means you\'re on Expo Go or permissions were denied');
      return null;
    }
  } else {
    alert('Must use physical device for Push Notifications');
    return null;
  }
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;

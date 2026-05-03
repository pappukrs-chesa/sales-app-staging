import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/ContextAPI/AuthContext';
import { useNotification } from '@/ContextAPI/NotificationContext';

const LogoutButton = ({ style, textStyle, showIcon = true, buttonText = "Logout" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const { deactivateToken } = useNotification();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    setIsLoading(true);
    try {
      // Deactivate FCM token first (before clearing data)
      console.log('Deactivating FCM token before logout...');
      await deactivateToken();

      // Clear all data from AsyncStorage
      await clearAsyncStorageData();

      // Call the logout function from AuthContext
      await logout();

      // Navigate to login or home screen
      router.replace('/auth'); // Adjust route as needed

      Alert.alert('Success', 'Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(
        'Logout Error',
        error.message || 'An error occurred during logout. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearAsyncStorageData = async () => {
    try {
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Filter out keys you want to keep (if any)
      const keysToRemove = keys.filter(key => {
        // You can specify which keys to keep here
        // For example, keep app settings but remove user data
        const keepKeys = ['app_settings', 'theme_preference']; // Add keys you want to keep
        return !keepKeys.includes(key);
      });
      
      // Remove all user-related data
      await AsyncStorage.multiRemove(keysToRemove);
      
      console.log('AsyncStorage cleared successfully');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw new Error('Failed to clear local data');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.logoutButton, style]}
      onPress={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <View style={styles.buttonContent}>
          {showIcon && (
            <Ionicons 
              name="log-out-outline" 
              size={20} 
              color="#fff" 
              style={styles.icon} 
            />
          )}
          <Text style={[styles.buttonText, textStyle]}>
            {buttonText}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Alternative logout button for header/navigation
const HeaderLogoutButton = ({ onPress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const { deactivateToken } = useNotification();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await deactivateToken();
      await clearAsyncStorageData();
      await logout();
      router.replace('/(auth)/login');
      if (onPress) onPress();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAsyncStorageData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => {
        const keepKeys = ['app_settings', 'theme_preference'];
        return !keepKeys.includes(key);
      });
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw new Error('Failed to clear local data');
    }
  };

  return (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#1890ff" />
      ) : (
        <Ionicons name="log-out-outline" size={24} color="#1890ff" />
      )}
    </TouchableOpacity>
  );
};

// Complete logout utility function that can be used anywhere
const useLogout = () => {
  const { logout } = useAuth();
  const { deactivateToken } = useNotification();
  const router = useRouter();

  const performLogout = async () => {
    try {
      // Deactivate FCM token
      await deactivateToken();

      // Clear AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => {
        const keepKeys = ['app_settings', 'theme_preference'];
        return !keepKeys.includes(key);
      });
      await AsyncStorage.multiRemove(keysToRemove);

      // Call auth logout
      await logout();

      // Navigate to login
      router.replace('/auth');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  return { performLogout };
};

const styles = StyleSheet.create({
  logoutButton: {
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 144, 255, 0.1)',
  },
});

export default LogoutButton;
export { HeaderLogoutButton, useLogout };
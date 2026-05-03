import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useCart } from './CartContext';
import { router } from 'expo-router';
import CacheManager from '../utils/cacheManager';

const AuthContext = createContext();

// Token never expires - only cleared on manual logout
const isSessionExpired = async () => {
  return false; // Never expire session unless manually logged out
};

export const AuthProvider = ({ children }) => {
  const { clearCart } = useCart();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Never check expiry on app load - always restore session if data exists
        {
          const storedUser = await AsyncStorage.getItem('user');
          const storedToken = await AsyncStorage.getItem('token');
          const storedId = await AsyncStorage.getItem('id');
          const storedDCode = await AsyncStorage.getItem('d_code');
          const storedBName = await AsyncStorage.getItem('role');
          const storedSalesPerson = await AsyncStorage.getItem('sales_person');

          if (storedUser && storedToken) {
            try {
              const userData = JSON.parse(storedUser);
              setUser({
                ...userData,
                id: storedId || userData.id,
                d_code: storedDCode || userData.d_code,
                bname: storedBName || userData.subrole,
                sales_person: storedSalesPerson || userData.sales_person,
              });
              setToken(storedToken);
              console.log('User data loaded successfully from storage');
            } catch (parseError) {
              console.error('Error parsing stored user data:', parseError);
              await clearAllStorageData();
            }
          } else {
            console.log('No valid user session found in storage');
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // On error, clear potentially corrupted data
        await clearAllStorageData();
      }
    };

    loadUserData();
  }, []);

  const clearAllStorageData = async () => {
    try {
      const keys = [
        'user', 'token', 'id', 'd_code', 'role', 'sales_person',
        'selectedDealerId', 'employeeID', 'coordinator', 'BookingCard',
        'DealerData', 'InvoiceCard', 'PriceList', 'leadsData', 'leadsDataTimestamp',
        'selectedDealer', 'SapDealerData', 'slotMachineAnimationRun',
        'points', 'MatchedSDState'
      ];
      
      await AsyncStorage.multiRemove(keys);
      
      // Also clear all CacheManager cached data (including never-expire leads)
      await CacheManager.clearAllCache();
      
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const login = async (credentials, navigation) => {
    try {
      setLoading(true);
      setError(null);

      const cleanCredentials = {
  ...credentials,
  sales_person: credentials.sales_person.trim(),
  sub_role: credentials.sub_role.trim().toLowerCase(),
};

const response = await fetch(
  'https://api.chesadentalcare.com/login_sales_test',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cleanCredentials),
  }
);

      const data = await response.json();
      console.log('login data', data);
      
      if (!response.ok) {
        console.log(data.message);
        throw new Error(data.message || 'Login failed');
      }

      const dataAllnew = JSON.stringify(data.dataAll);
      const SapData = JSON.stringify(data.sapData);
      
      setUser(data.user);
      setToken(data.token);

      // Store data in AsyncStorage
      await AsyncStorage.multiSet([
        ['user', JSON.stringify(data.user)],
        ['token', data.token],
        ['id', data.user.id ? data.user.id.toString() : data.user.employeeid.toString()],
        ['sales_person', data.user.sales_person.trim().toLowerCase()],
        ['role', data.user.subrole],
        ['DealerData', dataAllnew],
        ['SapDealerData', SapData],
        ['employeeID', data.user.employeeid.toString()],
        ['coordinator', data.user.coordinator.toString()],
      ]);

      // Set coordinator to 0 for specific sales persons  
      const cleanSalesPerson = data.user.sales_person.trim().toLowerCase();
      if (
        cleanSalesPerson === 'atoofa habib' ||
        cleanSalesPerson === 'sangeetha k' ||
        cleanSalesPerson === 'samrin'
      ) {
        await AsyncStorage.setItem('coordinator', '0');
      }

      // Token never expires - removed expiry time setting

      // Trigger points refresh by setting a login timestamp
      await AsyncStorage.setItem('lastLoginTime', Date.now().toString());

      router.navigate('/(tabs)/Home');

    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (navigation) => {
    try {
      await clearAllStorageData();
      clearCart();
      
      Alert.alert('Success', 'Logged out successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.navigate('/auth'); // Replace with your login screen name
          },
        },
      ]);
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout properly');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
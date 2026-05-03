import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { AuthProvider } from '@/ContextAPI/AuthContext';
import { CartProvider } from '@/ContextAPI/CartContext';
import { PointsProvider } from '@/ContextAPI/PointsContext';
import { NotificationProvider } from '@/ContextAPI/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import UpdateChecker from '@/components/UpdateChecker';



SplashScreen.preventAutoHideAsync();
if (__DEV__) {
  require("../networkLogger");
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    // Add your custom fonts here if needed
    // 'CustomFont': require('../assets/fonts/CustomFont.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Check if user has seen welcome screen
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');

        // Pre-load fonts, make API calls, etc.
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (hasSeenWelcome === 'true') {
          // User has seen welcome, check if they're already logged in
          const storedUser = await AsyncStorage.getItem('user');
          const storedToken = await AsyncStorage.getItem('token');
          const expiryTime = await AsyncStorage.getItem('expiry');
          
          // Check if session is still valid
          const isSessionValid = expiryTime && new Date().getTime() < new Date(expiryTime).getTime();
          
          if (storedUser && storedToken && isSessionValid) {
            // User is already authenticated, go to home
            router.navigate('/(tabs)/Home');
          } else {
            // User not authenticated or session expired, go to login
            router.navigate('/auth');
          }
        } else {
          // New user, show welcome
          router.navigate('/welcome');
        }
      } catch (e) {
        console.warn(e);
        // On error, show welcome screen to be safe
        router.replace('/welcome');
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      // Hide the native splash screen
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <AuthProvider>
            <NotificationProvider>
              <PointsProvider>
                <UpdateChecker />
                <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#059669',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
                initialRouteName='auth'
              >
                <Stack.Screen
                  name="welcome"
                  options={{
                    headerShown: false,
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="auth"
                  options={{
                    title: 'auth',
                    headerShown: false,
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    headerShown: false
                  }}
                />
                <Stack.Screen
                  name="Cart"
                  options={{
                    headerShown: false
                  }}
                />
                <Stack.Screen
                  name="Checkout"
                  options={{
                    headerShown: false
                  }}
                />
                <Stack.Screen
                  name="leads"
                  options={{
                    headerShown: false
                  }}
                /> 
                <Stack.Screen
                  name="[id]"
                  options={{
                    headerShown: false
                  }}
                />
                <Stack.Screen
                  name="points"
                  options={{
                    headerShown: false
                  }}
                />
              </Stack>
              </PointsProvider>
            </NotificationProvider>
          </AuthProvider>
        </CartProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
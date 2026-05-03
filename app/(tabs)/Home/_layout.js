import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import CustomHeader from "@/assets/constants/Headers/ChesaHeader";

SplashScreen.preventAutoHideAsync();
setTimeout(SplashScreen.hideAsync, 1000);

export default function RootLayout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen 
        name="index" 
        options={{
          headerTitle: () => <CustomHeader />,  // Use the custom header
          headerLeft: () => null,               // Hide the back button
          headerShown: true,
        }}
      />
    </Stack>
  );
}

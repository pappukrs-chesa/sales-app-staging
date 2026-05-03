import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

const userIconSvg = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <g data-name="Layer 2" id="Layer_2">
    <path d="m15.626 11.769a6 6 0 1 0 -7.252 0 9.008 9.008 0 0 0 -5.374 8.231 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 9.008 9.008 0 0 0 -5.374-8.231zm-7.626-4.769a4 4 0 1 1 4 4 4 4 0 0 1 -4-4zm10 14h-12a1 1 0 0 1 -1-1 7 7 0 0 1 14 0 1 1 0 0 1 -1 1z" fill="#fff"></path>
  </g>
</svg>`;

const LoginButton = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push('/login'); // Adjust the route as needed
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityLabel="User Login Button"
      accessibilityRole="button"
    >
      <View style={styles.innerContainer}>
        <SvgXml xml={userIconSvg} width={27} height={27} />
        <Text style={styles.text}>Log In</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 131,
    height: 51,
    borderRadius: 15,
    backgroundColor: 'rgba(46, 142, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0,
  },
  innerContainer: {
    width: 127,
    height: 47,
    borderRadius: 13,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default LoginButton;
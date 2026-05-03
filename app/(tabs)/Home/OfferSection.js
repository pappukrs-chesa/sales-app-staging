import { Colors } from '@/constants/Colors';
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WebView } from 'react-native-webview';  // Import WebView

const GIF_URL = 'https://media.tenor.com/5c9rqMKtDeEAAAAi/stickergiant-sale.gif';  // Example GIF URL

const OfferSection = () => {
  const fadeIn = new Animated.Value(0);

  React.useEffect(() => {
    // Fade-in animation
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.offerContainer, { opacity: fadeIn }]}>
      <WebView
        source={{ uri: GIF_URL }}  // Use the GIF URL directly
        style={styles.offerImage}   // Apply styles to the WebView
      />
      <View style={styles.offerTextContainer}>
        <Text style={styles.offerTitle}>Big Savings!</Text>
        <Text style={styles.offerDescription}>Don't miss out on Year End discounts!</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  offerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    marginVertical:5,
    marginHorizontal:8,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  offerImage: {
    width: 160,
    height: 105,
    borderRadius: 30,
  },
  offerTextContainer: {
    marginLeft: 20,
    flex: 1,
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e63946',
  },
  offerDescription: {
    fontSize: 16,
    color: '#333',
    marginTop: 5,
  },
});

export default OfferSection;

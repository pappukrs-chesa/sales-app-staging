import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const DealSection = () => (
  <View style={styles.dealSection}>
    <Text style={styles.dealTitle}>DEAL OF THE DAY</Text>
    <Image
      source={{ uri: 'https://chesadentalcare.com/assets/chesaMobileAppAssets/o2new.jpg'}}
      style={styles.dealImage}
    />
  </View>
);

const styles = StyleSheet.create({
  dealSection: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  dealTitle: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dealImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
});

export default DealSection;

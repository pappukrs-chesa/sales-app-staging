import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import OfferSection from './OfferSection';
import CategorySection from './CategorySection';
import DealSection from './DealsSection';
import ProductSection from './ProductsSection';
import DealerSelection from './DealerSelection';
import PurchasePage from './Purchase';


export default function HomePage() {
  return (
    <ScrollView style={styles.container}>
      <StatusBar translucent backgroundColor="white" />

      {/* Offer Section */}
      {/* <OfferSection /> */}

      {/* Categories Section */}
      {/* <CategorySection /> */}

      <PurchasePage />

      {/* Deal of the Day */}
      {/* <DealSection /> */}

      {/* Products Section */}
      {/* <ProductSection /> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

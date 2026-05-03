import React from 'react';
import { FlatList, View, Text, Image, StyleSheet } from 'react-native';

const products = [
  {
    id: '1',
    name: 'O2 Dental Chair',
    price: '₹***',
    image: { uri: 'https://chesadentalcare.com/assets/chesaMobileAppAssets/o2new.jpg'},
    rating: 4.5,
    reviews: 120,
    discount: 10,
    isOutOfStock: false,
  },
  {
    id: '2',
    name: 'O2 Rexin',
    price: '₹***',
    image: { uri: 'https://chesadentalcare.com/assets/chesaMobileAppAssets/o2chair.jpg'},
    rating: 4.0,
    reviews: 50,
    discount: 15,
    isOutOfStock: true,
  },
];

const ProductSection = () => (
  <FlatList
    data={products}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <View style={styles.productCard}>
        <Image source={item.image} style={styles.productImage} />
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <Text style={styles.productDiscount}>Save {item.discount}%</Text>
      </View>
    )}
    contentContainerStyle={styles.productsContainer}
    scrollEnabled={false} // To work seamlessly within ScrollView
  />
);

const styles = StyleSheet.create({
  productsContainer: {
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#ddd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  productPrice: {
    fontSize: 14,
    color: '#ff6347',
  },
  productDiscount: {
    fontSize: 14,
    color: '#32cd32',
    marginTop: 5,
  },
});

export default ProductSection;

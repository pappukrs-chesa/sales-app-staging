import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '@/ContextAPI/CartContext';
import { router } from 'expo-router';
import PointsContainer from '../../../components/points/PointsContainer';

const CustomHeader = ({ navigation }) => {
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();

  return (
    <View style={styles.headerContainer}>
      {/* Left: Logo and Title */}
      <View style={styles.leftContainer}>
        <Image 
          source={require('@/assets/images/chesa.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* <Text style={styles.headerTitle}>CHESA</Text> */}
      </View>

      {/* Center: Points Display */}
      <View style={styles.centerContainer}>
        <PointsContainer
          style={styles.pointsDisplay}
          onPress={() => router.push('/points')}
          showLabel={true}
        />
      </View>

      {/* Right: Icons */}
      <View style={styles.rightContainer}>
        
        <TouchableOpacity style={styles.iconButton}>
          <MaterialCommunityIcons name="heart-outline" size={22} color="#555" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.navigate('Cart')} 
          style={styles.cartIconContainer}
        >
          <Ionicons name="cart-outline" size={22} color="#555" />
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: '110%',
    marginLeft: -14,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 72,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '90%',
    left: -20,
  },
  pointsDisplay: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 4,
  },
  cartIconContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default CustomHeader;
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { useCart } from '@/ContextAPI/CartContext';
import { router } from 'expo-router';
import { Feather, MaterialIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGstRate, toPostTax } from '@/utils/taxHelper';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const CartPage = () => {
  const { cart, removeFromCart } = useCart();
  const [specs, setSpecs] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [priceList, setPriceList] = useState('1');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // console.log('Cart Items:', cart);

  useEffect(() => {
    // Load price list from AsyncStorage
    const loadPriceList = async () => {
      const storedPriceList = await AsyncStorage.getItem('PriceList');
      if (storedPriceList) {
        setPriceList(storedPriceList);
      }
    };
    loadPriceList();
    
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
    ]).start();

    // Pulse animation for checkout button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (cart.length > 0) {
      pulseAnimation.start();
    }

    return () => pulseAnimation.stop();
  }, [cart.length]);

  const handleRemoveFromCart = (uniqueNumber) => {
    // Add haptic feedback animation
    const removeAnimation = Animated.sequence([
      Animated.timing(new Animated.Value(1), {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(new Animated.Value(0.8), {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    removeAnimation.start(() => {
      removeFromCart(uniqueNumber);
      Toast.show({
        type: 'success',
        text1: '✅ Item removed',
        text2: 'Item successfully removed from cart',
        position: 'top',
        visibilityTime: 2000,
        topOffset: 10,
      });
    });
  };

  const handleCheckout = () => {
    if (cart.length > 0) {
      // Animate button press
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      router.push({
        pathname: '/Checkout',
        params: { 
          cartItems: JSON.stringify(cart), 
          specs,
          wosonBundle: JSON.stringify(wosonBundle)
        },
      });
    }
  };

  const toggleItemExpansion = (uniqueNumber) => {
    setExpandedItems(prev => ({
      ...prev,
      [uniqueNumber]: !prev[uniqueNumber]
    }));
  };

  const renderRightActions = (progress, dragX, uniqueNumber) => {
    const trans = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [0, 25, 100],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View style={styles.rightActionContainer}>
        <Animated.View style={[
          styles.rightAction,
          { transform: [{ translateX: trans }, { scale }] }
        ]}>
          <TouchableOpacity 
            onPress={() => handleRemoveFromCart(uniqueNumber)}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              style={styles.deleteGradient}
            >
              <MaterialIcons name="delete-outline" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Woson Bundle Logic
  const calculateWosonDiscount = () => {
    if (!cart || cart.length === 0) return { discount: 0, freeDistiller: false };

    const wosonTanda = cart.find(item => item.code === 'ATC/WOS/001');
    const waterDistiller = cart.find(item => item.code === 'STE 404');

    if (wosonTanda && waterDistiller) {
      // DP (3) and SDP (4): Distiller is FREE — discount = full post-tax price
      if (priceList === '3' || priceList === '4') {
        const distillerTotal = toPostTax(waterDistiller.sapPrice, waterDistiller.taxcode) * waterDistiller.quantity;
        return { discount: distillerTotal, freeDistiller: true };
      }
      // MRP (1): ₹3,500 discount (post-tax amount)
      if (priceList === '1') return { discount: 3500, freeDistiller: false };
      // MSP (2): ₹6,000 discount (post-tax amount)
      if (priceList === '2') return { discount: 6000, freeDistiller: false };
    }
    return { discount: 0, freeDistiller: false };
  };

  const wosonBundle = calculateWosonDiscount();
  // Subtotal is pre-tax sum
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.sapPrice) || 0) * (item.quantity || 1), 0);

  // Tax breakdown by GST rate
  const taxBreakdown = cart.reduce((acc, item) => {
    const rate = item.gstRate || getGstRate(item.taxcode);
    const preTax = (Number(item.sapPrice) || 0) * (item.quantity || 1);
    const tax = preTax * (rate / 100);
    if (!acc[rate]) acc[rate] = { preTax: 0, tax: 0 };
    acc[rate].preTax += preTax;
    acc[rate].tax += tax;
    return acc;
  }, {});
  const totalTax = Object.values(taxBreakdown).reduce((s, v) => s + v.tax, 0);
  const postTaxGrandTotal = subtotal + totalTax - wosonBundle.discount;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const opacity = offsetY > 50 ? 0.95 : 1;
        headerOpacity.setValue(opacity);
      }
    }
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Enhanced Header */}
      {/* <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, 100],
              outputRange: [0, -10],
              extrapolate: 'clamp',
            }),
          }],
        }
      ]}>
        <BlurView intensity={20} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          </View>
        </BlurView>
      </Animated.View> */}

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {cart.length === 0 ? (
          <Animated.View style={[
            styles.emptyCart,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.emptyIconGradient}
              >
                <Feather name="shopping-cart" size={48} color="#9CA3AF" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Add some products to get started</Text>
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/Home')} style={styles.shopNowButton}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                style={styles.shopNowGradient}
              >
                <Text style={styles.shopNowText}>Shop Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            {/* Cart Items */}
            <View style={styles.cartItemsContainer}>
              {cart.map((item, index) => {
                const isFreeDistiller = wosonBundle.freeDistiller && item.code === 'STE 404';
                return (
                <Animated.View
                  key={item.uniqueNumber}
                  style={[
                    styles.cartItemWrapper,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 50 + (index * 20)],
                        }),
                      }],
                    }
                  ]}
                >
                  <Swipeable
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, item.uniqueNumber)
                    }
                    rightThreshold={40}
                  >
                    <View style={[styles.cartItem, isFreeDistiller && styles.freeItemHighlight]}>
                      <LinearGradient
                        colors={isFreeDistiller ? ['#d4edda', '#c3e6cb'] : ['#FFFFFF', '#FAFAFA']}
                        style={styles.cartItemGradient}
                      >
                        <View style={styles.itemRow}>
                          {/* Enhanced Product Image */}
                          <View style={styles.imageContainer}>
                            {item.image ? (
                              <Image
                                source={{ uri: item.image }}
                                style={styles.itemImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.placeholderImage}>
                                <Feather name="image" size={24} color="#9CA3AF" />
                              </View>
                            )}
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityText}>{item.quantity}</Text>
                            </View>
                          </View>

                          {/* Enhanced Product Info */}
                          <View style={styles.itemInfo}>
                            <View style={styles.itemHeader}>
                              <Text style={styles.itemName} numberOfLines={2}>
                                {item.name} {isFreeDistiller && <Text style={styles.freeTag}>(FREE)</Text>}
                              </Text>
                              <TouchableOpacity 
                                onPress={() => handleRemoveFromCart(item.uniqueNumber)}
                                style={styles.removeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <AntDesign name="closecircle" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                            
                            {isFreeDistiller ? (
                              <Text style={styles.itemPrice}>{formatCurrency(0)}</Text>
                            ) : (
                              <>
                                <Text style={styles.itemPrice}>
                                  {formatCurrency(toPostTax(item.sapPrice, item.taxcode) * item.quantity)}
                                </Text>
                                <View style={styles.priceBreakdown}>
                                  <Text style={styles.unitPriceText}>
                                    Unit: {formatCurrency(toPostTax(item.sapPrice, item.taxcode))} (GST {item.gstRate || getGstRate(item.taxcode)}%)
                                  </Text>
                                  {item.quantity > 1 && (
                                    <Text style={styles.unitPriceText}>
                                      {' '}x {item.quantity}
                                    </Text>
                                  )}
                                </View>
                              </>
                            )}

                            <View style={styles.itemDetails}>
                              <Text style={styles.detailText}>ID: {item.uniqueNumber}</Text>
                              {item.suctionType && (
                                <Text style={styles.detailText}>• {item.suctionType}</Text>
                              )}
                              {item.color && (
                                <Text style={styles.detailText}>• {item.color}</Text>
                              )}
                            </View>

                            {item.remarks && (
                              <TouchableOpacity 
                                onPress={() => toggleItemExpansion(item.uniqueNumber)}
                                style={styles.specsToggle}
                              >
                                <Text style={styles.specsToggleText}>
                                  {expandedItems[item.uniqueNumber] ? 'Hide' : 'Show'} Specs
                                </Text>
                                <Feather 
                                  name={expandedItems[item.uniqueNumber] ? 'chevron-up' : 'chevron-down'} 
                                  size={16} 
                                  color="#F97316" 
                                />
                              </TouchableOpacity>
                            )}

                            {expandedItems[item.uniqueNumber] && item.remarks && (
                              <Animated.View style={styles.expandedSpecs}>
                                <Text style={styles.specsText}>{item.remarks}</Text>
                              </Animated.View>
                            )}
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  </Swipeable>
                </Animated.View>
                );
              })}
            </View>

            {/* Enhanced Remarks Section */}
            <Animated.View style={[
              styles.remarksContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>
              <Text style={styles.remarksLabel}>
                <Feather name="edit-3" size={16} color="#F97316" /> Special Instructions
              </Text>
              <View style={styles.remarksInputContainer}>
                <TextInput
                  style={styles.remarksInput}
                  multiline
                  numberOfLines={4}
                  value={specs}
                  onChangeText={setSpecs}
                  placeholder="Add delivery instructions, gift message, or other notes..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </Animated.View>

            {/* Enhanced Summary */}
            <Animated.View style={[
              styles.summaryContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.summaryGradient}
              >
                <Text style={styles.summaryHeader}>
                  <Feather name="file-text" size={18} color="#1F2937" /> Order Summary
                </Text>
                
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Pre-Tax ({cart.length} items)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
                  </View>

                  {Object.entries(taxBreakdown)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([rate, { tax }]) => (
                    <View style={[styles.summaryRow, styles.taxRow]} key={rate}>
                      <Text style={styles.taxLabel}>GST {rate}%</Text>
                      <Text style={styles.taxValue}>{formatCurrency(tax)}</Text>
                    </View>
                  ))}

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal (incl. GST)</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(subtotal + totalTax)}</Text>
                  </View>

                  {wosonBundle.discount > 0 && (
                    <View style={[styles.summaryRow, styles.discountRow]}>
                      <Text style={styles.discountLabel}>Woson Bundle Discount</Text>
                      <Text style={styles.discountValue}>- {formatCurrency(wosonBundle.discount)}</Text>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Grand Total (incl. GST)</Text>
                    <Text style={styles.totalValue}>{formatCurrency(postTaxGrandTotal)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Savings Badge */}
            {/* <View style={styles.savingsContainer}>
              <View style={styles.savingsBadge}>
                <Feather name="gift" size={16} color="#10B981" />
                <Text style={styles.savingsText}>Free shipping on orders over ₹1000</Text>
              </View>
            </View> */}
          </>
        )}
      </Animated.ScrollView>

      {/* Enhanced Checkout Button */}
      {cart.length > 0 && (
        <Animated.View style={[
          styles.checkoutContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}>
          <BlurView intensity={20} style={styles.checkoutBlur}>
            <TouchableOpacity 
              style={styles.checkoutButton} 
              onPress={handleCheckout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkoutGradient}
              >
                <View style={styles.checkoutContent}>
                  <View style={styles.checkoutLeft}>
                    <Text style={styles.checkoutText}>Continue to Checkout</Text>
                    <Text style={styles.checkoutSubtext}>{cart.length} items</Text>
                  </View>
                  <View style={styles.checkoutRight}>
                    <Text style={styles.checkoutPrice}>{formatCurrency(postTaxGrandTotal)}</Text>
                    <Feather name="arrow-right" size={20} color="white" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  cartBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContainer: {
    paddingTop: Platform.OS === 'ios' ? 120 : 10,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: screenHeight * 0.15,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  shopNowButton: {
    marginTop: 16,
  },
  shopNowGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  shopNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItemsContainer: {
    marginBottom: 16,
  },
  cartItemWrapper: {
    marginBottom: 8,
  },
  cartItem: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cartItemGradient: {
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F97316',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  quantityText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
    lineHeight: 18,
  },
  removeButton: {
    padding: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  specsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  specsToggleText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '500',
    marginRight: 4,
  },
  expandedSpecs: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  specsText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  rightActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  deleteGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remarksContainer: {
    marginBottom: 16,
  },
  remarksLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  remarksInputContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  remarksInput: {
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    lineHeight: 18,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryGradient: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  taxNote: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  taxRow: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  taxLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  taxValue: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  priceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitPriceText: {
    fontSize: 11,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#F97316',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F97316',
  },
  freeItemHighlight: {
    borderWidth: 2,
    borderColor: '#28a745',
  },
  freeTag: {
    color: '#28a745',
    fontWeight: '700',
    fontSize: 12,
  },
  discountRow: {
    backgroundColor: '#d4edda',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  discountLabel: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '600',
    flex: 1,
  },
  discountValue: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '700',
  },
  savingsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  savingsText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  checkoutContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  checkoutBlur: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  checkoutButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  checkoutGradient: {
    padding: 16,
  },
  checkoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutLeft: {
    flex: 1,
  },
  checkoutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  checkoutSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  checkoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkoutPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CartPage;
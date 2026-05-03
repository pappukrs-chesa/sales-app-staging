import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '@/ContextAPI/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DealerSelection = ({ onDealerChange, onPriceListUpdate }) => {
  const { user } = useAuth();
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const selectedDealerAnim = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const cardElevation = useRef(new Animated.Value(2)).current;

  const navigation = useNavigation();

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    if (user && user.sales_person) {
      fetchDealersBySalesPersonName(user.sales_person);
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Loading animation
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(loadingOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      loadingOpacity.setValue(1);
    }
  }, [loading]);

  const fetchDealersBySalesPersonName = async (salesPersonName) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://api.chesadentalcare.com/sales_employees?name=${encodeURIComponent(salesPersonName)}`
      );

      if (response.data && response.data.length > 0) {
        const filteredDealers = response.data.map(dealer => ({
          id: dealer.id,
          d_code: dealer.d_code,
          bname: dealer.bname
        }));
        setDealers(filteredDealers);
      } else {
        console.log('No dealers found for sales person:', salesPersonName);
        setDealers([]);
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
      Alert.alert('Error', 'Failed to fetch dealers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const animateCardPress = () => {
    Animated.sequence([
      Animated.timing(cardElevation, {
        toValue: 8,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(cardElevation, {
        toValue: 2,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start();
  };

  const handleDealerChange = async (selectedDealerId) => {
    animateCardPress();
    
    let selectedDealerData = null;

    if (selectedDealerId === 'Direct Order') {
      selectedDealerData = 'Direct Order';
      setSelectedDealer('Direct Order');

      // Animate selected dealer appearance
      Animated.spring(selectedDealerAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      await AsyncStorage.multiSet([
        ['MatchedSDState', 'NA'],
        ['selectedDealer', 'Direct Order'],
        ['d_code', 'Direct Order'],
        ['PriceList', '1'],
      ]);

      if (onPriceListUpdate) onPriceListUpdate('1', 'MRP');
      if (onDealerChange) onDealerChange('Direct Order');

      // Exit animation before navigation
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          navigation.navigate('Home');
        });
      }, 1000);
      return;
    }

    selectedDealerData = dealers.find(dealer => dealer.id === parseInt(selectedDealerId));
    setSelectedDealer(selectedDealerData);

    if (selectedDealerData) {
      Animated.spring(selectedDealerAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }

    try {
      const dData = JSON.parse(await AsyncStorage.getItem('SapDealerData'));

      if (Array.isArray(dData)) {
        const matchedDealer = dData.find(
          element => element[0].CardCode === selectedDealerData.d_code
        );

        if (matchedDealer && matchedDealer[0]) {
          let priceListNum = matchedDealer[0].PriceListNum.toString();
          const matchedDealerState = matchedDealer[0].BillToState;

          // Store basic dealer info first
          await AsyncStorage.multiSet([
            ['MatchedSDState', matchedDealerState],
            ['selectedDealer', selectedDealerData.id.toString()],
            ['d_code', selectedDealerData.d_code],
          ]);

          // Handle GJ state - override PriceList to 5
          if (matchedDealerState === "GJ") {
            priceListNum = '5';
            await AsyncStorage.setItem('PriceList', '5');
            const cardCode = "C100021A";
            try {
              const response = await fetch(`https://api.chesadentalcare.com/dealer?id=${cardCode}`);
              if (!response.ok) throw new Error('Failed to fetch GJ dealer data');
              const gjDealerData = await response.json();
              await AsyncStorage.setItem('matchedMHDealerData', JSON.stringify(gjDealerData));
            } catch (error) {
              console.error("Error fetching GJ dealer data:", error);
            }
          } else {
            await AsyncStorage.setItem('PriceList', priceListNum);
          }

          const priceListMap = {
            1: "MRP",
            2: "MSP",
            5: "CF",
            6: "SDP",
            9: "DP",
          };
          const priceListName = priceListMap[priceListNum] || 'MRP';

          if (onPriceListUpdate) onPriceListUpdate(priceListNum, priceListName);
        }
      }

      if (onDealerChange) onDealerChange(selectedDealerData);
      
      // Exit animation before navigation
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          navigation.navigate('Home');
        });
      }, 1000);

    } catch (error) {
      console.error("Error in handleDealerChange:", error);
      Alert.alert("Error", "Something went wrong while selecting dealer.");
    }
  };

  const handlePickerFocus = () => {
    setIsPickerOpen(true);
    Animated.timing(cardElevation, {
      toValue: 6,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handlePickerBlur = () => {
    setIsPickerOpen(false);
    Animated.timing(cardElevation, {
      toValue: 2,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  if (loading) {
    return (
      <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading dealers...</Text>
        </View>
        <View style={styles.loadingShimmer} />
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <Animated.View 
        style={[
          styles.card,
          {
            shadowOpacity: cardElevation.interpolate({
              inputRange: [2, 8],
              outputRange: [0.1, 0.25],
            }),
            elevation: cardElevation,
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={18} color="#3b82f6" />
          </View>
          <Text style={styles.cardTitle}>Select Dealer</Text>
          <View style={styles.headerLine} />
        </View>

        <View style={styles.pickerContainer}>
          <TouchableOpacity 
            style={[
              styles.pickerWrapper,
              isPickerOpen && styles.pickerWrapperFocused
            ]}
            activeOpacity={0.95}
          >
            <View style={styles.pickerIconContainer}>
              <Ionicons 
                name="chevron-down" 
                size={16} 
                color={isPickerOpen ? "#3b82f6" : "#9ca3af"} 
                style={[
                  styles.pickerIcon,
                  isPickerOpen && styles.pickerIconRotated
                ]}
              />
            </View>
            <Picker
              selectedValue={selectedDealer === 'Direct Order' ? 'Direct Order' : selectedDealer?.id || ''}
              onValueChange={handleDealerChange}
              style={styles.picker}
              mode="dropdown"
              onFocus={handlePickerFocus}
              onBlur={handlePickerBlur}
            >
              <Picker.Item 
                label="Select a dealer..." 
                value="" 
                style={styles.pickerItem}
              />
              <Picker.Item 
                label="🏢 Direct Order" 
                value="Direct Order" 
                style={styles.pickerItemSpecial}
              />
              {dealers.map((dealer) => (
                <Picker.Item
                  key={dealer.id}
                  label={`🏪 ${dealer.bname}`}
                  value={dealer.id}
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </TouchableOpacity>
        </View>

        {selectedDealer && (
          <Animated.View 
            style={[
              styles.selectedDealerContainer,
              {
                opacity: selectedDealerAnim,
                transform: [
                  {
                    scale: selectedDealerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    })
                  },
                  {
                    translateY: selectedDealerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.selectedDealerContent}>
              <View style={styles.selectedDealerHeader}>
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                </View>
                <Text style={styles.selectedDealerTitle}>
                  {selectedDealer === 'Direct Order' ? 'Direct Order' : selectedDealer.bname}
                </Text>
              </View>
              {selectedDealer !== 'Direct Order' && (
                <View style={styles.dealerCodeContainer}>
                  <Text style={styles.dealerCodeLabel}>Code:</Text>
                  <Text style={styles.selectedDealerCode}>
                    {selectedDealer.d_code}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.selectedDealerGlow} />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 4,
  },
  
  // Loading styles
  loadingContainer: {
    marginBottom: 16,
    marginHorizontal: 4,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingShimmer: {
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },

  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  headerLine: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 1,
    opacity: 0.2,
  },

  // Picker styles
  pickerContainer: {
    marginBottom: 12,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    minHeight: 48,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  pickerWrapperFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowRadius: 8,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  pickerIconContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
    zIndex: 1,
  },
  pickerIcon: {
    transform: [{ rotate: '0deg' }],
  },
  pickerIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  picker: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginTop: Platform.OS === 'android' ? -8 : -12,
    paddingRight: 32,
  },
  pickerItem: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pickerItemSpecial: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },

  // Selected dealer styles
  selectedDealerContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedDealerContent: {
    position: 'relative',
    zIndex: 1,
  },
  selectedDealerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    opacity: 0.05,
    borderRadius: 12,
  },
  selectedDealerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedDealerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    flex: 1,
  },
  dealerCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 32,
  },
  dealerCodeLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginRight: 6,
  },
  selectedDealerCode: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});

export default DealerSelection;
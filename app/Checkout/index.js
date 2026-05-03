import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Easing,
  Alert,
  StyleSheet, // Added for local styles if needed
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useCart } from '@/ContextAPI/CartContext';
import { router } from 'expo-router';
import CacheManager from '@/utils/cacheManager';
import { usePoints } from '@/ContextAPI/PointsContext';
import {
  AnimatedSection,
  AnimatedInput,
  SuccessAnimation,
  SlideModal,
  useShakeAnimation
} from '../../components/Animation/animation';
import { LoadingPulse } from '../../components/Animation/animation';
import RewardCard from '../../components/points/RewardCard';
import { toPostTax, getGstRate } from '@/utils/taxHelper';
import { BASE_URL } from '@/config/apiConfig';


const FadeInView = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

// Enhanced Button with Press Animation
const AnimatedButton = ({ onPress, children, style, textStyle, disabled = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={textStyle}>{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};


const Checkout = ({ navigation, route }) => {
  const { cart, clearCart } = useCart();
  const { addPointsToTable } = usePoints();
  const cartItems = cart || [];
  const specs = 'Spec';
  const onData = [] ;
  const [wosonBundleData, setWosonBundleData] = useState({ discount: 0, freeDistiller: false });
  const [priceList, setPriceList] = useState('1');

  

  // Enhanced Success Animation Component (PhonePe Style)
  const SuccessOverlay = () => {
    const backgroundOpacity = useRef(new Animated.Value(0)).current;
    const circleScale = useRef(new Animated.Value(0)).current;
    const tickScale = useRef(new Animated.Value(0)).current;
    const tickOpacity = useRef(new Animated.Value(0)).current;
    const textSlide = useRef(new Animated.Value(50)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (showSuccess) {
        // Sequence of animations for better visual impact
        Animated.sequence([
          // 1. Fade in green background
          Animated.timing(backgroundOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          // 2. Scale in the white circle
          Animated.timing(circleScale, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          // 3. Animate the tick mark
          Animated.parallel([
            Animated.timing(tickScale, {
              toValue: 1,
              duration: 300,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
            Animated.timing(tickOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          // 4. Slide in text from bottom
          Animated.parallel([
            Animated.timing(textSlide, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          // Add a subtle pulse effect
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.05,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
            { iterations: 3 }
          ).start();

          // Auto hide after 3 seconds and then navigate
          setTimeout(() => {
            hideSuccessAnimation();
            // Navigate after animation completes
            setTimeout(async () => {
              await clearFormData();
              router.navigate('/(tabs)/two');
            }, 300); // Wait for hide animation to complete
          }, 3000);
        });
      }
    }, [showSuccess]);

    const hideSuccessAnimation = () => {
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSuccess(false);
        // Reset all animations
        backgroundOpacity.setValue(0);
        circleScale.setValue(0);
        tickScale.setValue(0);
        tickOpacity.setValue(0);
        textSlide.setValue(50);
        textOpacity.setValue(0);
        pulseAnim.setValue(1);
      });
    };

    if (!showSuccess) return null;

    return (
      <Animated.View 
        style={[
          styles.successFullScreenOverlay,
          { 
            backgroundColor: backgroundOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.95)']
            })
          }
        ]}
      >
        <View style={styles.successContent}>
          {/* Main Circle with Tick */}
          <Animated.View
            style={[
              styles.successMainCircle,
              {
                transform: [
                  { scale: circleScale },
                  { scale: pulseAnim }
                ],
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.successTickMark,
                {
                  opacity: tickOpacity,
                  transform: [{ scale: tickScale }],
                },
              ]}
            >
              ✓
            </Animated.Text>
          </Animated.View>

          {/* Success Text */}
          <Animated.View
            style={{
              opacity: textOpacity,
              transform: [{ translateY: textSlide }],
            }}
          >
            <Text style={styles.successTitle}>Order Placed Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Your order has been submitted and is being processed.
            </Text>
            <Text style={styles.successNote}>
              You will receive updates on your registered phone number.
            </Text>
          </Animated.View>

          {/* Decorative Elements */}
          <View style={styles.successDecorations}>
            <View style={[styles.successDot, { top: 100, left: 50 }]} />
            <View style={[styles.successDot, { top: 150, right: 60 }]} />
            <View style={[styles.successDot, { bottom: 200, left: 80 }]} />
            <View style={[styles.successDot, { bottom: 150, right: 40 }]} />
          </View>
        </View>
      </Animated.View>
    );
  };

  // Animated values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scaleAnim = new Animated.Value(0.9);

  // State management
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [advanceErrorMessage, setAdvanceErrorMessage] = useState('');
  const [advanceWarningMessage, setAdvanceWarningMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [billingErrors, setBillingErrors] = useState({});
  const [shippingErrors, setShippingErrors] = useState({});
  const [doctorCompanyType, setDoctorCompanyType] = useState('doctor');
  const [sapData, setSapData] = useState(null);
  const [userObj, setUserObj] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [matchedDealerState, setMatchedDealerState] = useState('');
  const [mhDealerData, setMhDealerData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 5;
  const [isLeadsModalVisible, setIsLeadsModalVisible] = useState(false);
  const [searchLeadTerm, setSearchLeadTerm] = useState('');
  const [totalPointsAmount, setTotalPointsAmount] = useState('0');
  const [payId, setPayId] = useState('');
  const [file, setFile] = useState(null);
  const [orderId, setOrderId] = useState(''); // Correctly initialized here
  const [initialOrderValue, setInitialOrderValue] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClinicDatePicker, setShowClinicDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState('');
  const [fromPurchasePage, setFromPurchasePage] = useState(false);

  const [formData, setFormData] = useState({
    advanceAmount: '', // Changed to empty string for initial input
    balanceAmount: 0,
    expectedDispatchDate: '',
    freightDetails: '',
    logisticType: '',
    clinicOpeningDate: '',
    paymentMode: 'Offline',
    doctorOrCompany: '',
    doctorCompanyName: '',
    gstNumber: '',
    customerRefNo: '',
    orderValue: 0,
  });

  const [shippingAddress, setShippingAddress] = useState({
    customerName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    pincode: '',
    shipping_address: '',
  });

  const [billingAddress, setBillingAddress] = useState({
    bName: '',
    bemail: '',
    bphone: '',
    bcity: '',
    bstate: '',
    bpincode: '',
    billing_address: '',
    gstIn: '',
  });
   const [showSuccess, setShowSuccess] = useState(false);
   const [showRewardCard, setShowRewardCard] = useState(false);
   const [earnedOrderPoints, setEarnedOrderPoints] = useState(0);
  const { shake, shakeStyle } = useShakeAnimation();

  const [items, setItems] = useState(
    cartItems?.map((item) => {
      // Check if this is part of Woson bundle
      const hasWosonTanda = cartItems.some(i => i.code === 'ATC/WOS/001');
      const isDistiller = item.code === 'STE 404';
      
      if (hasWosonTanda && isDistiller && wosonBundleData.freeDistiller) {
        return { ...item, discount: 100 };
      }
      
      return { ...item, discount: 0 };
    }) || []
  );


  // Load data from AsyncStorage
  useEffect(() => {
    loadStoredData();
    // Load price list
    const loadPriceList = async () => {
      const storedPriceList = await AsyncStorage.getItem('PriceList');
      if (storedPriceList) {
        setPriceList(storedPriceList);
      }
    };
    loadPriceList();
    
    // Generate a unique order ID when the component mounts if not already present
    const uniqueOrderId = generateUniqueIdForOrder();
    setOrderId(uniqueOrderId.toString());
  }, []);

const generateUniqueIdForOrder = () => {
  const randomEightDigit = Math.floor(10000000 + Math.random() * 90000000);
  return `${randomEightDigit}`;
};

  const loadStoredData = async () => {
  try {
    // console.log('Loading stored data...');
    const [sapDataStr, userStr, dealerState, mhDealerStr, storedDCode, storedOrderFormData] = await Promise.all([
      AsyncStorage.getItem('sapProductDetails'),
      AsyncStorage.getItem('user'),
      AsyncStorage.getItem('MatchedSDState'),
      AsyncStorage.getItem('matchedMHDealerData'),
      AsyncStorage.getItem('d_code'),
      AsyncStorage.getItem('orderFormData'), // Load previously saved form data
    ]);

    //console.log('Promise.all completed successfully.'); // <-- This is the last log you see

    // --- ADD MORE LOGS HERE ---

    //console.log('Attempting to parse sapDataStr...');
    if (sapDataStr) setSapData(JSON.parse(sapDataStr));
    //console.log('sapDataStr processed.'); // Log after sapDataStr

    //console.log('Attempting to parse userStr...');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserObj(user);
      setEmployeeId(user.employeeid);
    }
    //console.log('userStr processed.'); // Log after userStr

    //console.log('Attempting to process dealerState...');
    if (dealerState) setMatchedDealerState(dealerState);
    //console.log('dealerState processed.'); // Log after dealerState

    //console.log('Attempting to parse mhDealerStr...');
    if (mhDealerStr) setMhDealerData(JSON.parse(mhDealerStr));
    //console.log('mhDealerStr processed.'); // Log after mhDealerStr

    // Load billing address data
    //console.log('Attempting to load billing address...');
    if (dealerState === 'GJ' && mhDealerStr) {
      const mhData = JSON.parse(mhDealerStr);
      // *** PAY CLOSE ATTENTION HERE ***
      // If mhData or mhData.value is null/undefined, accessing [0] or any nested properties
      // like CardName, EmailAddress, etc., could cause a crash if not handled with ?. (optional chaining)
      // Your code already uses ?. which is good, but double-check the structure
      setBillingAddress({
        bName: mhData.value[0]?.CardName || '',
        bemail: mhData.value[0]?.EmailAddress || '',
        bphone: mhData.value[0]?.Phone1 || mhData.value[0]?.Phone2 || '',
        bcity: mhData.value[0]?.City || '',
        bstate: mhData.value[0]?.BillToState || '',
        bpincode: mhData.value[0]?.MailZipCode || '',
        billing_address: mhData.value[0]?.Address || '',
        gstIn: mhData.value[0]?.BPAddresses?.[0]?.GSTIN || '', // This nested access is vulnerable if BPAddresses is null
      });
      //console.log('Billing address for GJ processed.');
    } else if (storedDCode && storedDCode !== 'Direct Order') {
      //console.log('Attempting to fetchDealerDetails...');
      fetchDealerDetails(storedDCode);
      //console.log('fetchDealerDetails called.');
    }
    //console.log('Billing address logic completed.');

    // Restore form data from AsyncStorage
    //console.log('Attempting to restore form data...');
    if (storedOrderFormData) {
      //console.log('Restoring order form data:', storedOrderFormData);
      setFormData(JSON.parse(storedOrderFormData));
      //console.log('Form data restored.');
    }
    //console.log('Form data logic completed.');

    // Fetch leads when component loads
    //console.log('Attempting to fetchLeads...');
    fetchLeads();
    //console.log('fetchLeads called.');

   // console.log('loadStoredData function completed without explicit error.'); // Final success log

  } catch (error) {
    console.error('*** UNEXPECTED ERROR IN LOADSTOREDDATA CATCH BLOCK ***:', error);
    if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    }
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to load stored data',
    });
  } finally {
    // console.log('loadStoredData finally block executed.');
    setIsLoading(false);
  }
};

useEffect(() => {
  if (isLeadsModalVisible) {
    fetchLeads();
  }
}, [isLeadsModalVisible]);

  const fetchDealerDetails = async (cardCode) => {
    try {
      const response = await fetch(
        `${BASE_URL}/dealer?id=${cardCode}`
      );
      const data = await response.json();

      if (data?.value?.length > 0) {
        setBillingAddress({
          bName: data.value[0].CardName,
          bemail: data.value[0].EmailAddress,
          bphone: data.value[0].Phone1 || data.value[0].Phone2,
          bcity: data.value[0].City,
          bstate: data.value[0].BillToState,
          bpincode: data.value[0].MailZipCode,
          billing_address: data.value[0].Address,
          gstIn: data.value[0].BPAddresses?.[0]?.GSTIN || '',
        });
      }
    } catch (error) {
      console.error('Error fetching dealer details:', error);
    }
  };

  // Calculate Woson Bundle discount
  useEffect(() => {
    const calculateWosonDiscount = () => {
      if (!items || items.length === 0) return { discount: 0, freeDistiller: false };

      const wosonTanda = items.find(item => item.code === 'ATC/WOS/001');
      const waterDistiller = items.find(item => item.code === 'STE 404');

      if (wosonTanda && waterDistiller) {
        // DP (3) and SDP (4): Distiller is FREE — discount = full post-tax price
        if (priceList === '3' || priceList === '4') {
          const distillerPostTax = toPostTax(waterDistiller.sapPrice, waterDistiller.taxcode) * waterDistiller.quantity;
          return { discount: distillerPostTax, freeDistiller: true };
        }
        // MRP (1): ₹3,500 discount (post-tax amount)
        if (priceList === '1') return { discount: 3500, freeDistiller: false };
        // MSP (2): ₹6,000 discount (post-tax amount)
        if (priceList === '2') return { discount: 6000, freeDistiller: false };
      }
      return { discount: 0, freeDistiller: false };
    };

    const bundle = calculateWosonDiscount();
    setWosonBundleData(bundle);
    
    // Update items with discount if distiller is free
    if (bundle.freeDistiller) {
      setItems(prevItems => prevItems.map(item => {
        if (item.code === 'STE 404') {
          return { ...item, discount: 100 };
        }
        return item;
      }));
    }
  }, [items.length, priceList]);

  // Calculate total amount and points
  useEffect(() => {
    const total = items
      .filter(item => item.subcat_name !== 'Laser' && item.subcat_name !== 'Scanner')
      .reduce((sum, item) => {
        const price = typeof item.sapPrice === 'number' && item.sapPrice > 0 ? item.sapPrice : (Number(item.mrp) || 0);
        return sum + price * item.quantity;
      }, 0);
    setTotalPointsAmount(total.toFixed(2).toString());
  }, [items]);

  // Handle form changes
  const handleChange = (name, value) => {
    setFormData(prevFormData => {
      const newFormData = { ...prevFormData, [name]: value };

      // Handle freight details logic
      if (name === 'freightDetails') {
        if (value === 'Paid Basis'){
          setItems(prevItems => {
            const transportationItemExists = prevItems.some(
              item => item.id === 'TC 02'
            );

            if (!transportationItemExists) {
              return [
                ...prevItems,
                {
                  id: 'TC 02',
                  code: 'TC 02',
                  name: 'Transportation',
                  msp: 0,
                  mrp: 0,
                  sapPrice: 0,
                  quantity: 1,
                  discount: 0,
                  taxcode: 'GST18',
                  color: 'N/A',
                  remarks: 'Transport expenses',
                  image: 'transport.png',
                  subcat_name: 'Transportation', // Added subcat_name
                },
              ];
            }
            return prevItems;
          });
        } else if (value === 'To Pay') {
          setItems(prevItems =>
            prevItems.filter(item => item.id !== 'TC 02')
          );
        }
      }

      // Handle advance amount validation
      if (name === 'advanceAmount' || name === 'orderValue') {
        const orderValue = parseFloat(newFormData.orderValue || 0);
        const advanceAmount = parseFloat(newFormData.advanceAmount || 0);

        const balanceAmount = orderValue - advanceAmount;
        newFormData.balanceAmount = balanceAmount >= 0 ? balanceAmount : 0;

        // Enhanced advance amount validation
        if (!newFormData.advanceAmount || newFormData.advanceAmount.trim() === '') {
          setAdvanceErrorMessage('Advance amount is required.');
          setAdvanceWarningMessage('');
        } else if (isNaN(advanceAmount) || advanceAmount <= 0) {
          setAdvanceErrorMessage('Please enter a valid advance amount.');
          setAdvanceWarningMessage('');
        } else if (orderValue > 0 && advanceAmount > orderValue) {
          setAdvanceErrorMessage('Advance amount cannot exceed order value.');
          setAdvanceWarningMessage('');
        } else {
          setAdvanceErrorMessage('');
          // Check for 30% warning (non-blocking)
          if (orderValue > 0 && advanceAmount < 0.3 * orderValue) {
            setAdvanceWarningMessage(
              'Advance amount is less than 30% of the order value.'
            );
          } else {
            setAdvanceWarningMessage('');
          }
        }
      }

      // Store in AsyncStorage
      AsyncStorage.setItem('orderFormData', JSON.stringify(newFormData));
      return newFormData;
    });
  };

  const handleShippingChange = (name, value) => {
    // Check address length validation
    if (name === 'shipping_address' && value.length > 99) {
      setShippingErrors(prevErrors => ({
        ...prevErrors,
        [name]: 'Address must be less than 99 characters. Please reduce address length.'
      }));
      return; // Don't update the value if it exceeds limit
    }
    
    setShippingAddress(prevState => ({
      ...prevState,
      [name]: value,
    }));
    
    // Clear error for this field when user starts typing
    if (shippingErrors[name]) {
      setShippingErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBillingChange = (name, value) => {
    // Check address length validation
    if (name === 'billing_address' && value.length > 99) {
      setBillingErrors(prevErrors => ({
        ...prevErrors,
        [name]: 'Address must be less than 99 characters. Please reduce address length.'
      }));
      return; // Don't update the value if it exceeds limit
    }
    
    setBillingAddress(prevState => ({
      ...prevState,
      [name]: value,
    }));
    
    // Clear error for this field when user starts typing
    if (billingErrors[name]) {
      setBillingErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDoctorOrCompanyChange = (value) => {
    setFormData({ ...formData, doctorOrCompany: value });
  };

  const handleDoctorCompanyTypeChange = (type) => {
    setDoctorCompanyType(type);
    setFormData({ ...formData, doctorCompanyName: '' });
  };

  const handleDoctorCompanyNameChange = (value) => {
    setFormData({ ...formData, doctorCompanyName: value });
  };

  // Validate billing fields
  const validateBillingFields = () => {
    const errors = {};
    const requiredFields = ['bName', 'bemail', 'bphone', 'billing_address', 'bcity', 'bstate', 'bpincode'];
    
    requiredFields.forEach(field => {
      if (!billingAddress[field] || billingAddress[field].trim() === '') {
        const fieldName = field.replace('b', '').replace('_', ' ');
        errors[field] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
    });
    
    // Email validation
    if (billingAddress.bemail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingAddress.bemail)) {
      errors.bemail = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (billingAddress.bphone && !/^[0-9]{10}$/.test(billingAddress.bphone.replace(/[^0-9]/g, ''))) {
      errors.bphone = 'Please enter a valid 10-digit phone number';
    }
    
    // Pincode validation
    if (billingAddress.bpincode && !/^[0-9]{6}$/.test(billingAddress.bpincode)) {
      errors.bpincode = 'Please enter a valid 6-digit pincode';
    }
    
    // Address length validation
    if (billingAddress.billing_address && billingAddress.billing_address.length > 99) {
      errors.billing_address = 'Address must be less than 99 characters. Please reduce address length.';
    }
    
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate shipping fields
  const validateShippingFields = () => {
    const errors = {};
    const requiredFields = ['customerName', 'email', 'phone', 'shipping_address', 'city', 'state', 'pincode'];
    
    requiredFields.forEach(field => {
      if (!shippingAddress[field] || shippingAddress[field].trim() === '') {
        const fieldName = field.replace('_', ' ');
        errors[field] = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
    });
    
    // Email validation
    if (shippingAddress.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (shippingAddress.phone && !/^[0-9]{10}$/.test(shippingAddress.phone.replace(/[^0-9]/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    // Pincode validation
    if (shippingAddress.pincode && !/^[0-9]{6}$/.test(shippingAddress.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }
    
    // Address length validation
    if (shippingAddress.shipping_address && shippingAddress.shipping_address.length > 99) {
      errors.shipping_address = 'Address must be less than 99 characters. Please reduce address length.';
    }
    
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Date picker handlers
  const showDatePickerModal = (type) => {
    setDatePickerType(type);
    if (type === 'dispatch') {
      setShowDatePicker(true);
    } else {
      setShowClinicDatePicker(true);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (datePickerType === 'dispatch') {
      setShowDatePicker(false);
      if (selectedDate) {
        handleChange('expectedDispatchDate', selectedDate.toISOString().split('T')[0]);
      }
    } else {
      setShowClinicDatePicker(false);
      if (selectedDate) {
        handleChange('clinicOpeningDate', selectedDate.toISOString().split('T')[0]);
      }
    }
  };

  // File picker
 const pickDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      // type: is now a string or array of MIME types
      type: ['image/*', 'application/pdf'], // Use standard MIME types for images and PDF
      // You might want to copy the file to cache directory for easier access later
      copyToCacheDirectory: true,
    });

    // Check for cancellation in expo-document-picker
    if (!result.canceled) {
      // Access the selected file details from result.assets[0]
      const selectedFile = result.assets[0];

      setFile(selectedFile); // Assuming setFile expects an object like { uri, name, size, etc. }

      Toast.show({
        type: 'success',
        text1: 'File Selected',
        text2: selectedFile.name, // Access name from selectedFile
      });

      // console.log('Selected file URI:', selectedFile.uri);
      // console.log('Selected file name:', selectedFile.name);
      // console.log('Selected file MIME type:', selectedFile.mimeType);
      // console.log('Selected file size:', selectedFile.size);

    } else {
      // User cancelled
      // console.log('User cancelled file picker');
      // You might still want a toast for cancellation, or just let it pass
      Toast.show({
        type: 'info',
        text1: 'File Selection Cancelled',
        text2: 'No file was chosen.',
      });
    }
  } catch (err) {
    // This catch block will only hit for actual errors, not user cancellation
    console.error('Expo Document Picker Error:', err);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to pick file',
    });
  }
};


  // Calculate pricing functions
  const calculatePriceAfterDiscount = (item) => {
    const price = typeof item.sapPrice === 'number' && item.sapPrice > 0 ? item.sapPrice : (Number(item.mrp) || 0);
    return price;
  };

  const calculateGrossPrice = (item) => {
    return calculatePriceAfterDiscount(item) * item.quantity;
  };

  const calculateTotalOrderValue = () => {
    return items
      .reduce((total, item) => {
        return total + toPostTax(calculatePriceAfterDiscount(item), item.taxcode) * item.quantity;
      }, 0)
      .toFixed(2);
  };

  const generateUniqueId = (existingIds = new Set()) => {
    let id;
    do {
      id = Math.floor(Math.random() * 1000000);
    } while (existingIds.has(id));
    return id;
  };

  // Update order values
  useEffect(() => {
    const orderValue = calculateTotalOrderValue();
    setInitialOrderValue(orderValue);

    const advanceAmount = parseFloat(formData.advanceAmount || 0);
    const balanceAmount = (
      parseFloat(orderValue) - advanceAmount
    ).toFixed(2);
    setFormData(prevData => ({
      ...prevData,
      balanceAmount,
      orderValue: orderValue, // Set orderValue in formData
    }));
  }, [items, formData.advanceAmount]); // Recalculate if items or advanceAmount changes

  // Load leads with caching
 const fetchLeads = async (forceRefresh = false) => {
  try {
    setIsLoading(true);
    setErrorMessage('');
    
    const empName = await AsyncStorage.getItem('sales_person');
    if (!empName) {
      setErrorMessage('Sales person name not found in storage.');
      return;
    }

    const cacheKey = `leads_${empName}`;
    
    // Try to get cached data first
    if (!forceRefresh) {
      const cachedLeads = await CacheManager.getCache(cacheKey);
      if (cachedLeads) {
        setLeads(cachedLeads);
        setIsLoading(false);
        return;
      }
    }

    const userRole = await AsyncStorage.getItem('role');

    if (userRole === 'coordinator') {
      const empIdResponse = await fetch(
        `${BASE_URL}/sales_employee_id/?name=${empName}`
      );
      
      if (!empIdResponse.ok) {
        throw new Error('Failed to fetch employee ID');
      }
      
      const empIdData = await empIdResponse.json();
      const idToUse = empIdData.id;

      if (!idToUse) {
        setErrorMessage(`No employee found with the name ${empName}.`);
        return;
      }

      const leadsResponse = await fetch(
        `${BASE_URL}/open_leads`
      );
      
      if (!leadsResponse.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const leadsData = await leadsResponse.json();

      if (leadsData.value && leadsData.value.length > 0) {
        const filteredLeads = leadsData.value.filter(
          lead => lead.SalesOpportunities?.DataOwnershipfield === idToUse
        );
        
        setLeads(filteredLeads);
        await CacheManager.setCache(cacheKey, filteredLeads, true); // Never expire

        if (filteredLeads.length === 0) {
          setErrorMessage(`No leads found for the sales employee ${empName}.`);
        }
      } else {
        setErrorMessage('No leads available.');
      }
    } else {
      // Non-coordinator role logic
      const empIdResponse = await fetch(
        `${BASE_URL}/sales_employee_id/?name=${empName}`
      );
      
      if (!empIdResponse.ok) {
        throw new Error('Failed to fetch employee ID');
      }
      
      const empIdData = await empIdResponse.json();
      const idToUse = empIdData.id;

      if (!idToUse) {
        setErrorMessage(`No employee found with the name ${empName}.`);
        return;
      }

      const salesEmpCodeResponse = await fetch(
        `${BASE_URL}/salesEmpCode?id=${idToUse}`
      );
      
      if (!salesEmpCodeResponse.ok) {
        throw new Error('Failed to fetch sales employee code');
      }
      
      const salesEmpCodeData = await salesEmpCodeResponse.json();
      const salesEmpCode = salesEmpCodeData.SalesEmpCode;

      if (!salesEmpCode) {
        setErrorMessage('Sales employee code could not be retrieved.');
        return;
      }

      const leadsResponse = await fetch(
        `${BASE_URL}/open_leads`
      );
      
      if (!leadsResponse.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const leadsData = await leadsResponse.json();

      if (leadsData.value && leadsData.value.length > 0) {
        const filteredLeads = leadsData.value.filter(
          lead => lead.SalesOpportunities?.SalesPerson === salesEmpCode
        );
        
        setLeads(filteredLeads);
        await CacheManager.setCache(cacheKey, filteredLeads, true); // Never expire

        if (filteredLeads.length === 0) {
          setErrorMessage(`No leads found for the sales employee ${empName}.`);
        }
      } else {
        setErrorMessage('No leads available.');
      }
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    setErrorMessage('An error occurred while fetching leads. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  // Handle lead selection
  const handleLeadSelect = (lead) => {
    if (!lead || !lead.BusinessPartners) {
      console.error('Invalid lead object');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid lead data.',
      });
      return;
    }

    setSelectedLeads([lead]);
    setShippingAddress({
      customerName: lead.BusinessPartners.CardName || '',
      phone: lead.BusinessPartners.Cellular || '',
      email: lead.BusinessPartners.EmailAddress || '',
      city: lead.BusinessPartners.City || '',
      state: lead.BusinessPartners.ShipToState || '',
      pincode: lead.BusinessPartners.ZipCode || '',
      shipping_address: lead.BusinessPartners.Address || '',
    });
    setIsLeadsModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Lead Selected',
      text2: lead.BusinessPartners?.CardName,
    });
  };

  // Handle Add Lead navigation
  const handleAddLead = () => {
    setIsLeadsModalVisible(false);
    setFromPurchasePage(true);
    // Store the current page context to return to checkout after adding lead
    AsyncStorage.setItem('returnToCheckout', 'true');
    router.push('/(tabs)/EnterLeads');
  };

  // Handle reload leads
  const handleReloadLeads = () => {
    fetchLeads(true); // Force refresh
    Toast.show({
      type: 'info',
      text1: 'Refreshing',
      text2: 'Loading latest leads...',
    });
  };

  // Submit order
const handleSubmit = async () => {
  // Validate required fields
  const newFormErrors = {};
  
  if (!payId) newFormErrors.payId = 'Payment ID is required.';
  if (!file) newFormErrors.file = 'Payment receipt is required.';
  if (items.length === 0) newFormErrors.items = 'Cart must have items.';
  
  // Validate doctor/company fields
  if (!formData.doctorCompanyName || formData.doctorCompanyName.trim() === '') {
    newFormErrors.doctorCompanyName = `${doctorCompanyType === 'doctor' ? 'Doctor' : 'Company'} name is required.`;
  }
  
  if (!formData.expectedDispatchDate) newFormErrors.expectedDispatchDate = 'Expected Dispatch Date is required.';
  if (!formData.logisticType) newFormErrors.logisticType = 'Logistic Type is required.';
  if (!formData.freightDetails) newFormErrors.freightDetails = 'Freight Details is required.';
  if (formData.orderValue <= 0) newFormErrors.orderValue = 'Order value must be greater than 0.';
  if (advanceErrorMessage) newFormErrors.advanceAmount = advanceErrorMessage;
  
  // Validate billing and shipping addresses
  const isBillingValid = validateBillingFields();
  const isShippingValid = validateShippingFields();
  
  if (!isBillingValid) {
    newFormErrors.billing = 'Please fill all required billing details.';
  }
  
  if (!isShippingValid) {
    newFormErrors.shipping = 'Please fill all required shipping details.';
  }
  
  if (employeeId !== 8 && selectedLeads.length === 0) {
    newFormErrors.selectedLeads = 'Please select an associated lead.';
  }

  setFormErrors(newFormErrors);

  if (Object.keys(newFormErrors).length > 0) {
    Toast.show({
      type: 'error',
      text1: 'Validation Error',
      text2: 'Please fill all required fields correctly.',
    });
    return;
  }

  if (!orderId) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Order ID is missing. Please restart the form.',
    });
    return;
  }

  setLoading(true);

  try {
    // Get stored values
    const [storedRole, sales_emp, storedDCode] = await Promise.all([
      AsyncStorage.getItem('role'),
      AsyncStorage.getItem('sales_person'),
      AsyncStorage.getItem('d_code'),
    ]);

    // Get sequence ID if needed
    let sequenceIds;
    if (employeeId !== 8) {
      if (!selectedLeads[0]?.SalesOpportunities?.SequentialNo) {
        throw new Error('Selected lead or its sequential number is missing.');
      }
      sequenceIds = selectedLeads[0].SalesOpportunities.SequentialNo;
    }

    // Prepare product data
    const productNames = items.map(item => item.name);
    const names = productNames.join(', ');
    const quantity = items.map(item => item.quantity);
    const quan = quantity.join(', ');
    const productColor = items.map(item => item.color);
    const col = productColor.join(', ');

    const {
      logisticType,
      paymentMode,
      expectedDispatchDate,
      clinicOpeningDate,
      advanceAmount,
    } = formData;

    const { customerName, email, phone, shipping_address, state, pincode, city } = shippingAddress;
    const currentDate = new Date().toISOString().split('T')[0];

    // Calculate total amount
    const calculateTotalAmount = () => {
      return parseFloat(formData.orderValue || 0);
    };

    const totalAmount = calculateTotalAmount();
    const pendingAmount = totalAmount - (parseFloat(advanceAmount) || 0);

    // Determine dealer code
    let dCode;
    if (matchedDealerState === "GJ") {
      dCode = mhDealerData?.value?.[0]?.CardCode || '';
    } else {
      dCode = storedDCode === 'Direct Order' ? '1234' : (storedDCode || '');
    }

    // Prepare order details
    const addOrderDetails = {
      id: orderId,
      role: storedRole || '',
      exe_name: sales_emp || '',
      cno: '',
      d_code: dCode,
      products: names,
      qty: quan,
      color: col || '',
      log_type: logisticType || '',
      name: customerName,
      email: email,
      phone: phone,
      address: shipping_address,
      country: 'India',
      state: state,
      pincode: pincode,
      pay_mode: paymentMode || '',
      bname: billingAddress.bName,
      bemail: billingAddress.bemail,
      bphone: billingAddress.bphone,
      baddress: billingAddress.billing_address,
      bcity: billingAddress.bcity,
      city: city,
      bstate: billingAddress.bstate,
      bpincode: billingAddress.bpincode,
      subdealer: matchedDealerState === 'GJ' ? storedDCode : '1234',
      expect_date: expectedDispatchDate || '',
      opening_date: clinicOpeningDate || '',
      total_amount: totalAmount || 0,
      paid_amount: parseFloat(advanceAmount) || 0,
      pending_amount: pendingAmount || 0,
      status: 'Waiting',
      order_status: 'Waiting',
      track: '',
      logistic: logisticType || '',
      logistic_status: 'Waiting',
      payment: '',
      pay_sts: formData.freightDetails,
      read_sts: 'unread',
      aread: 'unread',
      lread: 'unread',
      pread: 'unread',
      lg_sts: 'unread',
      transportation: logisticType || '',
      order_date: currentDate,
      ship_date: '',
      delivery_date: '',
      cmpstate: totalPointsAmount,
      return_type: 1,
    };

    // Prepare order items data
    const existingItemIds = new Set();
    const ordData = items.map((item) => {
      const productPrice = calculatePriceAfterDiscount(item);
      const discountedPrice = productPrice;

      return {
        orderid: orderId,
        id: generateUniqueId(existingItemIds),
        product_name: item.name,
        suction: item.suction || 'Not Applicable',
        product_price: productPrice || 0,
        product_image: item.image || '',
        qty: item.quantity,
        discount: 0,
        dprice: discountedPrice || 0,
        color: item.color || '',
        product_code: item.code,
        specification: item.remarks || '',
        remarks: '',
        status: item.package ? item.package : 'Not Applicable',
      };
    });

    // API call functions
    const postOrderDetails = async () => {
      try {
        const response = await fetch(`${BASE_URL}/add_order_details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addOrderDetails),
        });

        const data = await response.json();
        if (response.ok) {
          return data;
        } else {
          throw new Error(data.message || 'Failed to submit order details');
        }
      } catch (error) {
        console.error('Error posting order details:', error);
        throw error;
      }
    };

    const postOrderFormData = async () => {
      try {
        const formDataPayload = new FormData();
        formDataPayload.append('pay_id', payId);
        formDataPayload.append('order_id', orderId);
        formDataPayload.append('file', {
          uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
          name: file.name || 'receipt.jpg',
          type: file.type || 'image/jpeg',
        });

        const response = await fetch(`${BASE_URL}/upload_receipt`, {
          method: 'POST',
          body: formDataPayload,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const data = await response.json();
        if (response.ok) {
          return data;
        } else {
          throw new Error(data.message || 'Failed to submit order form data');
        }
      } catch (error) {
        console.error('Error posting order form data:', error);
        throw error;
      }
    };

    const postOrderItems = async () => {
      try {
        const response = await fetch(`${BASE_URL}/add_order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: ordData, specs }),
        });

        const data = await response.json();
        if (response.ok) {
          return data;
        } else {
          throw new Error(data.message || 'Failed to submit order items');
        }
      } catch (error) {
        console.error('Error posting order items:', error);
        throw error;
      }
    };

    const postSequenceId = async () => {
      try {
        const response = await fetch(`${BASE_URL}/sequence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sequence_id: sequenceIds,
            order_id: orderId,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          return data;
        } else {
          throw new Error(data.message || 'Failed to submit sequence');
        }
      } catch (error) {
        console.error('Error posting sequence:', error);
        throw error;
      }
    };

    // Execute API calls
    let seqResult = { success: true };
    if (employeeId !== 8) {
      seqResult = await postSequenceId();
    }

    if (seqResult && seqResult.success) {
      const [orderDetailsResult, orderFormDataResult, orderItemsResult] = await Promise.all([
        postOrderDetails(),
        postOrderFormData(),
        postOrderItems(),
      ]);

      // Check if all results are successful
      const allResultsSuccessful = [seqResult, orderDetailsResult, orderFormDataResult, orderItemsResult]
        .every((result, index) => {
          // For order items API (index 3), check if it's an array
          if (index === 3) {
            return Array.isArray(result);
          }
          // For other results, check if result has success property
          return result && result.success;
        });

      if (allResultsSuccessful) {
        // Add points for successful order only
        try {
          // Calculate points: 1% of total order value (minimum 50 points, maximum 500 points)
          const orderValue = totalAmount || 0;
          let orderPoints = Math.floor(orderValue * 0.01); // 1% of order value
          orderPoints = Math.max(50, Math.min(orderPoints, 500)); // Between 50-500 points
          
          const activityType = 2; // Order completion activity
          const pointsAdded = await addPointsToTable(orderPoints, activityType);
          
          if (pointsAdded) {
            setEarnedOrderPoints(orderPoints);
            // Show reward card after a delay so success animation plays first
            setTimeout(() => {
              setShowRewardCard(true);
            }, 2000);
          }
          
          console.log(`Added ${orderPoints} points for successful order value ₹${orderValue}`);
        } catch (error) {
          console.error('Error adding order points:', error);
        }
        
        setShowSuccess(true);
        // Don't show toast when we have the success animation
        
      } else {
        // No points for failed order - just show success message
        Toast.show({
          type: 'success',
          text1: 'Order Placed',
          text2: 'Order details submitted successfully!',
        });
        setShowSuccess(true);
      }

    } else {
      shake();
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Lead already exists. Please try different Lead.',
      });
      console.error('postSequenceId failed:', seqResult);
    }

  } catch (error) {
    console.error('Error during API submission:', error);
    Toast.show({
      type: 'error',
      text1: 'Submission Error',
      text2: `Error: ${error.message}`,
    });
  } finally {
    setLoading(false);
  }
};

// Helper function to clear form data
const clearFormData = async () => {
  setPayId('');
  setFile(null);
  setFormData({
    advanceAmount: '',
    balanceAmount: 0,
    expectedDispatchDate: '',
    freightDetails: '',
    logisticType: '',
    clinicOpeningDate: '',
    paymentMode: 'Offline',
    doctorOrCompany: '',
    gstNumber: '',
    customerRefNo: '',
    orderValue: 0,
  });
  setShippingAddress({
    customerName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    pincode: '',
    shipping_address: '',
  });
  setBillingAddress({
    bName: '',
    bemail: '',
    bphone: '',
    bcity: '',
    bstate: '',
    bpincode: '',
    billing_address: '',
    gstIn: '',
  });
  setSelectedLeads([]);
  setItems([]);
  clearCart();

  // Remove stored data
  await AsyncStorage.removeItem('cart');
  await AsyncStorage.removeItem('orderFormData');
};

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Pagination for leads
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const filteredLeads = leads.filter(lead => {
    const cardName = lead.BusinessPartners?.CardName || '';
    const cellular = lead.BusinessPartners?.Cellular || '';
    const city = lead.BusinessPartners?.City || '';

    return (
      cardName.toLowerCase().includes(searchLeadTerm.toLowerCase()) ||
      cellular.toLowerCase().includes(searchLeadTerm.toLowerCase()) ||
      city.toLowerCase().includes(searchLeadTerm.toLowerCase())
    );
  });
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);

  const nextPage = () => {
    if (currentPage < Math.ceil(filteredLeads.length / leadsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  

  // if (isLoading) {
  //   return (
  //     <SafeAreaView style={styles.safeArea}>
  //       <View style={styles.loadingContainer}>
  //         <LoadingPulse style={{ width: 60, height: 60, backgroundColor: colors.primary, borderRadius: 30 }} />
  //         <Text style={styles.loadingText}>Loading order details...</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

 return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior="padding">
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* Order Summary Section */}
          <FadeInView delay={0} style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {wosonBundleData.discount > 0 && (
              <View style={styles.wosonBundleNotice}>
                <Text style={styles.wosonBundleText}>
                  Woson Bundle Discount Applied!
                </Text>
                <Text style={styles.wosonBundleDetail}>
                  {wosonBundleData.freeDistiller
                    ? 'Water Distiller is FREE with Woson Tanda!'
                    : `Discount: ${formatCurrency(wosonBundleData.discount)}`}
                </Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal (incl. GST):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(formData.orderValue || 0))}</Text>
            </View>
            {wosonBundleData.discount > 0 && (
              <View style={[styles.summaryRow, styles.discountRow]}>
                <Text style={styles.discountLabel}>Woson Bundle Discount:</Text>
                <Text style={styles.discountValue}>- {formatCurrency(wosonBundleData.discount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Order Value (incl. GST):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(formData.orderValue || 0))}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Points Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(parseFloat(totalPointsAmount || 0))}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Advance Amount:</Text>
              <TextInput
                style={[styles.input, formErrors.advanceAmount && styles.inputError]}
                keyboardType="numeric"
                value={(formData.advanceAmount || '').toString()}
                onChangeText={(text) => handleChange('advanceAmount', text)}
                placeholder="Enter advance amount"
              />
            </View>
            {advanceErrorMessage ? (
              <Text style={styles.errorText}>{advanceErrorMessage}</Text>
            ) : null}
            {advanceWarningMessage ? (
              <Text style={styles.warningText}>{advanceWarningMessage}</Text>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Balance Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(formData.balanceAmount || 0)}</Text>
            </View>
          </FadeInView>

          {/* Leads Section */}
          {employeeId !== null && employeeId !== 8 && (
            <FadeInView delay={100} style={styles.section}>
              <Text style={styles.sectionTitle}>Associated Lead</Text>
              <AnimatedButton
                style={styles.button}
                textStyle={styles.buttonText}
                onPress={() => setIsLeadsModalVisible(true)}
              >
                Select Lead
              </AnimatedButton>
              {formErrors.selectedLeads && <Text style={styles.errorText}>{formErrors.selectedLeads}</Text>}

              {selectedLeads.length > 0 && (
                <View style={styles.selectedLeadContainer}>
                  <Text style={styles.selectedLeadText}>
                    Selected Lead: {selectedLeads[0].BusinessPartners?.CardName || 'N/A'}
                  </Text>
                  <Text style={styles.selectedLeadText}>
                    Phone: {selectedLeads[0].BusinessPartners?.Cellular || 'N/A'}
                  </Text>
                </View>
              )}
            </FadeInView>
          )}

          {/* General Order Information */}
          <FadeInView delay={200} style={styles.section}>
            <Text style={styles.sectionTitle}>General Order Information</Text>

            <Text style={styles.label}>Select Type:</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity 
                style={styles.radioOption}
                onPress={() => handleDoctorCompanyTypeChange('doctor')}
              >
                <View style={[styles.radioButton, doctorCompanyType === 'doctor' && styles.radioButtonSelected]}>
                  {doctorCompanyType === 'doctor' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioText}>Doctor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.radioOption}
                onPress={() => handleDoctorCompanyTypeChange('company')}
              >
                <View style={[styles.radioButton, doctorCompanyType === 'company' && styles.radioButtonSelected]}>
                  {doctorCompanyType === 'company' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioText}>Company</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>{doctorCompanyType === 'doctor' ? 'Doctor' : 'Company'} Name:</Text>
            <TextInput
              style={[styles.input, formErrors.doctorCompanyName && styles.inputError]}
              value={formData.doctorCompanyName || ''}
              onChangeText={handleDoctorCompanyNameChange}
              placeholder={`Enter ${doctorCompanyType === 'doctor' ? 'Doctor' : 'Company'} Name`}
            />
            {formErrors.doctorCompanyName && (
              <Text style={styles.errorText}>{formErrors.doctorCompanyName}</Text>
            )}

            <Text style={styles.label}>GST Number:</Text>
            <TextInput
              style={styles.input}
              value={formData.gstNumber || ''}
              onChangeText={(text) => handleChange('gstNumber', text)}
              placeholder="Enter GST Number"
            />

            <Text style={styles.label}>Customer Ref. No.:</Text>
            <TextInput
              style={styles.input}
              value={formData.customerRefNo || ''}
              onChangeText={(text) => handleChange('customerRefNo', text)}
              placeholder="Enter Customer Reference Number"
            />

            <Text style={styles.label}>Expected Dispatch Date:</Text>
            <TouchableOpacity onPress={() => showDatePickerModal('dispatch')} style={[styles.input, formErrors.expectedDispatchDate && styles.inputError, styles.datePickerButton]}>
              <Text>{formData.expectedDispatchDate || 'Select Date'}</Text>
              <Icon name="calendar-today" size={20} color="#888" />
            </TouchableOpacity>
            {formErrors.expectedDispatchDate && <Text style={styles.errorText}>{formErrors.expectedDispatchDate}</Text>}
            {showDatePicker && (
              <DateTimePicker
                testID="dispatchDatePicker"
                value={formData.expectedDispatchDate ? new Date(formData.expectedDispatchDate) : new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>Clinic Opening Date:</Text>
            <TouchableOpacity onPress={() => showDatePickerModal('clinic')} style={[styles.input, styles.datePickerButton]}>
              <Text>{formData.clinicOpeningDate || 'Select Date (Optional)'}</Text>
              <Icon name="calendar-today" size={20} color="#888" />
            </TouchableOpacity>
            {showClinicDatePicker && (
              <DateTimePicker
                testID="clinicDatePicker"
                value={formData.clinicOpeningDate ? new Date(formData.clinicOpeningDate) : new Date()}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}

            <Text style={styles.label}>Logistic Type:</Text>
            <View style={[styles.pickerContainer, formErrors.logisticType && styles.inputError]}>
              <Picker
                selectedValue={formData.logisticType || ''}
                onValueChange={(itemValue) => handleChange('logisticType', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Logistic Type" value="" />
                <Picker.Item label="By Road" value="By Road" />
                <Picker.Item label="By Train" value="By Train" />
              </Picker>
            </View>
            {formErrors.logisticType && <Text style={styles.errorText}>{formErrors.logisticType}</Text>}

            <Text style={styles.label}>Freight Details:</Text>
            <View style={[styles.pickerContainer, formErrors.freightDetails && styles.inputError]}>
              <Picker
                selectedValue={formData.freightDetails || ''}
                onValueChange={(itemValue) => handleChange('freightDetails', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Freight Details" value="" />
                <Picker.Item label="Paid Basis" value="Paid Basis" />
                <Picker.Item label="To Pay" value="To Pay" />
              </Picker>
            </View>
            {formErrors.freightDetails && <Text style={styles.errorText}>{formErrors.freightDetails}</Text>}

            <Text style={styles.label}>Payment Mode:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.paymentMode || 'Offline'}
                onValueChange={(itemValue) => handleChange('paymentMode', itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Offline" value="Offline" />
                <Picker.Item label="Online" value="Online" />
              </Picker>
            </View>
          </FadeInView>

          {/* Shipping Address */}
          <FadeInView delay={300} style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Customer Name *</Text>
              <TextInput
                style={[styles.enhancedInput, shippingErrors.customerName && styles.inputError]}
                value={shippingAddress.customerName || ''}
                onChangeText={(text) => handleShippingChange('customerName', text)}
                placeholder="Enter customer name"
              />
              {shippingErrors.customerName && (
                <Text style={styles.errorText}>{shippingErrors.customerName}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[styles.enhancedInput, shippingErrors.email && styles.inputError]}
                value={shippingAddress.email || ''}
                onChangeText={(text) => handleShippingChange('email', text)}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {shippingErrors.email && (
                <Text style={styles.errorText}>{shippingErrors.email}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[styles.enhancedInput, shippingErrors.phone && styles.inputError]}
                value={shippingAddress.phone || ''}
                onChangeText={(text) => handleShippingChange('phone', text)}
                placeholder="Enter 10-digit phone number"
                keyboardType="phone-pad"
                maxLength={12}
              />
              {shippingErrors.phone && (
                <Text style={styles.errorText}>{shippingErrors.phone}</Text>
              )}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Shipping Address *</Text>
              <TextInput
                style={[styles.enhancedInput, styles.textArea, shippingErrors.shipping_address && styles.inputError]}
                value={shippingAddress.shipping_address || ''}
                onChangeText={(text) => handleShippingChange('shipping_address', text)}
                placeholder="Enter complete shipping address"
                multiline
                numberOfLines={3}
                maxLength={99}
              />
              {shippingErrors.shipping_address && (
                <Text style={styles.errorText}>{shippingErrors.shipping_address}</Text>
              )}
            </View>
            
            <View style={styles.rowContainer}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.enhancedInput, shippingErrors.city && styles.inputError]}
                  value={shippingAddress.city || ''}
                  onChangeText={(text) => handleShippingChange('city', text)}
                  placeholder="Enter city"
                />
                {shippingErrors.city && (
                  <Text style={styles.errorText}>{shippingErrors.city}</Text>
                )}
              </View>
              
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.enhancedInput, shippingErrors.state && styles.inputError]}
                  value={shippingAddress.state || ''}
                  onChangeText={(text) => handleShippingChange('state', text)}
                  placeholder="Enter state"
                />
                {shippingErrors.state && (
                  <Text style={styles.errorText}>{shippingErrors.state}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={[styles.enhancedInput, shippingErrors.pincode && styles.inputError]}
                value={shippingAddress.pincode || ''}
                onChangeText={(text) => handleShippingChange('pincode', text)}
                placeholder="Enter 6-digit pincode"
                keyboardType="numeric"
                maxLength={6}
              />
              {shippingErrors.pincode && (
                <Text style={styles.errorText}>{shippingErrors.pincode}</Text>
              )}
            </View>
          </FadeInView>

          {/* Billing Address */}
          <FadeInView delay={400} style={styles.enhancedSection}>
            <Text style={styles.enhancedSectionTitle}>Billing Address</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Billing Name *</Text>
              <TextInput
                style={[styles.enhancedInput, billingErrors.bName && styles.inputError]}
                value={billingAddress.bName || ''}
                onChangeText={(text) => handleBillingChange('bName', text)}
                placeholder="Enter billing name"
              />
              {billingErrors.bName && (
                <Text style={styles.errorText}>{billingErrors.bName}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Billing Email *</Text>
              <TextInput
                style={[styles.enhancedInput, billingErrors.bemail && styles.inputError]}
                value={billingAddress.bemail || ''}
                onChangeText={(text) => handleBillingChange('bemail', text)}
                placeholder="Enter billing email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {billingErrors.bemail && (
                <Text style={styles.errorText}>{billingErrors.bemail}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Billing Phone *</Text>
              <TextInput
                style={[styles.enhancedInput, billingErrors.bphone && styles.inputError]}
                value={billingAddress.bphone || ''}
                onChangeText={(text) => handleBillingChange('bphone', text)}
                placeholder="Enter 10-digit phone number"
                keyboardType="phone-pad"
                maxLength={12}
              />
              {billingErrors.bphone && (
                <Text style={styles.errorText}>{billingErrors.bphone}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Billing Address *</Text>
              <TextInput
                style={[styles.enhancedInput, styles.textArea, billingErrors.billing_address && styles.inputError]}
                value={billingAddress.billing_address || ''}
                onChangeText={(text) => handleBillingChange('billing_address', text)}
                placeholder="Enter complete billing address"
                multiline
                numberOfLines={3}
                maxLength={99}
              />
              {billingErrors.billing_address && (
                <Text style={styles.errorText}>{billingErrors.billing_address}</Text>
              )}
            </View>
            
            <View style={styles.rowContainer}>
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={[styles.enhancedInput, billingErrors.bcity && styles.inputError]}
                  value={billingAddress.bcity || ''}
                  onChangeText={(text) => handleBillingChange('bcity', text)}
                  placeholder="Enter city"
                />
                {billingErrors.bcity && (
                  <Text style={styles.errorText}>{billingErrors.bcity}</Text>
                )}
              </View>
              
              <View style={[styles.formGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={[styles.enhancedInput, billingErrors.bstate && styles.inputError]}
                  value={billingAddress.bstate || ''}
                  onChangeText={(text) => handleBillingChange('bstate', text)}
                  placeholder="Enter state"
                />
                {billingErrors.bstate && (
                  <Text style={styles.errorText}>{billingErrors.bstate}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={[styles.enhancedInput, billingErrors.bpincode && styles.inputError]}
                value={billingAddress.bpincode || ''}
                onChangeText={(text) => handleBillingChange('bpincode', text)}
                placeholder="Enter 6-digit pincode"
                keyboardType="numeric"
                maxLength={6}
              />
              {billingErrors.bpincode && (
                <Text style={styles.errorText}>{billingErrors.bpincode}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
              <TextInput
                style={styles.enhancedInput}
                value={billingAddress.gstIn || ''}
                onChangeText={(text) => handleBillingChange('gstIn', text)}
                placeholder="Enter GSTIN if applicable"
                autoCapitalize="characters"
              />
            </View>
          </FadeInView>

          {/* Payment Proof Section */}
          <FadeInView delay={500} style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Proof</Text>
            <TextInput
              style={[styles.input, formErrors.payId && styles.inputError]}
              value={payId || ''}
              onChangeText={setPayId}
              placeholder="Enter Payment ID"
              maxLength={12}
            />
            {formErrors.payId && <Text style={styles.errorText}>{formErrors.payId}</Text>}
            <AnimatedButton style={styles.button} textStyle={styles.buttonText} onPress={pickDocument}>
              Pick Payment Receipt
            </AnimatedButton>
            {file && <Text style={styles.fileName}>Selected File: {file.name}</Text>}
            {formErrors.file && <Text style={styles.errorText}>{formErrors.file}</Text>}
          </FadeInView>

          {/* Submit Button */}
          <FadeInView delay={600}>
            <AnimatedButton
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              textStyle={styles.submitButtonText}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                "Submit Order"
              )}
            </AnimatedButton>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Enhanced Modal */}
      <Modal 
  animationType="slide" 
  transparent={true} 
  visible={isLeadsModalVisible} 
  onRequestClose={() => setIsLeadsModalVisible(false)}
>
  <SlideModal
    visible={isLeadsModalVisible}
    onClose={() => setIsLeadsModalVisible(false)}
  >
    <Text style={styles.modalTitle}>Select Lead</Text>
    
    {/* Header Action Buttons */}
    <View style={styles.modalHeaderActions}>
      <TouchableOpacity
        style={styles.addLeadButton}
        onPress={handleAddLead}
        activeOpacity={0.8}
      >
        <Text style={styles.addLeadButtonText}>+ Add Lead</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.reloadButton}
        onPress={handleReloadLeads}
        activeOpacity={0.8}
      >
        <Text style={styles.reloadButtonText}>🔄 Reload</Text>
      </TouchableOpacity>
    </View>
    
    <TextInput
      style={styles.searchInput}
      placeholder="Search by name, phone, or city"
      value={searchLeadTerm}
      onChangeText={setSearchLeadTerm}
      placeholderTextColor="#64748b"
      autoCorrect={false}
      autoCapitalize="none"
    />
        
    {isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading leads...</Text>
      </View>
    ) : errorMessage ? (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchLeads}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <FlatList
        data={currentLeads}
        keyExtractor={(item) => item.BusinessPartners?.CardCode || Math.random().toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.leadItem}
            onPress={() => handleLeadSelect(item)}
          >
            <Text style={styles.leadName}>{item.BusinessPartners?.CardName || 'N/A'}</Text>
            <Text style={styles.leadDetail}>{item.BusinessPartners?.Cellular || 'N/A'}</Text>
            <Text style={styles.leadDetail}>{item.BusinessPartners?.City || 'N/A'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.noLeadsText}>No leads found.</Text>}
      />
    )}
        
    {!isLoading && !errorMessage && (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          onPress={prevPage}
          disabled={currentPage === 1}
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        >
          <Text style={styles.paginationButtonText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageNumber}>Page {currentPage} of {Math.ceil(filteredLeads.length / leadsPerPage)}</Text>
        <TouchableOpacity
          onPress={nextPage}
          disabled={currentPage === Math.ceil(filteredLeads.length / leadsPerPage)}
          style={[styles.paginationButton, currentPage === Math.ceil(filteredLeads.length / leadsPerPage) && styles.paginationButtonDisabled]}
        >
          <Text style={styles.paginationButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    )}
        
    <AnimatedButton
      style={styles.closeButton}
      textStyle={styles.closeButtonText}
      onPress={() => setIsLeadsModalVisible(false)}
    >
      Close
    </AnimatedButton>
  </SlideModal>
</Modal>

      {/* Success Animation Overlay */}
      <SuccessOverlay />

      {/* Order Points Reward Card */}
      <RewardCard
        visible={showRewardCard}
        points={earnedOrderPoints}
        onClose={() => setShowRewardCard(false)}
      />

      <Toast />
    </SafeAreaView>
  );
};


export default Checkout;

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  // Main Container Styles
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  loadingContainer: {
    flex: 1,
    marginTop: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },

  loadingText: {
    marginTop: 45,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  // Section Styles
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: -0.3,
  },

  // Enhanced Section Styles
  enhancedSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  enhancedSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  // Form Group Styles
  formGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: -0.1,
  },

  enhancedInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Row Container for side-by-side inputs
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  halfWidth: {
    width: '48%',
  },

  // Radio Button Styles
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },

  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  radioButtonSelected: {
    borderColor: '#3b82f6',
  },

  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },

  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },

  // Order Summary Styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  summaryLabel: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },

  summaryValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 100,
  },

  // Input Styles
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 50,
    transition: 'all 0.2s ease',
  },

  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    marginLeft: 4,
  },

  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Date Picker Styles
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },

  // Picker Styles
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    color: '#1e293b',
  },

  // Button Styles
  button: {
    backgroundColor: '#f7931e',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Submit Button Styles
  submitButton: {
    backgroundColor: '#059669',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },

  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Selected Lead Styles
  selectedLeadContainer: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },

  selectedLeadText: {
    fontSize: 14,
    color: '#0c4a6e',
    fontWeight: '500',
    marginBottom: 4,
  },

  // File Styles
  fileName: {
    fontSize: 14,
    color: '#059669',
    marginTop: 12,
    fontWeight: '500',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  modalHeaderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  addLeadButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  addLeadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  reloadButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  reloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#1e293b',
  },

  // Lead Item Styles
  leadItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },

  leadDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },

  noLeadsText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    fontStyle: 'italic',
    marginVertical: 32,
  },

  // Pagination Styles
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

  paginationButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  paginationButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },

  paginationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  pageNumber: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // Close Button Styles
  closeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },

  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error Container Styles
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },

  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Success Animation Styles (PhonePe Style)
  successFullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  successContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  successMainCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },

  successTickMark: {
    fontSize: 48,
    color: '#22c55e',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  successSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  successNote: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
    fontStyle: 'italic',
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  successDecorations: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  successDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Additional Modern Styles
  wosonBundleNotice: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  wosonBundleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 4,
  },
  wosonBundleDetail: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  discountRow: {
    backgroundColor: '#d4edda',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  discountLabel: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '700',
  },
  gradientBackground: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },

  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Focus States (for better accessibility)
  inputFocused: {
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  // Animation-ready styles
  fadeIn: {
    opacity: 1,
  },

  fadeOut: {
    opacity: 0,
  },

  slideIn: {
    transform: [{ translateY: 0 }],
  },

  slideOut: {
    transform: [{ translateY: 20 }],
  },

  // Responsive adjustments for smaller screens
  compactSection: {
    padding: 16,
    marginBottom: 12,
  },

  compactInput: {
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },

  compactButton: {
    paddingVertical: 12,
  },

  compactSubmitButton: {
    paddingVertical: 16,
    marginVertical: 20,
  },
});

// Animation configurations
export const animationConfig = {
  duration: 300,
  useNativeDriver: true,
  easing: 'ease-out',
};

// Color palette
export const colors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  inputBackground: '#f8fafc',
};

// Typography scale
export const typography = {
  h1: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400' },
  bodyMedium: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius scale
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

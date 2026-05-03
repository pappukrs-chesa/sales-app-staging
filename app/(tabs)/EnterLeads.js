import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import MultiSelect from 'react-native-multiple-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { usePoints } from '../../ContextAPI/PointsContext';
import PointsContainer from '../../components/points/PointsContainer';

const { width, height } = Dimensions.get('window');

// Optimized Input Component with stable reference
const StableTextInput = React.memo(({ 
  label, 
  value, 
  onChangeText, 
  error, 
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  ...props 
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          error && styles.inputError,
          multiline && styles.multilineInput
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        selectionColor="#f7931e"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete="off"
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

// Optimized Picker Component
const StablePicker = React.memo(({ label, selectedValue, onValueChange, items, error }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.pickerContainer, error && styles.inputError]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
      >
        <Picker.Item label="Select one" value="" color="#6B7280" />
        {items.map((item, index) => (
          <Picker.Item
            key={index}
            label={typeof item === 'string' ? item : item.label}
            value={typeof item === 'string' ? item : item.value}
            color="#1F2937"
          />
        ))}
      </Picker>
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
));

// Radio Button Component
const RadioButton = React.memo(({ label, selected, onPress }) => (
  <TouchableOpacity style={styles.radioContainer} onPress={onPress}>
    <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
      {selected && <View style={styles.radioButtonInner} />}
    </View>
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
));

const EnterLeads = () => {
  // Points functionality
  const { addPointsToTable } = usePoints();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Form state - using individual state variables for better performance
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [product1, setProduct1] = useState([]);
  const [product2, setProduct2] = useState([]);
  const [interestLevel, setInterestLevel] = useState('');
  const [source, setSource] = useState('');
  const [closingDate, setClosingDate] = useState(new Date());
  const [expectedValue, setExpectedValue] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [remarks, setRemarks] = useState('');
  const [enquiryOrLead, setEnquiryOrLead] = useState('');

  // Other state
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [cities, setCities] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempClosingDate, setTempClosingDate] = useState(null);
  const [selectedSalesEmpCode, setSelectedSalesEmpCode] = useState('');
  const [newDataOwnerId, setNewDataOwnerId] = useState('');

  // Static data
  const interestLevels = [
    { value: '3', label: 'Very Hot' },
    { value: '2', label: 'Hot' },
    { value: '1', label: 'Warm' },
    { value: '-1', label: 'Cold' },
  ];

  const sources = [
    { value: '1', label: 'Phone' },
    { value: '2', label: 'Direct' },
    { value: '3', label: 'Social Media' },
    { value: '4', label: 'Employee Lead' },
    { value: '5', label: 'Organic Lead' },
    { value: '6', label: 'House Of Alt' },
    { value: '7', label: 'Service Team Lead' },
    { value: '8', label: 'CRM Lead' },
    { value: '9', label: 'Expo' },
    { value: '10', label: 'May 24 Forecast' },
    { value: '12', label: 'Dealer Lead' },
  ];

  const categories = [
    'Indian Products',
    'Imported Products',
    'Radiology',
    'Accessories',
  ];

  const stateCityMap = {
    AN: ['Others'],
    AP: ['Others'],
    AR: ['Others'],
    AS: ['Others'],
    BR: ['Others'],
    CG: ['Others'],
    CH: ['Others'],
    DD: ['Others'],
    DL: ['Others'],
    DN: ['Others'],
    GA: ['Others'],
    GJ: ['Ahmedabad', 'Others'],
    HR: ['Others'],
    HP: ['Others'],
    JK: ['Others'],
    JH: ['Others'],
    KT: ['Bangalore', 'Others'],
    KL: ['Others'],
    LD: ['Others'],
    MP: ['Others'],
    MH: ['Mumbai', 'Thane', 'Aurangabad', 'Pune', 'Beed', 'Jalna', 'Osmanabad', 'Nanded', 'Latur', 'Parbhani', 'Hingoli', 'Khandesh', 'Nasik', 'Akola', 'Amravati', 'Gondia', 'Nagpur', 'Wardha', 'Others'],
    MN: ['Others'],
    ML: ['Others'],
    MZ: ['Others'],
    NL: ['Others'],
    NP: ['Others'],
    OD: ['Others'],
    PN: ['Others'],
    PY: ['Others'],
    RJ: ['Jaipur', 'Kota', 'Udaipur', 'Others'],
    SK: ['Others'],
    TN: ['Others'],
    TS: ['Others'],
    TR: ['Others'],
    UK: ['Others'],
    UP: ['Agra', 'Others'],
    WB: ['Others'],
  };

  const stateCodeMap = {
    'Andaman and Nicobar Islands': 'AN',
    'Andhra Pradesh': 'AP',
    'Arunachal Pradesh': 'AR',
    'Assam': 'AS',
    'Bihar': 'BR',
    'Chhattisgarh': 'CG',
    'Chandigarh': 'CH',
    'Dadra and Nagar Haveli': 'DN',
    'Daman and Diu': 'DD',
    'Delhi': 'DL',
    'Goa': 'GA',
    'Gujarat': 'GJ',
    'Haryana': 'HR',
    'Himachal Pradesh': 'HP',
    'Jammu and Kashmir': 'JK',
    'Jharkhand': 'JH',
    'Karnataka': 'KT',
    'Kerala': 'KL',
    'Ladakh': 'LD',
    'Lakshadweep': 'LD',
    'Madhya Pradesh': 'MP',
    'Maharashtra': 'MH',
    'Manipur': 'MN',
    'Meghalaya': 'ML',
    'Mizoram': 'MZ',
    'Nagaland': 'NL',
    'Nepal': 'NP',
    'Odisha': 'OD',
    'Punjab': 'PN',
    'Puducherry': 'PY',
    'Rajasthan': 'RJ',
    'Sikkim': 'SK',
    'Tamil Nadu': 'TN',
    'Telangana': 'TS',
    'Tripura': 'TR',
    'Uttarakhand': 'UK',
    'Uttar Pradesh': 'UP',
    'West Bengal': 'WB',
  };

  const stateCityPersonMap = {
    AN: { Others: "Sangeetha" },
    AP: { Others: "Avinash Sharma" },
    AR: { Others: "Sangeetha" },
    AS: { Others: "Sangeetha" },
    BR: { Others: "Vijay Sharma" },
    CG: { Others: "Kiran Nanjundiah" },
    CH: { Others: "Kiran" },
    DD: { Others: "Sangeetha" },
    DL: { Others: "Kiran" },
    DN: { Others: "Sangeetha" },
    GA: { Others: "atoofa habib" },
    GJ: { Ahmedabad: "Darshan Panchal", Others: "Darshan Panchal" },
    HR: { Others: "Kiran" },
    HP: { Others: "Kiran" },
    JK: { Others: "atoofa habib" },
    JH: { Others: "atoofa habib" },
    KT: { Bangalore: "Sangeetha", Others: "Ramya" },
    KL: { Others: "Sangeetha" },
    LD: { Others: "Sangeetha" },
    MP: { Others: "Kiran" },
    MH: {
      Pune: "Vivek Chahvan",
      Aurangabad: "Pankaj Jangam",
      Beed: "Pankaj Jangam",
      Jalna: "Pankaj Jangam",
      Osmanabad: "Pankaj Jangam",
      Nanded: "Kishan Yadav",
      Latur: "Kishan Yadav",
      Parbhani: "Kishan Yadav",
      Hingoli: "Kishan Yadav",
      Khandesh: "Mayur Rane",
      Nasik: "Mayur Rane",
      Mumbai: "Sudhir Pujar",
      Thane: "Sudhir Pujar",      
      Akola: "Santhosh Deshmukh",
      Amravati: "Santhosh Deshmukh",
      Gondia: "Santhosh Deshmukh",
      Nagpur: "Santhosh Deshmukh",
      Wardha: "Santhosh Deshmukh",
      Others: "atoofa habib",
    },
    MN: { Others: "Sangeetha" },
    ML: { Others: "Sangeetha" },
    MZ: { Others: "Sangeetha" },
    NL: { Others: "Sangeetha" },
    NP: { Others: "Sangeetha" },
    OD: { Others: "Barun Karmakar" },
    PN: { Others: "Paramjit Singh" },
    PY: { Others: "Sangeetha" },
    RJ: {
      Jaipur: "Aman Raees",
      Kota: "Sadul Singh",
      Udaipur: "Sadul Singh",
      Others: "Sadul Singh",
    },
    SK: { Others: "Sangeetha" },
    TN: { Others: "Varadharaj T U" },
    TS: { Others: "Rajesh Kumar" },
    TR: { Others: "Sangeetha" },
    UK: { Others: "Kiran" },
    UP: { Agra: "Rajeev Sharma", Others: "atoofa habib" },
    WB: { Others: "Barun Karmakar" },
  };

  // Error clearing function
  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Individual input handlers with error clearing
  const handleCustomerNameChange = (text) => {
    setCustomerName(text);
    clearError('customerName');
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    clearError('email');
  };

  const handlePhoneChange = (text) => {
    setPhoneNumber(text);
    clearError('phoneNumber');
  };

  const handlePincodeChange = (text) => {
    setPincode(text);
    clearError('pincode');
  };

  const handleAddressChange = (text) => {
    setAddress(text);
    clearError('address');
  };

  const handleExpectedValueChange = (text) => {
    setExpectedValue(text);
    clearError('expectedValue');
  };

  const handleRemarksChange = (text) => {
    setRemarks(text);
    clearError('remarks');
  };

  // Fetch employee data and set sales emp code
  const fetchAndSetSalesEmpCode = async () => {
    try {
      // Special case for product 108
      if (product1?.includes(108) || product2?.includes(108)) {
        setSelectedSalesEmpCode("69");
        setNewDataOwnerId("583");
        return;
      }

      const response = await fetch(
        "https://api.chesadentalcare.com/state_employee_info"
      );
      const employeeData = await response.json();
      let matchedEmployee = null;

      if (city.toLowerCase() === "others") {
        matchedEmployee = employeeData.find((emp) => {
          const states = emp.state.split(",").map((state) => state.trim());
          return (
            emp.city.toLowerCase() === "others" &&
            states.includes(stateCode)
          );
        });
      } else {
        matchedEmployee = employeeData.find((emp) => {
          const cities = emp.city
            .split(",")
            .map((city) => city.trim().toLowerCase());
          return cities.includes(city.toLowerCase());
        });
      }

      if (matchedEmployee) {
        setSelectedSalesEmpCode(matchedEmployee.salespersoncode);
        setNewDataOwnerId(matchedEmployee.crmid);
      } else {
        setSelectedSalesEmpCode(null);
        console.warn("No matching employee found for the given city or state.");
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      setSelectedSalesEmpCode(null);
    }
  };

  // Component mount animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    fetchProducts();
  }, []);

  // Fetch employee data when relevant fields change
  useEffect(() => {
    if (stateCode && city && (product1.length > 0 || product2.length > 0)) {
      fetchAndSetSalesEmpCode();
    }
  }, [stateCode, city, product1.length, product2.length]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch('https://api.chesadentalcare.com/crmpro');
      const data = await response.json();
      const options = data.map((product) => ({
        id: product.id,
        name: product.pname,
      }));
      setProductOptions(options);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (!state) {
      newErrors.state = 'State is required';
    }

    if (!city) {
      newErrors.city = 'City is required';
    }

    if (!pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!product1 || product1.length === 0) {
      newErrors.product1 = 'Product 1 is required';
    }

    if (!closingDate) {
      newErrors.closingDate = 'Closing date is required';
    }

    if (!source) {
      newErrors.source = 'Source is required';
    }

    if (!expectedValue.trim()) {
      newErrors.expectedValue = 'Expected value is required';
    }

    if (!remarks.trim()) {
      newErrors.remarks = 'Remarks are required';
    }

    if (!enquiryOrLead) {
      newErrors.enquiryOrLead = 'Please select enquiry or lead';
    }

    if (enquiryOrLead === 'closingLead' && !interestLevel) {
      newErrors.interestLevel = 'Interest level is required for leads';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle state change
  const handleStateChange = (selectedState) => {
    const newStateCode = stateCodeMap[selectedState] || selectedState;
    setState(selectedState);
    setStateCode(newStateCode);
    setCity('');
    setPersonInCharge('');
    
    const newCities = stateCityMap[newStateCode] || [];
    setCities(newCities);
    clearError('state');
  };

  // Handle city change
  const handleCityChange = (selectedCity) => {
    setCity(selectedCity);
    
    const currentStateCode = stateCodeMap[state];
    const person = stateCityPersonMap[currentStateCode]?.[selectedCity] || '';
    setPersonInCharge(person);
    clearError('city');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const transformedData = {
        name: customerName,
        email: email,
        phone: phoneNumber,
        address: address,
        pincode: pincode,
        city: city,
        employeeId: newDataOwnerId,
        state: state,
        stateCode: stateCode,
        category: category,
        interest: interestLevel,
        source: source,
        expdate: closingDate.toISOString().split('T')[0],
        price: expectedValue,
        sname: personInCharge,
        product1: product1.join(', '),
        product2: product2.join(', '),
        salesEmp: selectedSalesEmpCode,
        remarks: remarks,
      };

      const response = await fetch('https://api.chesadentalcare.com/new_lead_entry_test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      const result = await response.json();

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Lead submitted successfully!');
        
        // Add points for lead entry
        const points = 50;
        const activityType = 3; // Lead Entry
        await addPointsToTable(points, activityType);
        
        resetForm();
        
        // Check if we should return to Checkout page
        const returnToCheckout = await AsyncStorage.getItem('returnToCheckout');
        if (returnToCheckout === 'true') {
          // Clear the return flag
          await AsyncStorage.removeItem('returnToCheckout');
          // Navigate back to Checkout page
          router.push('/Checkout');
        }
      } else {
        throw new Error(result.message || 'Something went wrong');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCustomerName('');
    setEmail('');
    setPhoneNumber('');
    setCategory('');
    setState('');
    setStateCode('');
    setCity('');
    setPincode('');
    setAddress('');
    setProduct1([]);
    setProduct2([]);
    setInterestLevel('');
    setSource('');
    setClosingDate(new Date());
    setExpectedValue('');
    setPersonInCharge('');
    setRemarks('');
    setEnquiryOrLead('');
    setErrors({});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      {/* Header */}
      <LinearGradient
        colors={['#f7931e', '#f7931e']}
        style={styles.header}
      >
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Enter Leads</Text>
            <Text style={styles.headerSubtitle}>Capture new business opportunities</Text>
          </View>
          <View style={styles.headerRight}>
            <PointsContainer
              style={styles.pointsHeaderDisplay}
              onPress={() => router.push('/points')}
              showLabel={false}
            />
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <StableTextInput
            label="Customer Name"
            value={customerName}
            onChangeText={handleCustomerNameChange}
            error={errors.customerName}
            placeholder="Enter customer name"
          />

          <StableTextInput
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            error={errors.email}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <StableTextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            error={errors.phoneNumber}
            placeholder="Enter 10-digit phone number"
            keyboardType="numeric"
            maxLength={10}
          />

          <StablePicker
            label="Category"
            selectedValue={category}
            onValueChange={(value) => {
              setCategory(value);
              clearError('category');
            }}
            items={categories}
            error={errors.category}
          />

          <StablePicker
            label="State"
            selectedValue={state}
            onValueChange={handleStateChange}
            items={Object.keys(stateCodeMap)}
            error={errors.state}
          />

          <StablePicker
            label="City"
            selectedValue={city}
            onValueChange={handleCityChange}
            items={cities}
            error={errors.city}
          />

          <StableTextInput
            label="Pincode"
            value={pincode}
            onChangeText={handlePincodeChange}
            error={errors.pincode}
            placeholder="Enter 6-digit pincode"
            keyboardType="numeric"
            maxLength={6}
          />

          <StableTextInput
            label="Address"
            value={address}
            onChangeText={handleAddressChange}
            error={errors.address}
            placeholder="Enter complete address"
            multiline
            numberOfLines={3}
            maxLength={100}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product 1 (Multi-select) *</Text>
            <View style={[styles.multiSelectWrapper, errors.product1 && styles.inputError]}>
              <MultiSelect
                items={productOptions}
                uniqueKey="id"
                onSelectedItemsChange={(items) => {
                  setProduct1(items);
                  clearError('product1');
                }}
                selectedItems={product1}
                selectText="Select Products"
                searchInputPlaceholderText="Search Products..."
                tagRemoveIconColor="#f7931e"
                tagBorderColor="#f7931e"
                tagTextColor="#f7931e"
                selectedItemTextColor="#f7931e"
                selectedItemIconColor="#f7931e"
                itemTextColor="#1F2937"
                displayKey="name"
                searchInputStyle={{ 
                  color: '#1F2937',
                  fontSize: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12
                }}
                submitButtonColor="#f7931e"
                submitButtonText="Done"
                styleDropdownMenuSubsection={styles.multiSelectDropdown}
                styleInputGroup={styles.multiSelectInput}
                styleMainWrapper={styles.multiSelectMain}
                styleSelectorContainer={styles.multiSelectSelector}
              />
            </View>
            {errors.product1 && <Text style={styles.errorText}>{errors.product1}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product 2 (Multi-select)</Text>
            <View style={styles.multiSelectWrapper}>
              <MultiSelect
                items={productOptions}
                uniqueKey="id"
                onSelectedItemsChange={(items) => {
                  setProduct2(items);
                  clearError('product2');
                }}
                selectedItems={product2}
                selectText="Select Products"
                searchInputPlaceholderText="Search Products..."
                tagRemoveIconColor="#f7931e"
                tagBorderColor="#f7931e"
                tagTextColor="#f7931e"
                selectedItemTextColor="#f7931e"
                selectedItemIconColor="#f7931e"
                itemTextColor="#1F2937"
                displayKey="name"
                searchInputStyle={{ 
                  color: '#1F2937',
                  fontSize: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12
                }}
                submitButtonColor="#f7931e"
                submitButtonText="Done"
                styleDropdownMenuSubsection={styles.multiSelectDropdown}
                styleInputGroup={styles.multiSelectInput}
                styleMainWrapper={styles.multiSelectMain}
                styleSelectorContainer={styles.multiSelectSelector}
              />
            </View>
          </View>

          <View style={styles.radioSection}>
            <Text style={styles.label}>Lead Type</Text>
            <View style={styles.radioGroup}>
              <RadioButton
                label="Enquiry"
                selected={enquiryOrLead === 'Enquiry'}
                onPress={() => {
                  setEnquiryOrLead('Enquiry');
                  setInterestLevel('5');
                  clearError('enquiryOrLead');
                }}
              />
              <RadioButton
                label="Lead"
                selected={enquiryOrLead === 'closingLead'}
                onPress={() => {
                  setEnquiryOrLead('closingLead');
                  setInterestLevel('');
                  clearError('enquiryOrLead');
                }}
              />
            </View>
            {errors.enquiryOrLead && <Text style={styles.errorText}>{errors.enquiryOrLead}</Text>}
          </View>

          {enquiryOrLead === 'closingLead' && (
            <StablePicker
              label="Interest Level"
              selectedValue={interestLevel}
              onValueChange={(value) => {
                setInterestLevel(value);
                clearError('interestLevel');
              }}
              items={interestLevels}
              error={errors.interestLevel}
            />
          )}

          <StablePicker
            label="Source"
            selectedValue={source}
            onValueChange={(value) => {
              setSource(value);
              clearError('source');
            }}
            items={sources}
            error={errors.source}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Closing Date *</Text>
            <TouchableOpacity
              style={[styles.dateInput, errors.closingDate && styles.inputError]}
              onPress={() => {
                setTempClosingDate(closingDate);
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>
                {moment(closingDate).format('DD-MM-YYYY')}
              </Text>
              <Ionicons name="calendar-outline" size={24} color="#f7931e" />
            </TouchableOpacity>
            {errors.closingDate && <Text style={styles.errorText}>{errors.closingDate}</Text>}
          </View>

          <StableTextInput
            label="Expected Value"
            value={expectedValue}
            onChangeText={handleExpectedValueChange}
            error={errors.expectedValue}
            placeholder="Enter expected value"
            keyboardType="numeric"
          />

          <StableTextInput
            label="Remarks"
            value={remarks}
            onChangeText={handleRemarksChange}
            error={errors.remarks}
            placeholder="Enter your remarks here"
            multiline
            numberOfLines={4}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#CCC', '#999'] : ['#6C63FF', '#9C88FF']}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Lead</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Calendar Modal for Closing Date */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDatePicker(false);
          setTempClosingDate(null);
        }}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Select Closing Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(false);
                  setTempClosingDate(null);
                }}
                style={styles.calendarCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={tempClosingDate ? moment(tempClosingDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')}
              minDate={moment().format('YYYY-MM-DD')}
              onDayPress={(day) => {
                console.log('Selected closing date:', day.dateString);
                setTempClosingDate(new Date(day.dateString));
              }}
              markedDates={{
                [tempClosingDate ? moment(tempClosingDate).format('YYYY-MM-DD') : '']: {
                  selected: true,
                  selectedColor: '#f7931e'
                }
              }}
              theme={{
                selectedDayBackgroundColor: '#f7931e',
                todayTextColor: '#f7931e',
                arrowColor: '#f7931e',
              }}
            />

            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarCancelButton]}
                onPress={() => {
                  setShowDatePicker(false);
                  setTempClosingDate(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarConfirmButton]}
                onPress={() => {
                  if (tempClosingDate) {
                    setClosingDate(tempClosingDate);
                    clearError('closingDate');
                  }
                  setShowDatePicker(false);
                  setTempClosingDate(null);
                }}
              >
                <Text style={styles.calendarConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 15,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#f7931e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  pointsHeaderDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inputContainer: {
    marginBottom: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    fontWeight: '400',
    minHeight: 50,
    includeFontPadding: false,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1F2937',
  },
  radioSection: {
    marginBottom: 22,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#f7931e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioButtonSelected: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  radioLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  submitButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#f7931e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  submitGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  multiSelectWrapper: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  multiSelectMain: {
    backgroundColor: '#FFFFFF',
  },
  multiSelectDropdown: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    backgroundColor: '#FFFFFF',
  },
  multiSelectInput: {
    backgroundColor: '#FFFFFF',
  },
  multiSelectSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  calendarCloseButton: {
    padding: 4,
  },
  calendarButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  calendarButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  calendarCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  calendarCancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarConfirmButton: {
    backgroundColor: '#f7931e',
  },
  calendarConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
};

export default EnterLeads;
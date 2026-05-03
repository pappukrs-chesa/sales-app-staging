import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Easing,
} from 'react-native';
import CategorySelector from './CategorySection';
import CompanySelector from './CompanySelection';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useCart } from '../../../ContextAPI/CartContext';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/ContextAPI/AuthContext';
import axios from 'axios';
import { getGstRate, toPostTax } from '../../../utils/taxHelper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Constants
const CACHE_KEYS = {
  COMPANIES: 'cached_companies',
  CATEGORIES: 'cached_categories',
  PRODUCTS: 'cached_products',
  SAP_DATA: 'cached_sap_data',
  CHAIR_COLORS: 'cached_chair_colors',
  CACHE_TIMESTAMP: 'cache_timestamp',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ENTRIES_PER_PAGE = 12;

const PRICE_LIST_MAP = {
  1: "MRP",
  2: "MSP", 
  5: "DP",
  6: "SDP",
  9: "CF",
};

const BASE_URLS = {
  PRODUCT: 'https://chesadentalcare.com/possystem/admin/admin/uploads/product/',
  COMPANY: 'https://chesadentalcare.com/possystem/admin/admin/uploads/dealers/',
  CATEGORY: 'https://chesadentalcare.com/possystem/admin/admin/uploads/category/',
};

const API_ENDPOINTS = {
  COMPANIES: 'https://api.chesadentalcare.com/company',
  CATEGORIES: 'https://api.chesadentalcare.com/category',
  PRODUCTS: 'https://api.chesadentalcare.com/products_all',
  SAP_DATA: 'https://api.chesadentalcare.com/products_sap',
  CHAIR_COLORS: 'https://api.chesadentalcare.com/chairs_color',
};

// --- Data normalization ---
const COMPANY_NORMALIZATION = {
  'chesa': 'CHESA',
  'Chesa': 'CHESA',
  'Chesa Dental Care': 'CHESA',
  'woodpecker': 'WOODPECKER',
};

const CATEGORY_NORMALIZATION = {
  'chairs': 'Dental Chairs',
};

const normalizeCompany = (name) => {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  return COMPANY_NORMALIZATION[trimmed] || trimmed;
};

const normalizeCategory = (name) => {
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  return CATEGORY_NORMALIZATION[trimmed] || trimmed;
};

const normalizeProduct = (product) => ({
  ...product,
  company: normalizeCompany(product.company) || product.company,
  cat_name: normalizeCategory(product.cat_name) || product.cat_name,
  name: product.name?.trim() || product.name,
  code: product.code?.trim() || product.code,
});

const deduplicateProducts = (products) => {
  const seen = new Map();
  products.forEach(product => {
    const key = product.code + '|' + product.cat_name;
    if (!seen.has(key)) {
      seen.set(key, product);
    } else if (!seen.get(key).image && product.image) {
      seen.set(key, product);
    }
  });
  return Array.from(seen.values());
};

const cleanList = (items, nameField) => {
  const seen = new Set();
  return items
    .map(item => {
      const raw = item[nameField];
      const normalized = nameField === 'company' ? normalizeCompany(raw) : normalizeCategory(raw);
      return normalized ? { ...item, [nameField]: normalized } : null;
    })
    .filter(item => {
      if (!item) return false;
      if (seen.has(item[nameField])) return false;
      seen.add(item[nameField]);
      return true;
    });
};

const PurchasePage = () => {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatingButtonScale = useRef(new Animated.Value(1)).current;
  const cartBounce = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef({}).current;
  
  // State management
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sapData, setSapData] = useState(null);
  const [chairColors, setChairColors] = useState({});
  const [quantities, setQuantities] = useState({});
  const [colors, setColors] = useState({});
  const [suctionTypes, setSuctionTypes] = useState({});
  const [remarks, setRemarks] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceList, setPriceList] = useState('1');
  const [priceListName, setPriceListName] = useState('MRP');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [cartCount, setCartCount] = useState(0);
  const [packageCompositions, setPackageCompositions] = useState({});
  const [dealers, setDealers] = useState([]);
const [selectedDealer, setSelectedDealer] = useState(null);
const [dealerLoading, setDealerLoading] = useState(false);
const [showDealerSelection, setShowDealerSelection] = useState(true);
const { user } = useAuth();

useEffect(() => {
  const checkExistingDealer = async (fetchedDealers) => {
    try {
      const storedDealer = await AsyncStorage.getItem('selectedDealer');
      if (storedDealer && storedDealer !== 'null') {
        if (storedDealer === 'Direct Order') {
          setSelectedDealer('Direct Order');
        } else {
          try {
            const parsed = JSON.parse(storedDealer);
            // Ensure it's an object, not just a number parsed from "6"
            if (parsed && typeof parsed === 'object' && parsed.bname) {
              setSelectedDealer(parsed);
            } else {
              throw new Error('not a dealer object');
            }
          } catch {
            // Legacy format: plain ID string — look up from fetched dealers list
            const id = parseInt(storedDealer);
            const dealerObj = fetchedDealers.find(d => d.id === id);
            if (dealerObj) {
              setSelectedDealer(dealerObj);
              // Migrate: re-store as JSON so next load is correct
              await AsyncStorage.setItem('selectedDealer', JSON.stringify(dealerObj));
            } else {
              setSelectedDealer(null);
              setShowDealerSelection(true);
              return;
            }
          }
        }
        setShowDealerSelection(false);
      }
    } catch (error) {
      console.error('Error checking existing dealer:', error);
    }
  };

  if (user && user.sales_person) {
    fetchDealersBySalesPersonName(user.sales_person).then((fetchedDealers) => {
      checkExistingDealer(fetchedDealers);
    });
  }
}, [user]);

// 3. Add these functions after your existing utility functions:
const fetchDealersBySalesPersonName = async (salesPersonName) => {
  try {
    setDealerLoading(true);
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
      return filteredDealers;
    } else {
      setDealers([]);
      return [];
    }
  } catch (error) {
    console.error('Error fetching dealers:', error);
    Alert.alert('Error', 'Failed to fetch dealers. Please try again.');
    return [];
  } finally {
    setDealerLoading(false);
  }
};

const handleDealerChange = async (selectedDealerId) => {
  let selectedDealerData = null;

  if (selectedDealerId === 'Direct Order') {
    selectedDealerData = 'Direct Order';
    setSelectedDealer('Direct Order');

    await AsyncStorage.multiSet([
      ['MatchedSDState', 'NA'],
      ['selectedDealer', 'Direct Order'],
      ['d_code', 'Direct Order'],
      ['PriceList', '1'],
    ]);

    setPriceList('1');
    setPriceListName('MRP');
    setShowDealerSelection(false);
    return;
  }

  selectedDealerData = dealers.find(dealer => dealer.id === parseInt(selectedDealerId));
  if (!selectedDealerData) return;

  setSelectedDealer(selectedDealerData);

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
          ['selectedDealer', JSON.stringify(selectedDealerData)],
          ['d_code', selectedDealerData.d_code],
        ]);

        // Handle GJ state - override PriceList to 5
        if (matchedDealerState === "GJ") {
          priceListNum = '5';
          await AsyncStorage.setItem('PriceList', '5');
          setPriceList('5');
          setPriceListName('CF');
          const cardCode = "C100021A";
          try {
            const response = await fetch(`https://api.chesadentalcare.com/dealer?id=${cardCode}`);
            if (!response.ok) throw new Error('Failed to fetch GJ dealer data');
            const gjDealerData = await response.json();
            await AsyncStorage.setItem('matchedMHDealerData', JSON.stringify(gjDealerData));
          } catch (error) {
            console.error("Error fetching GJ dealer data:", error);
          }
        } 
        // For other states, use the dealer's PriceListNum
        else {
          await AsyncStorage.setItem('PriceList', priceListNum);
          setPriceList(priceListNum);
          setPriceListName(PRICE_LIST_MAP[parseInt(priceListNum)] || 'MRP');
        }
      }
    }
    setShowDealerSelection(false);
  } catch (error) {
    console.error("Error in handleDealerChange:", error);
    Alert.alert("Error", "Something went wrong while selecting dealer.");
  }
};

// 4. Update your handleAddToCart function to check for dealer selection:

// 5. Add this new component function before your render functions:
const renderDealerSelection = () => {
  if (!showDealerSelection && selectedDealer) {
    return (
      <View style={styles.selectedDealerBanner}>
        <View style={styles.selectedDealerInfo}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={styles.selectedDealerText}>
            {selectedDealer === 'Direct Order' 
              ? 'Direct Order Selected' 
              : `${selectedDealer.bname || selectedDealer}`}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.changeDealerButton}
          onPress={() => setShowDealerSelection(true)}
        >
          <Text style={styles.changeDealerText}>Change</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!showDealerSelection) return null;

  return (
    <View style={styles.dealerSelectionContainer}>
      <View style={styles.dealerSelectionHeader}>
        <Ionicons name="business" size={20} color="#f7931e" />
        <Text style={styles.dealerSelectionTitle}>Select Dealer to Continue</Text>
      </View>
      
      {dealerLoading ? (
        <View style={styles.dealerLoadingContainer}>
          <ActivityIndicator size="small" color="#f7931e" />
          <Text style={styles.dealerLoadingText}>Loading dealers...</Text>
        </View>
      ) : (
        <View style={styles.dealerPickerContainer}>
          <Picker
            selectedValue={selectedDealer === 'Direct Order' ? 'Direct Order' : selectedDealer?.id || ''}
            onValueChange={handleDealerChange}
            style={styles.dealerPicker}
            mode="dropdown"
          >
            <Picker.Item label="Choose your dealer..." value="" />
            <Picker.Item label="🏢 Direct Order" value="Direct Order" />
            {dealers.map((dealer) => (
              <Picker.Item
                key={dealer.id}
                label={`🏪 ${dealer.bname}`}
                value={dealer.id}
              />
            ))}
          </Picker>
        </View>
      )}
    </View>
  );
};


  // Cache utilities
  const isCacheValid = useCallback(async () => {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }, []);

  const getCachedData = useCallback(async (key) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cached data for ${key}:`, error);
      return null;
    }
  }, []);

  const setCachedData = useCallback(async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting cached data for ${key}:`, error);
    }
  }, []);

  // Animation setup
  useEffect(() => {
    const entranceAnimation = Animated.stagger(200, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]);

    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingButtonScale, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingButtonScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start();
    floatingAnimation.start();

    return () => {
      floatingAnimation.stop();
    };
  }, []);

  // Data fetching
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.COMPANIES);
      const data = await response.json();
      const cleaned = cleanList(data, 'company');
      setCompanies(cleaned);
      return cleaned;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const data = await response.json();
      const cleaned = cleanList(data, 'cat_name');
      setCategories(cleaned);
      return cleaned;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS);
      const data = await response.json();
      
      const normalized = data.map(product => normalizeProduct({ ...product, quantity: 1 }));
      const deduplicated = deduplicateProducts(normalized);

      setAllProducts(deduplicated);
      initializeProductStates(deduplicated);
      fetchPackageCompositions(deduplicated);

      const itemCodes = [...new Set(deduplicated.map(product => product.code))];
      await fetchSapData(itemCodes);
      
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }, []);

  const fetchSapData = useCallback(async (itemCodes) => {
    try {
      const response = await fetch(API_ENDPOINTS.SAP_DATA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemCodes }),
      });
      
      const data = await response.json();
      setSapData(data);
      await setCachedData(CACHE_KEYS.SAP_DATA, data);
    } catch (error) {
      console.error('Error fetching SAP data:', error);
    }
  }, [setCachedData]);

  const fetchChairColors = useCallback(async (name) => {
    try {
      const response = await fetch(
        `${API_ENDPOINTS.CHAIR_COLORS}?name=${encodeURIComponent(name)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setChairColors(prev => ({
          ...prev,
          [name]: data.length > 0 ? data : [],
        }));
      }
    } catch (error) {
      console.error('Error fetching chair colors:', error);
    }
  }, []);

  const initializeProductStates = useCallback((products) => {
    const initialQuantities = {};
    const initialColors = {};
    const initialSuctionTypes = {};
    
    products.forEach(product => {
      initialQuantities[product.id] = 1;
      initialColors[product.id] = '';
      initialSuctionTypes[product.id] = '';
      
      if (product.cat_name === 'Dental Chairs' || product.cat_name === 'Combo Package') {
        fetchChairColors(product.name);
      }
    });
    
    setQuantities(initialQuantities);
    setColors(initialColors);
    setSuctionTypes(initialSuctionTypes);
  }, [fetchChairColors]);

  const fetchPackageCompositions = useCallback(async (products) => {
    const comboPackages = products.filter(p => p.cat_name === 'Combo Package');
    if (comboPackages.length === 0) return;

    try {
      const results = await Promise.all(
        comboPackages.map(async (pkg) => {
          const url = `https://api.chesadentalcare.com/package?package_name=${encodeURIComponent(pkg.name)}`;
          const response = await fetch(url);
          if (!response.ok) return null;
          const data = await response.json();
          const packageItem = data.find(item => item.package_name === pkg.name);
          if (!packageItem) return null;

          const childNames = [
            packageItem.pck1, packageItem.pck2, packageItem.pck3,
            packageItem.pck4, packageItem.pck5, packageItem.pck6,
          ].filter(name => name !== '');

          const childCodes = childNames
            .map(name => products.find(p => p.name === name))
            .filter(Boolean)
            .map(p => p.code);

          return { packageName: pkg.name, childCodes };
        })
      );

      const compositionMap = {};
      results.filter(Boolean).forEach(r => {
        compositionMap[r.packageName] = r.childCodes;
      });
      setPackageCompositions(compositionMap);
    } catch (error) {
      console.error('Error fetching package compositions:', error);
    }
  }, []);

  const initializeData = useCallback(async () => {
    setLoading(true);
    try {
      const isValid = await isCacheValid();
      
      if (isValid) {
        await loadFromCache();
      } else {
        await fetchFreshData();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      await fetchFreshData();
    } finally {
      setLoading(false);
    }
  }, [isCacheValid]);

  const loadFromCache = useCallback(async () => {
    try {
      const [cachedCompanies, cachedCategories, cachedProducts, cachedSapData] = await Promise.all([
        getCachedData(CACHE_KEYS.COMPANIES),
        getCachedData(CACHE_KEYS.CATEGORIES),
        getCachedData(CACHE_KEYS.PRODUCTS),
        getCachedData(CACHE_KEYS.SAP_DATA),
      ]);

      if (cachedCompanies) setCompanies(cleanList(cachedCompanies, 'company'));
      if (cachedCategories) setCategories(cleanList(cachedCategories, 'cat_name'));
      if (cachedProducts) {
        const normalized = cachedProducts.map(product => normalizeProduct({ ...product, quantity: 1 }));
        const deduplicated = deduplicateProducts(normalized);
        setAllProducts(deduplicated);
        initializeProductStates(deduplicated);
        fetchPackageCompositions(deduplicated);
      }
      if (cachedSapData) setSapData(cachedSapData);
    } catch (error) {
      console.error('Error loading from cache:', error);
      throw error;
    }
  }, [getCachedData, initializeProductStates]);

  const fetchFreshData = useCallback(async () => {
    try {
      const [companiesData, categoriesData, productsData] = await Promise.all([
        fetchCompanies(),
        fetchCategories(),
        fetchProducts(),
      ]);

      await Promise.all([
        setCachedData(CACHE_KEYS.COMPANIES, companiesData),
        setCachedData(CACHE_KEYS.CATEGORIES, categoriesData),
        setCachedData(CACHE_KEYS.PRODUCTS, productsData),
        AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString()),
      ]);
    } catch (error) {
      console.error('Error fetching fresh data:', error);
      throw error;
    }
  }, [fetchCompanies, fetchCategories, fetchProducts, setCachedData]);

  // Initialize data on mount
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Load price list
  useEffect(() => {
    const loadPriceList = async () => {
      try {
        const storedPriceList = await AsyncStorage.getItem('PriceList');
        if (storedPriceList) {
          setPriceList(storedPriceList);
          setPriceListName(PRICE_LIST_MAP[parseInt(storedPriceList)] || 'MRP');
        }
      } catch (error) {
        console.error('Error loading price list:', error);
      }
    };
    loadPriceList();
  }, []);

  // Filter products with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      filterProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [name, selectedCompany, selectedCategory, allProducts, searchQuery, sortBy]);

  const filterProducts = useCallback(() => {
    let filtered = [...allProducts];
    
    if (name) {
      const decodedName = decodeURIComponent(name);
      const normalizedName = normalizeCompany(decodedName) || normalizeCategory(decodedName) || decodedName;
      filtered = filtered.filter(
        product => product.company === normalizedName || product.cat_name === normalizedName
      );
    }
    
    if (selectedCompany) {
      filtered = filtered.filter(product => product.company === selectedCompany);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(product => product.cat_name === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query) ||
        product.company.toLowerCase().includes(query)
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const priceA = getPriceForProduct(a) || 0;
          const priceB = getPriceForProduct(b) || 0;
          return priceA - priceB;
        case 'company':
          return a.company.localeCompare(b.company);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [name, selectedCompany, selectedCategory, allProducts, searchQuery, sortBy]);

  // Price calculations
  const filteredPrices = useMemo(() => {
    if (!Array.isArray(sapData)) return [];
    
    const priceListNumber = parseInt(priceList) || 1;
    
    return sapData
      .map(product => {
        if (!Array.isArray(product.ItemPrices)) return null;
        
        const matchingPrice = product.ItemPrices.find(
          price => price.PriceList === priceListNumber
        );
        
        if (matchingPrice) {
          return {
            itemCode: product.ItemCode,
            price: matchingPrice.Price,
          };
        }
        return null;
      })
      .filter(product => product !== null);
  }, [sapData, priceList]);

  const getPriceForProduct = useCallback((product) => {
    const priceInfo = filteredPrices.find(p => p.itemCode === product.code);
    if (!priceInfo) return null;
    return priceInfo.price;
  }, [filteredPrices]);

  // Utility functions
  const formatCurrency = useCallback((amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  }, []);

  const generateUniqueRandomNumber = useCallback(() => {
    return Math.floor(Math.random() * 999999) + 1;
  }, []);

  // Animation helpers
  const animateAddToCart = useCallback((productId) => {
    if (!cardAnimations[productId]) {
      cardAnimations[productId] = new Animated.Value(0);
    }
    
    const animation = cardAnimations[productId];
    
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(cartBounce, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(cartBounce, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.back(1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardAnimations, cartBounce]);

  // Event handlers
  const handleAddToCart = useCallback(async (product) => {
  if (!selectedDealer) {
    Alert.alert(
      '🏪 Select Dealer First',
      'Please select a dealer before adding items to your cart.',
      [
        {
          text: 'Select Dealer',
          onPress: () => setShowDealerSelection(true),
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
    return;
  }

  // console.log("products", product);

  try {
    const quantity = quantities[product.id] || 1;
    const color = colors[product.id] || '';
    const selectedSuctionType = suctionTypes[product.id] || '';
    const remark = remarks[product.id] || '';

    // Validation for color selection
    const requiresColor = product.cat_name === 'Indian Chairs' || 
                         (chairColors[product.name] && chairColors[product.name].length > 0);
    
    if (requiresColor && !color) {
      Alert.alert(
        '⚠️ Color Selection Required',
        'Please select a color for this product before adding to cart.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Validation for suction type selection
    let requiresSuctionType = false;
    
    if (product.cat_name === 'Dental Chairs' && product.code === 'DCH 119') {
      requiresSuctionType = true;
    } else if (product.cat_name === 'Dental Chairs') {
      requiresSuctionType = true;
    } else if (product.cat_name === 'Indian Chairs' && product.code === 'DCH 117') {
      requiresSuctionType = true;
    } else if (product.cat_name === 'Indian Chairs') {
      requiresSuctionType = true;
    }
    
    if (requiresSuctionType && !selectedSuctionType) {
      Alert.alert(
        '⚠️ Suction Type Selection Required',
        'Please select a suction type for this product before adding to cart.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (product.cat_name === "Combo Package") {
      // Handle combo package logic
      const packageName = encodeURIComponent(product.name);
      const url = `https://api.chesadentalcare.com/package?package_name=${packageName}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const packageItems = await response.json();

      const packageItem = packageItems.find(
        (item) => item.package_name === product.name
      );
      
      if (packageItem) {
        const itemsToAdd = [
          packageItem.pck1,
          packageItem.pck2,
          packageItem.pck3,
          packageItem.pck4,
          packageItem.pck5,
          packageItem.pck6,
        ].filter((item) => item !== "");

        const productsToAdd = itemsToAdd
          .map((itemName) =>
            allProducts.find((product) => product.name === itemName)
          )
          .filter(Boolean);

        for (const item of productsToAdd) {
          if (item) {
            const matchingProduct = sapData.find(
              (sap) => sap.ItemCode === item.code
            );
            if (matchingProduct) {
              const priceListNumber = Number(
                await AsyncStorage.getItem("PriceList")
              );
              const sapPriceData = matchingProduct.ItemPrices.find(
                (price) => price.PriceList === priceListNumber
              );
              const sapPriceRaw = sapPriceData
                ? sapPriceData.Price
                : 0;

              const uniqueNumber = generateUniqueRandomNumber();
              const productImageURL = `${BASE_URLS.PRODUCT}${item.image?.trim()}`;

              const updatedItem =
                item.cat_name === "Dental Chairs" || item.cat_name === "Indian Chairs"
                  ? { ...item, color: color, uniqueNumber, image: productImageURL }
                  : { ...item, uniqueNumber, image: productImageURL };

              await addToCart({
                ...updatedItem,
                remarks: remark,
                quantity: quantity,
                sapPrice: sapPriceRaw,
                gstRate: getGstRate(item.taxcode),
                taxcode: item.taxcode,
                package: 'package'
              });
            } else {
              console.error(
                `Matching SAP product not found for item: ${item.name}`
              );
            }
          } else {
            console.error(`Product "${itemName}" not found in allProducts.`);
          }
        }
      } else {
        console.error("Package not found in the response");
      }
    } else if (
      product.subcat_name === "indian chairs" ||
      product.subcat_name === "indian chairs with pneumatic"
    ) {
      if (selectedSuctionType === "Pneumatic Suction") {
        const uniqueNumber = generateUniqueRandomNumber();
        const productImageURL = `${BASE_URLS.PRODUCT}${product.image?.trim()}`;
        
        await addToCart({
          ...product,
          suctionType: "Pneumatic Suction",
          remarks: remark,
          quantity: quantity,
          color: color,
          uniqueNumber,
          image: productImageURL,
        });
        
        // Clear product states after successful addition
        setQuantities(prev => ({ ...prev, [product.id]: 1 }));
        setColors(prev => ({ ...prev, [product.id]: '' }));
        setSuctionTypes(prev => ({ ...prev, [product.id]: '' }));
        setRemarks(prev => ({ ...prev, [product.id]: '' }));
        
        animateAddToCart(product.id);
        setCartCount(prev => prev + quantity);
        Alert.alert(
          '✅ Added to Cart',
          `${product.name} has been added to your cart.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      } 
      
      if (selectedSuctionType === "Provision Suction") {
        const uniqueNumber = generateUniqueRandomNumber();
        const productImageURL = `${BASE_URLS.PRODUCT}${product.image?.trim()}`;
        
        await addToCart({
          ...product,
          suctionType: "Provision Suction",
          remarks: remark,
          quantity: quantity,
          color: color,
          uniqueNumber,
          image: productImageURL,
        });
        
        animateAddToCart(product.id);
        setCartCount(prev => prev + quantity);
        Alert.alert(
          '✅ Added to Cart',
          `${product.name} has been added to your cart.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      if (!selectedSuctionType) {
        console.error(
          "Selected suction type is missing from product:",
          product
        );
        return;
      }

      const suctionProduct = allProducts.find(
        (p) => p.name === selectedSuctionType
      );
      
      // console.log(
      //   "Selected Suction Type:",
      //   selectedSuctionType,
      //   "Suction Product:",
      //   suctionProduct
      // );

      if (suctionProduct) {
        let matchingProduct;

        if (selectedSuctionType === "Suction 0.25 HP INBUILT" || selectedSuctionType === "Durr VS-250") {
          if (product.name === "Onyx Premium") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 194");
          } else if (product.name === "Onyx Regular") {
            matchingProduct = allProducts.find(
              (p) =>
                p.name.trim().replace(/\n/g, "") ===
                "ONYX REGULAR (NEW) DENTAL CHAIR WITH UNDERHANGING DELIVERY SYSTEM , LED LIGHT WITH ASSISTANT TRAY AND MOTORISED SUCTION"
            );
          } else if (product.name === "New Jwala Chair") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 179");
          } else if (product.name === "JAL Chair") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 193");
          } else if (product.name === "Ninja N4") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 102");
          } else if (product.name === "O2 chair trolly tray" && selectedSuctionType === "Suction 0.25 HP INBUILT") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 116");
          } else if (product.name === "O2 chair trolly tray" && selectedSuctionType === "Durr VS-250") {
            matchingProduct = allProducts.find((p) => p.code === "DCH 117");
          }

          // console.log("Matching Product:", matchingProduct);
          // console.log(
          //   "Matching Product sapPrice:",
          //   matchingProduct
          //     ? matchingProduct.sapPrice
          //     : "No matching product found"
          // );

          if (matchingProduct) {
            const priceListNumber = Number(
              await AsyncStorage.getItem("PriceList")
            );
            const sapProduct = sapData.find(
              (sap) => sap.ItemCode === matchingProduct.code
            );
            const sapPriceData = sapProduct.ItemPrices.find(
              (price) => price.PriceList === priceListNumber
            );
            const sapPriceRaw = sapPriceData
              ? sapPriceData.Price
              : 0;

            const uniqueNumber = generateUniqueRandomNumber();
            const productImageURL = `${BASE_URLS.PRODUCT}${matchingProduct.image?.trim()}`;

            await addToCart({
              ...matchingProduct,
              color: color,
              sapPrice: sapPriceRaw,
              gstRate: getGstRate(matchingProduct.taxcode),
              taxcode: matchingProduct.taxcode,
              suctionType: suctionProduct.name,
              quantity: quantity,
              remarks: remark,
              uniqueNumber,
              image: productImageURL,
            });
          } else {
            console.error("Matching product not found in allProducts.");
          }
        } else {
          const uniqueNumber = generateUniqueRandomNumber();
          const productImageURL = `${BASE_URLS.PRODUCT}${product.image?.trim()}`;
          
          await addToCart({
            ...product,
            color: color,
            suctionType: suctionProduct.name,
            remarks: remark,
            quantity: quantity,
            uniqueNumber,
            image: productImageURL,
          });
        }
      } else {
        console.error(
          `Suction type "${selectedSuctionType}" not found in allProducts.`,
          allProducts
        );
      }
    } else {
      // Regular product handling
      const uniqueNumber = generateUniqueRandomNumber();
      const productImageURL = `${BASE_URLS.PRODUCT}${product.image?.trim()}`;
      
      await addToCart({ 
        ...product, 
        remarks: remark, 
        quantity: quantity,
        color: color,
        uniqueNumber,
        image: productImageURL,
      });

      if (
        selectedSuctionType &&
        selectedSuctionType !== "Pneumatic Suction" && 
        product.cat_name !== "Indian Chairs"
      ) {
        const suctionProduct = allProducts.find(
          (p) => p.name === selectedSuctionType
        );
        
        if (suctionProduct) {
          const priceListNumber = Number(await AsyncStorage.getItem("PriceList"));

          const matchingProduct = sapData.find(
            (sap) => sap.ItemCode === suctionProduct.code
          );

          if (matchingProduct) {
            const sapPriceData = matchingProduct.ItemPrices.find(
              (price) => price.PriceList === priceListNumber
            );
            const sapPriceRaw = sapPriceData
              ? sapPriceData.Price
              : 0;

            const uniqueNumber = generateUniqueRandomNumber();
            const productImageURL = `${BASE_URLS.PRODUCT}${suctionProduct.image?.trim()}`;

            await addToCart({
              ...suctionProduct,
              quantity: quantity,
              sapPrice: sapPriceRaw,
              gstRate: getGstRate(suctionProduct.taxcode),
              taxcode: suctionProduct.taxcode,
              uniqueNumber,
              image: productImageURL,
            });
          } else {
            console.error(
              "Matching SAP product not found for suction product:",
              suctionProduct
            );
          }
        } else {
          console.error(
            `Suction type "${selectedSuctionType}" not found in allProducts.`
          );
        }
      }
    }

    // Clear product states after successful addition
    setQuantities(prev => ({
      ...prev,
      [product.id]: 1, // Reset to default quantity
    }));
    setColors(prev => ({
      ...prev,
      [product.id]: '', // Clear color selection
    }));
    setSuctionTypes(prev => ({
      ...prev,
      [product.id]: '', // Clear suction type selection
    }));
    setRemarks(prev => ({
      ...prev,
      [product.id]: '', // Clear remarks
    }));

    // Show success message and update cart count
    animateAddToCart(product.id);
    setCartCount(prev => prev + quantity);
    Alert.alert(
      '✅ Added to Cart',
      `${product.name} has been added to your cart.`,
      [{ text: 'OK', style: 'default' }]
    );

  } catch (error) {
    console.error(`Error handling add to cart for ${product.name}:`, error);
    Alert.alert('Error', 'Failed to add product to cart. Please try again.');
  }
}, [quantities, colors, suctionTypes, remarks, selectedDealer, generateUniqueRandomNumber, animateAddToCart, addToCart, allProducts, sapData]);

  const handleQuantityChange = useCallback((productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, parseInt(value) || 1),
    }));
  }, []);

  const handleColorChange = useCallback((productId, color) => {
    setColors(prev => ({
      ...prev,
      [productId]: color,
    }));
  }, []);

  const handleSuctionTypeChange = useCallback((productId, suctionType) => {
    setSuctionTypes(prev => ({
      ...prev,
      [productId]: suctionType,
    }));
  }, []);

  const handleRemarksChange = useCallback((productId, text) => {
    setRemarks(prev => ({
      ...prev,
      [productId]: text,
    }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
      await fetchFreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFreshData]);

  const clearAllFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedCompany(null);
    setSearchQuery('');
    setSortBy('name');
  }, []);

  // Pagination
  const currentEntriesWithPrices = useMemo(() => {
    const priceMap = new Map(
      filteredPrices.map(price => [price.itemCode, price.price])
    );

    return filteredProducts.map(product => {
      const gstRate = getGstRate(product.taxcode);
      let sapPrice = priceMap.get(product.code) || 0;

      // For combo packages, sum up child items' pre-tax SAP prices
      if (product.cat_name === 'Combo Package' && packageCompositions[product.name]) {
        const childCodes = packageCompositions[product.name];
        const packageTotal = childCodes.reduce((sum, code) => sum + (priceMap.get(code) || 0), 0);
        if (packageTotal > 0) {
          sapPrice = packageTotal;
        }
      }

      return { ...product, sapPrice, gstRate, taxcode: product.taxcode };
    });
  }, [filteredProducts, filteredPrices, packageCompositions, allProducts]);

  const indexOfLastEntry = currentPage * ENTRIES_PER_PAGE;
  const indexOfFirstEntry = indexOfLastEntry - ENTRIES_PER_PAGE;
  const currentEntries = currentEntriesWithPrices.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(currentEntriesWithPrices.length / ENTRIES_PER_PAGE);

  // Scroll animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerTransform = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // Component render functions
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header, 
        { 
          opacity: headerOpacity,
          transform: [{ translateY: headerTransform }]
        }
      ]}
    >
      <LinearGradient
        colors={['#f7931e', '#f7931e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Premium Products</Text>
              <Text style={styles.headerSubtitle}>
                {filteredProducts.length} items • {priceListName}
              </Text>
            </View>

            <Animated.View
              style={[
                styles.cartButton,
                {
                  transform: [
                    {
                      scale: cartBounce.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => router.push('/cart')}
                activeOpacity={0.8}
                style={styles.cartButtonInner}
              >
                <Ionicons name="bag-outline" size={24} color="#fff" />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );

  const renderSearchAndFilters = () => (
    <View style={styles.searchAndFiltersContainer}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#020202ff" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, brands, or codes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#000000ff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="filter" size={16} color="#000000ff" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'grid' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={viewMode === 'grid' ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'list' && styles.viewModeButtonActive
            ]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={viewMode === 'list' ? '#ffffff' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActiveFilters = () => {
    const hasFilters = selectedCategory || selectedCompany || sortBy !== 'name';

    if (!hasFilters) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.activeFiltersContent}>
            {selectedCategory && (
              <View style={styles.activeFilter}>
                <Feather name="tag" size={14} color="#f7931e" style={{ marginRight: 6 }} />
                <Text style={styles.activeFilterText}>{selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory(null)} style={{ marginLeft: 6 }}>
                  <Ionicons name="close" size={16} color="#f7931e" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCompany && (
              <View style={styles.activeFilter}>
                <Feather name="briefcase" size={14} color="#f7931e" style={{ marginRight: 6 }} />
                <Text style={styles.activeFilterText}>{selectedCompany}</Text>
                <TouchableOpacity onPress={() => setSelectedCompany(null)} style={{ marginLeft: 6 }}>
                  <Ionicons name="close" size={16} color="#f7931e" />
                </TouchableOpacity>
              </View>
            )}
            {sortBy !== 'name' && (
              <View style={styles.activeFilter}>
                <Feather name="bar-chart-2" size={14} color="#f7931e" style={{ marginRight: 6 }} />
                <Text style={styles.activeFilterText}>Sort: {sortBy}</Text>
                <TouchableOpacity onPress={() => setSortBy('name')} style={{ marginLeft: 6 }}>
                  <Ionicons name="close" size={16} color="#f7931e" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.activeFilter} onPress={clearAllFilters}>
              <Feather name="x" size={19} color="#dc2626" style={{ marginRight: 4 }} />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderProductCard = ({ item, index }) => {
    const isEvenIndex = index % 2 === 0;
    const animationValue = cardAnimations[item.id];
    
    const cardStyle = viewMode === 'grid' 
      ? [styles.productCard, isEvenIndex ? styles.productCardLeft : styles.productCardRight]
      : styles.productCardList;

    const scale = animationValue ? animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.96],
    }) : 1;

    return (
      <Animated.View style={[cardStyle, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.productCardContent}
          onPress={() => {
            setSelectedProduct(item);
            setShowProductModal(true);
          }}
          activeOpacity={0.95}
        >
          <View style={styles.productImageContainer}>
            <Image
              source={{ uri: `${BASE_URLS.PRODUCT}${item.image}` }}
              style={viewMode === 'grid' ? styles.productImage : styles.productImageList}
              resizeMode="contain"
            />
            <View style={styles.productCodeBadge}>
              <Text style={styles.productCodeText}>{item.code}</Text>
            </View>
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productBrand}>{item.company}</Text>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>
                {item.sapPrice > 0
                  ? formatCurrency(toPostTax(item.sapPrice, item.taxcode))
                  : 'Price Unavailable'}
              </Text>
            </View>

            <View style={styles.quickActionsContainer}>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.id, (quantities[item.id] || 1) - 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="minus" size={16} color="#000000ff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantities[item.id] || 1}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.id, (quantities[item.id] || 1) + 1)}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color="#000000ff" />
                </TouchableOpacity>
                
              </View>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={() => {
            setSelectedProduct(item);
            setShowProductModal(true);
          }}
                activeOpacity={0.9}
              >
                
                <Feather name="shopping-bag" size={16} color="#fff" />
                <Text style={styles.addToCartText}>Add</Text>
                
              </TouchableOpacity>

              
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderColorOptions = (product) => {
    const productColors = chairColors[product.name];
    
    if (product.cat_name === 'Indian Chairs') {
      const indianChairColors = [
        { label: 'Color Not Confirmed', value: 'Color Not Confirmed' },
        { label: 'CH-F - Purple', value: 'CH-F - Purple' },
        { label: 'CH-P - Apple Green', value: 'CH-P - Apple Green' },
        { label: 'CH-D - Dark Blue', value: 'CH-D - Dark Blue' },
        { label: 'CH-B - Sea Green', value: 'CH-B - Sea Green' },
        { label: 'CH-K - Putty', value: 'CH-K - Putty' },
        { label: 'CH-E - Maroon', value: 'CH-E - Maroon' },
        { label: 'CH-C - Deep Blue', value: 'CH-C - Deep Blue' },
        { label: 'CH-O - Off White', value: 'CH-O - Off White' },
        { label: 'CH-Q - Silver', value: 'CH-Q - Silver' },
        { label: 'CH-H - Pink', value: 'CH-H - Pink' },
        { label: 'CH-J - Yellow', value: 'CH-J - Yellow' },
        { label: 'CH-I - Orange', value: 'CH-I - Orange' },
        { label: 'CH-A - Gross Green', value: 'CH-A - Gross Green' },
        { label: 'CH-L - Brown', value: 'CH-L - Brown' },
        { label: 'CH-R - Sky Blue', value: 'CH-R - Sky Blue' },
        { label: 'CH-M - Copper', value: 'CH-M - Copper' },
      ];
      
      return (
        <View style={styles.modalOptionContainer}>
          <Text style={styles.modalOptionLabel}>Color</Text>
          <View style={styles.modernPickerContainer}>
            <Picker
              selectedValue={colors[product.id] || ''}
              onValueChange={(value) => handleColorChange(product.id, value)}
              style={styles.modernPicker}
            >
              <Picker.Item label="Select Color" value="" />
              {indianChairColors.map((color, index) => (
                <Picker.Item key={index} label={color.label} value={color.value} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }
    
    if (productColors && productColors.length > 0) {
      return (
        <View style={styles.modalOptionContainer}>
          <Text style={styles.modalOptionLabel}>Color</Text>
          <View style={styles.modernPickerContainer}>
            <Picker
              selectedValue={colors[product.id] || ''}
              onValueChange={(value) => handleColorChange(product.id, value)}
              style={styles.modernPicker}
            >
              <Picker.Item label="Select Color" value="" />
              <Picker.Item label="Color Not Confirmed" value="Color Not Confirmed" />
              {productColors.map((color, index) => (
                <Picker.Item key={index} label={color.color} value={color.color} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }
    
    return null;
  };

  const renderSuctionTypeOptions = (product) => {
    const getSuctionOptions = () => {
      if (product.cat_name === 'Dental Chairs' && product.code === 'DCH 119') {
        return [
          'Provision Suction',
          'Suction 0.25 HP Mobile',
          'Suction 0.25 HP INBUILT',
          'Durr VS-250',
          'Durr VS-300',
        ];
      } else if (product.cat_name === 'Dental Chairs') {
        return [
          'Pneumatic Suction',
          'Suction 0.25 HP Mobile',
          'Suction 0.25 HP INBUILT',
          'Durr VS-250',
          'Durr VS-300',
        ];
      } else if (product.cat_name === 'Indian Chairs' && product.code === 'DCH 117') {
        return ['Durr VS-250'];
      } else if (product.cat_name === 'Indian Chairs') {
        return ['Suction 0.25 HP INBUILT'];
      }
      return [];
    };

    const options = getSuctionOptions();
    
    if (options.length === 0) return null;

    return (
      <View style={styles.modalOptionContainer}>
        <Text style={styles.modalOptionLabel}>Suction Type</Text>
        <View style={styles.modernPickerContainer}>
          <Picker
            selectedValue={suctionTypes[product.id] || ''}
            onValueChange={(value) => handleSuctionTypeChange(product.id, value)}
            style={styles.modernPicker}
          >
            <Picker.Item label="Select Suction Type" value="" />
            {options.map((option, index) => (
              <Picker.Item key={index} label={option} value={option} />
            ))}
          </Picker>
        </View>
      </View>
    );
  };

  const renderProductModal = () => (
    <Modal
      visible={showProductModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowProductModal(false)}
    >
      <View style={styles.modalContainer}>
        {selectedProduct && (
          <>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowProductModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Product Details</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: `${BASE_URLS.PRODUCT}${selectedProduct.image}` }}
                  style={styles.modalProductImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.modalProductInfo}>
                <View style={styles.modalBrandContainer}>
                  <Text style={styles.modalProductBrand}>{selectedProduct.company}</Text>
                  <View style={styles.modalProductCodeBadge}>
                    <Text style={styles.modalProductCodeText}>{selectedProduct.code}</Text>
                  </View>
                </View>
                
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalProductPrice}>
                    {selectedProduct.sapPrice > 0
                      ? formatCurrency(toPostTax(selectedProduct.sapPrice, selectedProduct.taxcode))
                      : 'Price Unavailable'}
                  </Text>
                </View>

                <View style={styles.modalOptionContainer}>
                  <Text style={styles.modalOptionLabel}>Quantity</Text>
                  <View style={styles.modalQuantityContainer}>
                    <TouchableOpacity
                      style={styles.modalQuantityButton}
                      onPress={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) - 1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="minus" size={20} color="#f7931e" />
                    </TouchableOpacity>
                    <View style={styles.modalQuantityDisplay}>
                      <Text style={styles.modalQuantityText}>{quantities[selectedProduct.id] || 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalQuantityButton}
                      onPress={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) + 1)}
                      activeOpacity={0.7}
                    >
                      <Feather name="plus" size={20} color="#667eea" />
                    </TouchableOpacity>
                  </View>
                </View>

                {renderColorOptions(selectedProduct)}
                {renderSuctionTypeOptions(selectedProduct)}

                <View style={styles.modalOptionContainer}>
                  <Text style={styles.modalOptionLabel}>Special Requirements</Text>
                  <TextInput
                    style={styles.modalRemarksInput}
                    placeholder="Enter any special requirements or notes..."
                    value={remarks[selectedProduct.id] || ''}
                    onChangeText={(text) => handleRemarksChange(selectedProduct.id, text)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterPricing}>
                <Text style={styles.modalFooterLabel}>Total Price</Text>
                <Text style={styles.modalFooterPrice}>
                  {selectedProduct.sapPrice > 0
                    ? formatCurrency(toPostTax(selectedProduct.sapPrice, selectedProduct.taxcode) * (quantities[selectedProduct.id] || 1))
                    : 'Price Unavailable'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalAddToCartButton}
                onPress={() => {
                  handleAddToCart(selectedProduct);
                  setShowProductModal(false);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalAddToCartText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFilterModal(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters & Sort</Text>
          <TouchableOpacity
            style={styles.modalResetButton}
            onPress={clearAllFilters}
            activeOpacity={0.7}
          >
            <Text style={styles.modalResetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Categories Filter Section */}
          <View style={styles.filterModalSection}>
            <CategorySelector
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={(value) => {
                          setSelectedCategory(prev => prev === value ? null : value);
                        }}
                      />
          </View>

          {/* Companies Filter Section */}
          <View style={styles.filterModalSection}>
            <CompanySelector
                        companies={companies}
                        selectedCompany={selectedCompany}
                        onSelectCompany={(value) => {
                          setSelectedCompany(prev => prev === value ? null : value);
                        }}
                      />
          </View>

          {/* Sort Section */}
          <View style={styles.filterModalSection}>
            <Text style={styles.filterSortTitle}>Sort By</Text>
            <View style={styles.sortOptionsContainer}>
              {[
                { key: 'name', label: 'Name (A-Z)' },
                { key: 'price', label: 'Price (Low-High)' },
                { key: 'company', label: 'Company' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sortOption, sortBy === option.key && styles.sortOptionActive]}
                  onPress={() => setSortBy(option.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortOptionText, sortBy === option.key && styles.sortOptionTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              {filteredProducts.length} products found
            </Text>
            {(selectedCategory || selectedCompany || sortBy !== 'name') && (
              <TouchableOpacity onPress={clearAllFilters} style={styles.quickClearButton}>
                <Text style={styles.quickClearText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.modalApplyButton}
            onPress={() => setShowFilterModal(false)}
            activeOpacity={0.9}
          >
            <Text style={styles.modalApplyText}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <Feather name="chevron-left" size={20} color={currentPage === 1 ? '#ccc' : '#f7931e'} />
        </TouchableOpacity>
        
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages}
          </Text>
          <Text style={styles.paginationSubtext}>
            Showing {indexOfFirstEntry + 1}-{Math.min(indexOfLastEntry, filteredProducts.length)} of {filteredProducts.length}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          <Feather name="chevron-right" size={20} color={currentPage === totalPages ? '#ccc' : '#f7931e'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Feather name="search" size={64} color="#ddd" />
      <Text style={styles.emptyStateTitle}>No products found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your search or filters to find what you're looking for.
      </Text>
      {(selectedCategory || selectedCompany || searchQuery) && (
        <TouchableOpacity style={styles.emptyStateClearButton} onPress={clearAllFilters}>
          <Text style={styles.emptyStateClearText}>Clear all filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#f7931e" />
      <Text style={styles.loadingText}>Loading products...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#f7931e" />
      {renderDealerSelection()}
      
      <View style={styles.mainContent}>
        {renderSearchAndFilters()}
        {renderActiveFilters()}

        {loading ? (
          renderLoadingState()
        ) : currentEntries.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              data={currentEntries}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id.toString()}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              contentContainerStyle={styles.productsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#f7931e"
                  colors={['#f7931e']}
                />
              }
              onEndReachedThreshold={0.1}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={10}
              removeClippedSubviews={true}
              getItemLayout={viewMode === 'list' ? (data, index) => ({
                length: 120,
                offset: 120 * index,
                index,
              }) : undefined}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { 
                  useNativeDriver: false,
                  listener: (event) => {
                    const currentScrollY = event.nativeEvent.contentOffset.y;
                  }
                }
              )}
              scrollEventThrottle={16}
            />
            {renderPagination()}
          </>
        )}
      </View>

      {renderProductModal()}
      {renderFilterModal()}
    </View>
  );
};

// Comprehensive Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  
  // Enhanced Header Styles
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cartButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4757',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#ff4757',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
 

  // Compact Search and Filters
  searchAndFiltersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchContainer: {
    marginBottom: 14,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },

  // Compact Filters Row
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersScrollContent: {
    paddingRight: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOpacity: 0.3,
  },
  filterButtonText: {
    color: '#000000ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sortButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#f7f9fc',
    borderWidth: 1.5,
    borderColor: '#e8edf3',
  },
  sortButtonActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
  },
  sortButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fc',
    borderRadius: 16,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  viewModeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 13,
  },
  viewModeButtonActive: {
    backgroundColor: '#000000ff',
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Enhanced Active Filters
  activeFiltersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
  },
  activeFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  activeFilterText: {
    color: '#000000ff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 0.2,
  },
  clearAllButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 8,
  },
  clearAllText: {
    color: '#030202ff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Compact Product List
  productsList: {
    padding: 16,
    paddingBottom: 100,
  },

  // Compact Product Cards
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
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
  productCardLeft: {
    marginRight: 8,
  },
  productCardRight: {
    marginLeft: 8,
  },
  productCardList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
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
  productCardContent: {
    padding: 16,
  },
  productImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 12,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  productImageList: {
    width: '100%',
    height: 100,
    borderRadius: 12,
  },
  productCodeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#b96e0aff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
  },
  productCodeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  productInfo: {
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    color: '#f7931e',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.1,
    flex: 0,
  },
  originalPrice: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    fontWeight: '500',
    flex: 0,
  },
  discountBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    flex: 0,
  },
  discountText: {
    color: '#dc2626',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
   dealerSelectionContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealerSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealerSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  dealerLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  dealerLoadingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 14,
  },
  dealerPickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  dealerPicker: {
    height: 50,
  },
  selectedDealerBanner: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDealerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedDealerText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  changeDealerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  changeDealerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Compact Quick Actions - Full Column Layout
  quickActionsContainer: {
    marginTop: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8edf3',
    paddingVertical: 4,
    marginBottom: 8,
  },
  quantityButton: {
    width: 38,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7931e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },

  // Enhanced Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f7f9fc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  modalPlaceholder: {
    width: 44,
  },
  modalResetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalResetText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  modalImageContainer: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
  },
  modalProductImage: {
    width: 900,
    height: 290,
    borderRadius: 20,
  },
  modalProductInfo: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalProductBrand: {
    fontSize: 14,
    color: '#f7931e',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalProductCodeBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  modalProductCodeText: {
    color: '#f7931e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalProductPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  modalOriginalPrice: {
    fontSize: 16,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 16,
    fontWeight: '500',
  },
  modalOptionContainer: {
    marginBottom: 24,
  },
  modalOptionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  modalQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  modalQuantityButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  modalQuantityDisplay: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  modalQuantityText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    minWidth: 32,
    letterSpacing: 0.3,
  },
  modernPickerContainer: {
    backgroundColor: '#f7f9fc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e8edf3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  modernPicker: {
    height: 54,
    color: '#1e293b',
    fontWeight: '600',
  },
  modalRemarksInput: {
    backgroundColor: '#f7f9fc',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#e8edf3',
    minHeight: 120,
    fontWeight: '500',
    lineHeight: 24,
  },modalFooter: {
  backgroundColor: '#ffffff',
  padding: 28,
  borderTopWidth: 1,
  borderTopColor: '#e1e8ed',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  shadowColor: '#1a202c',
  shadowOffset: {
    width: 0,
    height: -6,
  },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 12,
  // Add gradient-like effect with additional border
  borderTopWidth: 2,
  borderTopColor: 'transparent',
  position: 'relative',
  // Add subtle background texture
  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
},

modalFooterPricing: {
  flex: 1,
  // Add subtle background for pricing section
  backgroundColor: '#f8fafc',
  padding:9,
  borderRadius: 16,
  marginRight: 16,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},

modalFooterLabel: {
  fontSize: 12,
  color: '#64748b',
  marginBottom: 8,
  fontWeight: '700',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  // Add subtle text shadow
  textShadowColor: 'rgba(0, 0, 0, 0.1)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

modalFooterPrice: {
  fontSize: 26,
  fontWeight: '900',
  color: '#059669',
  letterSpacing: 0.5,
  // Add gradient text effect (simulated with shadow)
  textShadowColor: 'rgba(5, 150, 105, 0.3)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
  // Add subtle border bottom for emphasis
  paddingBottom: 4,
  borderBottomWidth: 2,
  borderBottomColor: '#10b981',
},

modalAddToCartButton: {
  backgroundColor: '#f7931e',
  paddingHorizontal: 2,
  paddingVertical: 12,
  borderRadius: 24,
  shadowColor: '#f7931e',
},

modalAddToCartText: {
  padding: 8,
  color: '#ffffff',
  fontSize: 17,
  fontWeight: '900',
  textTransform: 'uppercase',
  textAlign: 'center',
  // Add text shadow for depth
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
  // Add subtle line height for better readability
  lineHeight: 20,
},

// Optional: Add these additional enhancement styles
modalFooterEnhanced: {
  // Add a subtle gradient overlay
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)',
  }
},

// Add hover/press states for button (use in TouchableOpacity props)
modalAddToCartButtonPressed: {
  backgroundColor: '#4f46e5',
  transform: [{ scale: 0.98 }],
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
},

// Add animated shimmer effect for price (optional)
modalFooterPriceAnimated: {
  // Add shimmer effect background
  background: 'linear-gradient(90deg, #059669 25%, #10b981 50%, #059669 75%)',
  backgroundSize: '200% 100%',
  // Note: CSS animations need to be handled with Animated API in React Native
},

// Additional enhancement: Add icon support to button
modalAddToCartButtonWithIcon: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8, // For icon spacing
},

modalAddToCartIcon: {
  marginRight: 8,
  // Add subtle icon glow
  shadowColor: '#ffffff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 3,
},

  // Sort styles
  filterSortTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortOptionActive: {
    backgroundColor: '#f7931e',
    borderColor: '#e8841a',
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Enhanced Filter Modal Styles
  filterModalSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 16,
    flex: 1,
    letterSpacing: 0.2,
  },
  filterSelectedIndicator: {
    backgroundColor: '#f7931e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterSelectedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterSectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    marginLeft: 40,
    fontWeight: '500',
    lineHeight: 20,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  filterOptionCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    margin: 6,
    borderWidth: 2,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  filterOptionCardActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOpacity: 0.3,
    transform: [{ scale: 1.02 }],
  },
  filterOptionContent: {
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  filterOptionTextActive: {
    color: '#fff',
  },
  filterOptionCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  filterOptionCountActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  companyLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceRangeContainer: {
    marginTop: 12,
  },
  priceRangeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  priceRangeOptionActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOpacity: 0.3,
  },
  priceRangeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  priceRangeLabelActive: {
    color: '#fff',
  },
  priceRangeCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  priceRangeCountActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  filterSummary: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f4ff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  filterSummaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  quickClearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  quickClearText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
    letterSpacing: 0.3,
  },modalApplyButton: {
  backgroundColor: '#f7931e',
  paddingVertical: 22,
  paddingHorizontal: 32,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 24,
  marginBottom: Platform.OS === 'ios' ? 38 : 28,
  shadowColor: '#f7931e',
  shadowOffset: {
    width: 0,
    height: 8,
  },
  shadowOpacity: 0.5,
  shadowRadius: 16,
  elevation: 12,
  // Add gradient border effect
  borderWidth: 1,
  borderColor: '#4f46e5',
  borderTopWidth: 1,
  borderTopColor: '#818cf8',
  borderBottomWidth: 2,
  borderBottomColor: '#3730a3',
  // Add subtle inner shadow effect
  position: 'relative',
  overflow: 'hidden',
  // Prepare for animations
  transform: [{ scale: 1 }],
  // Add subtle gradient background simulation
  backgroundImage: 'linear-gradient(135deg, #f7931e 0%, #4f46e5 100%)',
},

modalApplyText: {
  color: '#ffffff',
  fontSize: 19,
  fontWeight: '900',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  textAlign: 'center',
  // Add text shadow for depth
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
  // Better line height for readability
  lineHeight: 22,
  // Add subtle character spacing
  includeFontPadding: false,
},

// Add pressed state for better interaction feedback
modalApplyButtonPressed: {
  backgroundColor: '#4f46e5',
  transform: [{ scale: 0.98 }],
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
  borderBottomWidth: 1,
  borderBottomColor: '#4338ca',
},



modalApplyTextWithIcon: {
  color: '#ffffff',
  fontSize: 19,
  fontWeight: '900',
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  textAlign: 'center',
  marginLeft: 8, // Space for icon
  textShadowColor: 'rgba(0, 0, 0, 0.4)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
  lineHeight: 22,
},

modalApplyIcon: {
  // Icon styling for button
  shadowColor: '#ffffff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: 3,
},

// Premium version with animated background
modalApplyButtonPremium: {
  backgroundColor: '#f7931e',
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: Platform.OS === 'ios' ? 42 : 32,
  shadowColor: '#f7931e',
  shadowOffset: {
    width: 0,
    height: 12,
  },
  shadowOpacity: 0.7,
  shadowRadius: 24,
  elevation: 18,
  // Enhanced 3D effect
  borderWidth: 3,
  borderColor: '#4f46e5',
  borderTopWidth: 2,
  borderTopColor: '#a5b4fc',
  borderBottomWidth: 4,
  borderBottomColor: '#312e81',
  borderLeftColor: '#5b21b6',
  borderRightColor: '#5b21b6',
  // Add inner glow
  position: 'relative',
  overflow: 'hidden',
},

modalApplyTextPremium: {
  color: '#ffffff',
  fontSize: 20,
  fontWeight: '900',
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  textAlign: 'center',
  // Enhanced text shadow
  textShadowColor: 'rgba(0, 0, 0, 0.5)',
  textShadowOffset: { width: 0, height: 3 },
  textShadowRadius: 8,
  lineHeight: 24,
  // Add text outline effect (simulated)
  textDecorationLine: 'none',
},

// Subtle animation preparation styles
modalApplyButtonAnimated: {
  // For shimmer or pulse animations
  overflow: 'hidden',
  position: 'relative',
},

// Loading state styles
modalApplyButtonLoading: {
  backgroundColor: '#9ca3af',
  shadowColor: '#9ca3af',
  shadowOpacity: 0.2,
  elevation: 4,
},

modalApplyTextLoading: {
  opacity: 0.6,
},
  // Enhanced Selector Styles
  selectorContainer: {
    marginBottom: 24,
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  selectorOptions: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  selectorOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#f7f9fc',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorOptionActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOpacity: 0.3,
    transform: [{ scale: 1.05 }],
  },
  selectorOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.2,
  },
  selectorOptionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Enhanced Pagination
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  paginationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f7f9fc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e8edf3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationButtonActive: {
    backgroundColor: '#f7931e',
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOpacity: 0.3,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#f1f5f9',
  },
  paginationInfo: {
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8edf3',
  },
  paginationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  paginationSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Enhanced Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: '#fafbfc',
  },
  emptyStateIllustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#c7d2fe',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
    maxWidth: 280,
  },
  emptyStateClearButton: {
    backgroundColor: '#f7931e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateClearText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Enhanced Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: '#fafbfc',
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '500',
  },

  // Enhanced Floating Action Button
  floatingButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
  },
  floatingButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingButtonBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff4757',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#ff4757',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingButtonBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modern Status Indicators
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusInStock: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusOutOfStock: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusLowStock: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusTextInStock: {
    color: '#16a34a',
  },
  statusTextOutOfStock: {
    color: '#dc2626',
  },
  statusTextLowStock: {
    color: '#d97706',
  },

  // Enhanced Animation Styles
  fadeIn: {
    opacity: 1,
  },
  fadeOut: {
    opacity: 0,
  },
  slideUp: {
    transform: [{ translateY: 0 }],
  },
  slideDown: {
    transform: [{ translateY: 20 }],
  },
  scaleIn: {
    transform: [{ scale: 1 }],
  },
  scaleOut: {
    transform: [{ scale: 0.95 }],
  },

  // Accessibility Enhancements
  accessibilityFocus: {
    borderWidth: 3,
    borderColor: '#f7931e',
    shadowColor: '#f7931e',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },

  // Dark Mode Support (Optional)
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  darkText: {
    color: '#f1f5f9',
  },
  darkTextSecondary: {
    color: '#94a3b8',
  },
  darkInput: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    color: '#f1f5f9',
  },

  // Responsive Design Helpers
  smallScreen: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  mediumScreen: {
    paddingHorizontal: 20,
    fontSize: 16,
  },
  largeScreen: {
    paddingHorizontal: 24,
    fontSize: 18,
  },

  // Performance Optimizations
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  visible: {
    opacity: 1,
    pointerEvents: 'auto',
  },
});

export default PurchasePage;
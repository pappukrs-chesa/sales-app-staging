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
  Pressable,
  PanResponder,
  Easing,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useCart } from '../../../ContextAPI/CartContext';
import { Picker } from '@react-native-picker/picker';
import ProductGrid from '../../../components/ProductGrid';
import CategorySelector from './CategorySection';
import CompanySelector from './CompanySelection';
import DealerSelection from './DealerSelection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/config/apiConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cache keys
const CACHE_KEYS = {
  COMPANIES: 'cached_companies',
  CATEGORIES: 'cached_categories',
  PRODUCTS: 'cached_products',
  SAP_DATA: 'cached_sap_data',
  CHAIR_COLORS: 'cached_chair_colors',
  CACHE_TIMESTAMP: 'cache_timestamp',
};

// Cache duration (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const PurchasePage = () => {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  
  // Refs for animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = useRef(new Animated.Value(100)).current;
  const searchBarOpacity = useRef(new Animated.Value(1)).current;
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
  const [suctionTypes, setSuctionTypes] = useState({});
  const [remarks, setRemarks] = useState({});
  const [quantities, setQuantities] = useState({});
  const [colors, setColors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceList, setPriceList] = useState('1');
  const [priceListName, setPriceListName] = useState('MRP');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const floatingButtonScale = useRef(new Animated.Value(1)).current;
  const cartBounce = useRef(new Animated.Value(0)).current;
  
  const entriesPerPage = 12;
  const usedNumbers = new Set();

  // Base URLs
  const productbaseURL = 'https://chesadentalcare.com/possystem/admin/admin/uploads/product/';
  const companybaseURL = 'https://chesadentalcare.com/possystem/admin/admin/uploads/dealers/';
  const categorybaseURL = 'https://chesadentalcare.com/possystem/admin/admin/uploads/category/';

  // Price list mapping
  const priceListMap = {
    1: "MRP",
    2: "MSP", 
    5: "DP",
    6: "SDP",
    9: "CF",
  };

  // Cache utilities
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const getCachedData = async (key) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cached data for ${key}:`, error);
      return null;
    }
  };

  const setCachedData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting cached data for ${key}:`, error);
    }
  };

  const updateCacheTimestamp = async () => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
      console.error('Error updating cache timestamp:', error);
    }
  };

  // Enhanced animation effects
  useEffect(() => {
    // Entrance animations
    Animated.stagger(200, [
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
    ]).start();

    // Floating action button animation
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingButtonScale, {
          toValue: 1.1,
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
    floatingAnimation.start();

    return () => floatingAnimation.stop();
  }, []);

  // Scroll-based animations
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

  // Enhanced data fetching with caching
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      const isValid = await isCacheValid();
      
      if (isValid) {
        // Load from cache
        await loadFromCache();
      } else {
        // Fetch fresh data and cache it
        await fetchAndCacheData();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      await fetchAndCacheData(); // Fallback to fresh fetch
    } finally {
      setLoading(false);
    }
  };

  const loadFromCache = async () => {
    try {
      const [cachedCompanies, cachedCategories, cachedProducts, cachedSapData, cachedChairColors] = await Promise.all([
        getCachedData(CACHE_KEYS.COMPANIES),
        getCachedData(CACHE_KEYS.CATEGORIES),
        getCachedData(CACHE_KEYS.PRODUCTS),
        getCachedData(CACHE_KEYS.SAP_DATA),
        getCachedData(CACHE_KEYS.CHAIR_COLORS),
      ]);

      if (cachedCompanies) setCompanies(cachedCompanies);
      if (cachedCategories) setCategories(cachedCategories);
      if (cachedProducts) {
        const productsWithDefaults = cachedProducts.map(product => ({
          ...product,
          quantity: 1,
        }));
        setAllProducts(productsWithDefaults);
        initializeProductStates(productsWithDefaults);
      }
      if (cachedSapData) setSapData(cachedSapData);
      if (cachedChairColors) setChairColors(cachedChairColors);

      console.log('Data loaded from cache successfully');
    } catch (error) {
      console.error('Error loading from cache:', error);
      throw error;
    }
  };

  const fetchAndCacheData = async () => {
    try {
      const [companiesData, categoriesData, productsData] = await Promise.all([
        fetchCompanies(),
        fetchCategories(),
        fetchAllProducts(),
      ]);

      // Cache the fetched data
      await Promise.all([
        setCachedData(CACHE_KEYS.COMPANIES, companiesData),
        setCachedData(CACHE_KEYS.CATEGORIES, categoriesData),
        setCachedData(CACHE_KEYS.PRODUCTS, productsData),
      ]);

      await updateCacheTimestamp();
      console.log('Data fetched and cached successfully');
    } catch (error) {
      console.error('Error fetching and caching data:', error);
      throw error;
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${BASE_URL}/company`);
      const data = await response.json();
      setCompanies(data);
      return data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/category`);
      const data = await response.json();
      setCategories(data);
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/products_all`);
      const data = await response.json();
      
      const productsWithDefaults = data.map(product => ({
        ...product,
        quantity: 1,
      }));
      
      setAllProducts(productsWithDefaults);
      initializeProductStates(productsWithDefaults);
      
      const itemCodes = productsWithDefaults.map(product => product.code);
      await fetchSapData(itemCodes);
      
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  const initializeProductStates = (products) => {
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
  };

  const fetchSapData = async (itemCodes) => {
    try {
      const response = await fetch(`${BASE_URL}/products_sap`, {
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
  };

  const fetchChairColors = async (name) => {
    try {
      const response = await fetch(
        `${BASE_URL}/chairs_color?name=${encodeURIComponent(name)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const newChairColors = {
          ...chairColors,
          [name]: data.length > 0 ? data : [],
        };
        setChairColors(newChairColors);
        await setCachedData(CACHE_KEYS.CHAIR_COLORS, newChairColors);
      }
    } catch (error) {
      console.error('Error fetching chair colors:', error);
    }
  };

  // Enhanced filtering with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      filterProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [name, selectedCompany, selectedCategory, allProducts, searchQuery, sortBy]);

  const filterProducts = useCallback(() => {
    let filtered = allProducts;
    
    if (name) {
      const decodedName = decodeURIComponent(name);
      filtered = filtered.filter(
        product => product.company === decodedName || product.cat_name === decodedName
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

    // Enhanced sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          const priceA = getPriceForProduct(a) || 0;
          const priceB = getPriceForProduct(b) || 0;
          return priceA - priceB;
        case 'company':
          return a.company.localeCompare(b.company);
        case 'popularity':
          return (b.popularity || 0) - (a.popularity || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [name, selectedCompany, selectedCategory, allProducts, searchQuery, sortBy]);

  // Load initial price list
  useEffect(() => {
    const loadPriceList = async () => {
      try {
        const storedPriceList = await AsyncStorage.getItem('PriceList');
        if (storedPriceList) {
          setPriceList(storedPriceList);
          setPriceListName(priceListMap[parseInt(storedPriceList)] || 'MRP');
        }
      } catch (error) {
        console.error('Error loading price list:', error);
      }
    };
    loadPriceList();
  }, []);

  // Utility functions
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const generateUniqueRandomNumber = () => {
    let randomNumber;
    do {
      randomNumber = Math.floor(Math.random() * 999999) + 1;
    } while (usedNumbers.has(randomNumber));
    usedNumbers.add(randomNumber);
    return randomNumber;
  };

  // Enhanced price handling
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

  const getPriceForProduct = (product) => {
    const priceInfo = filteredPrices.find(p => p.itemCode === product.code);
    return priceInfo ? priceInfo.price : null;
  };

  const currentEntriesWithPrices = useMemo(() => {
    const priceMap = new Map(
      filteredPrices.map(price => [price.itemCode, price.price])
    );
    
    return filteredProducts.map(product => ({
      ...product,
      sapPrice: priceMap.get(product.code) || 'Not Available',
    }));
  }, [filteredProducts, filteredPrices]);

  // Pagination
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = currentEntriesWithPrices.slice(
    indexOfFirstEntry,
    indexOfLastEntry
  );
  const totalPages = Math.ceil(currentEntriesWithPrices.length / entriesPerPage);

  // Enhanced cart animation
  const animateAddToCart = (productId) => {
    // Create unique animation for each product
    if (!cardAnimations[productId]) {
      cardAnimations[productId] = new Animated.Value(0);
    }
    
    const animation = cardAnimations[productId];
    
    // Bounce effect
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

    // Cart bounce animation
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
  };

  const handleAddToCart = async (product) => {
    try {
      const quantity = quantities[product.id] || 1;
      const color = colors[product.id] || '';
      const suctionType = suctionTypes[product.id] || '';
      const remark = remarks[product.id] || '';
      const uniqueNumber = generateUniqueRandomNumber();
      const productImageURL = `${productbaseURL}${product.image?.trim()}`;
      
      const productToAdd = {
        ...product,
        quantity,
        color,
        suctionType,
        remarks: remark,
        uniqueNumber,
        image: productImageURL,
      };
      
      animateAddToCart(product.id);
      await addToCart(productToAdd);
      
      // Show success feedback
      Alert.alert(
        '✅ Added to Cart',
        `${product.name} has been added to your cart.`,
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    }
  };

  const handleQuantityChange = (productId, value) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, parseInt(value) || 1),
    }));
  };

  const handleColorChange = (productId, color) => {
    setColors(prev => ({
      ...prev,
      [productId]: color,
    }));
  };

  const handleSuctionTypeChange = (productId, suctionType) => {
    setSuctionTypes(prev => ({
      ...prev,
      [productId]: suctionType,
    }));
  };

  const handleRemarksChange = (productId, text) => {
    setRemarks(prev => ({
      ...prev,
      [productId]: text,
    }));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear cache and fetch fresh data
      await AsyncStorage.multiRemove(Object.values(CACHE_KEYS));
      await fetchAndCacheData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedCompany(null);
    setSearchQuery('');
  };

  // Handle dealer change and update prices
  const handleDealerChange = (dealerData) => {
    setSelectedDealer(dealerData);
  };

  const handlePriceListUpdate = async (newPriceList, newPriceListName) => {
    try {
      setPriceList(newPriceList);
      setPriceListName(priceListMap[parseInt(newPriceList)] || 'MRP');
      const itemCodes = allProducts.map(product => product.code);
      await fetchSapData(itemCodes);
    } catch (error) {
      console.error('Error updating price list:', error);
    }
  };

  // Updated renderAnimatedHeader function
const renderAnimatedHeader = () => (
  <Animated.View 
    style={[
      styles.header, 
      { 
        opacity: headerOpacity,
        transform: [{ translateY: headerTransform }]
      }
    ]}
  >
    <View style={styles.headerGradient}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#475569" />
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
          >
            <Ionicons name="bag-outline" size={22} color="#fff" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>0</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  </Animated.View>
);

// Updated renderEnhancedSearchAndFilters function
const renderEnhancedSearchAndFilters = () => (
  <Animated.View 
    style={[
      styles.searchAndFiltersContainer,
      { opacity: searchBarOpacity }
    ]}
  >
    {/* Enhanced Search Bar */}
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Feather name="search" size={20} color="#6366f1" style={styles.searchIcon} />
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
            <Ionicons name="close-circle" size={20} color="#6366f1" />
          </TouchableOpacity>
        )}
      </View>
    </View>

    {/* Compact Filters Row */}
    <View style={styles.filtersRow}>
      <View style={styles.filtersScrollContainer}>
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
            <Feather name="filter" size={16} color="#6366f1" />
            <Text style={styles.filterButtonText}>Filters</Text>
          </TouchableOpacity>
          
          {/* Sort Options */}
          {[
            { key: 'name', label: 'Name' },
            { key: 'price', label: 'Price' },
            { key: 'company', label: 'Brand' },
            { key: 'popularity', label: 'Popular' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.sortButton,
                sortBy === item.key && styles.sortButtonActive
              ]}
              onPress={() => setSortBy(item.key)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === item.key && styles.sortButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
  </Animated.View>
);

// Updated renderProductCard function (removed Best Price badge)
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
        {/* Product Image */}
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: `${productbaseURL}${item.image}` }}
            style={viewMode === 'grid' ? styles.productImage : styles.productImageList}
            resizeMode="contain"
          />
          <View style={styles.productCodeBadge}>
            <Text style={styles.productCodeText}>{item.code}</Text>
          </View>
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productBrand}>{item.company}</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>
              {item.sapPrice && item.sapPrice !== 'Not Available'
                ? formatCurrency(item.sapPrice)
                : formatCurrency(200000)}
            </Text>
            {item.sapPrice && item.sapPrice !== 'Not Available' && (
              <Text style={styles.originalPrice}>
                {formatCurrency(250000)}
              </Text>
            )}
          </View>

          {/* Enhanced Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.id, (quantities[item.id] || 1) - 1)}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={16} color="#6366f1" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantities[item.id] || 1}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.id, (quantities[item.id] || 1) + 1)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(item)}
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

// Updated renderProductModal function with enhanced styling
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
            {/* Product Image */}
            <View style={styles.modalImageContainer}>
              <Image
                source={{ uri: `${productbaseURL}${selectedProduct.image}` }}
                style={styles.modalProductImage}
                resizeMode="contain"
              />
            </View>

            {/* Product Info */}
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
                  {selectedProduct.sapPrice && selectedProduct.sapPrice !== 'Not Available'
                    ? formatCurrency(selectedProduct.sapPrice)
                    : formatCurrency(200000)}
                </Text>
                {selectedProduct.sapPrice && selectedProduct.sapPrice !== 'Not Available' && (
                  <Text style={styles.modalOriginalPrice}>
                    {formatCurrency(250000)}
                  </Text>
                )}
              </View>

              {/* Quantity Selection */}
              <View style={styles.modalOptionContainer}>
                <Text style={styles.modalOptionLabel}>Quantity</Text>
                <View style={styles.modalQuantityContainer}>
                  <TouchableOpacity
                    style={styles.modalQuantityButton}
                    onPress={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) - 1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="minus" size={20} color="#6366f1" />
                  </TouchableOpacity>
                  <View style={styles.modalQuantityDisplay}>
                    <Text style={styles.modalQuantityText}>{quantities[selectedProduct.id] || 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalQuantityButton}
                    onPress={() => handleQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) + 1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={20} color="#6366f1" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Color Options */}
              {renderColorOptions(selectedProduct)}

              {/* Suction Type Options */}
              {renderSuctionTypeOptions(selectedProduct)}

              {/* Remarks */}
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

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <View style={styles.modalFooterPricing}>
              <Text style={styles.modalFooterLabel}>Total Price</Text>
              <Text style={styles.modalFooterPrice}>
                {selectedProduct.sapPrice && selectedProduct.sapPrice !== 'Not Available'
                  ? formatCurrency(selectedProduct.sapPrice * (quantities[selectedProduct.id] || 1))
                  : formatCurrency(200000 * (quantities[selectedProduct.id] || 1))}
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

// Updated renderFilterModal function
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
        <View style={styles.filterModalSection}>
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(value) => {
              setSelectedCategory(value);
              setSelectedCompany(null);
            }}
          />
        </View>

        <View style={styles.filterModalSection}>
          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={(value) => {
              setSelectedCompany(value);
              setSelectedCategory(null);
            }}
          />
        </View>
      </ScrollView>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={styles.modalApplyButton}
          onPress={() => setShowFilterModal(false)}
          activeOpacity={0.9}
        >
          <Text style={styles.modalApplyText}>
            Apply Filters ({filteredProducts.length} items)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);





  const renderActiveFilters = () => {
    const hasFilters = selectedCategory || selectedCompany;
    
    if (!hasFilters) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.activeFiltersContent}>
            {selectedCategory && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Category: {selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                  <Ionicons name="close" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCompany && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>Brand: {selectedCompany}</Text>
                <TouchableOpacity onPress={() => setSelectedCompany(null)}>
                  <Ionicons name="close" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
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
      <View style={styles.optionContainer}>
        <Text style={styles.optionLabel}>Suction Type</Text>
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
        <View style={styles.optionContainer}>
          <Text style={styles.optionLabel}>Color</Text>
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
        <View style={styles.optionContainer}>
          <Text style={styles.optionLabel}>Color</Text>
          <View style={styles.modernPickerContainer}>
            <Picker
              selectedValue={colors[product.id] || ''}
              onValueChange={(value) => handleColorChange(product.id, value)}
              style={styles.modernPicker}
            >
              <Picker.Item label="Select Color" value="" />
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


 

 

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <Feather name="chevron-left" size={20} color={currentPage === 1 ? '#ccc' : '#667eea'} />
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
          <Feather name="chevron-right" size={20} color={currentPage === totalPages ? '#ccc' : '#667eea'} />
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
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Loading products...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <DealerSelection
          onDealerChange={handleDealerChange}
          onPriceListUpdate={handlePriceListUpdate}
        />

        {renderEnhancedSearchAndFilters()}
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
              key={viewMode} // Force re-render when view mode changes
              contentContainerStyle={styles.productsList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#667eea"
                  colors={['#667eea']}
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
                    setIsScrolling(currentScrollY > 0);
                  }
                }
              )}
              scrollEventThrottle={16}
            />
            {renderPagination()}
          </>
        )}
      </Animated.View>

      {renderProductModal()}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  // Enhanced Header Styles
  header: {
    elevation: 0,
    shadowColor: 'transparent',
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Main Content
  mainContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Enhanced Search & Filters
  searchAndFiltersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
    color: '#6366f1',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },

  // Compact Filters Row
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filtersScrollContainer: {
    flex: 1,
  },
  filtersScrollContent: {
    paddingRight: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sortButtonText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewModeButton: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  viewModeButtonActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Active Filters
  activeFiltersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#6366f1',
    marginRight: 6,
    fontWeight: '600',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },

  // Products List
  productsList: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },

  // Enhanced Product Cards
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  productCardLeft: {
    marginRight: 8,
    flex: 1,
  },
  productCardRight: {
    marginLeft: 8,
    flex: 1,
  },
  productCardList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  productCardContent: {
    overflow: 'hidden',
    borderRadius: 20,
    flex: 1,
  },
  productImageContainer: {
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productImageList: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  productCodeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backdropFilter: 'blur(10px)',
  },
  productCodeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productInfo: {
    padding: 16,
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: -0.5,
  },
  originalPrice: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 8,
    fontWeight: '500',
  },

  // Enhanced Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  // Enhanced Pagination
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paginationButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationButtonDisabled: {
    opacity: 0.4,
  },
  paginationInfo: {
    alignItems: 'center',
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  paginationSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },

  // Enhanced Empty State
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8fafc',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  emptyStateClearButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateClearText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Enhanced Loading State
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 20,
    fontWeight: '600',
  },

  // Enhanced Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
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
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalImageContainer: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 8,
  },
  modalProductImage: {
    width: SCREEN_WIDTH * 0.8,
    height: 280,
    borderRadius: 20,
  },
  modalProductInfo: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modalBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalProductBrand: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalProductCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalProductCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  modalProductName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalProductPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -1,
  },
  modalOriginalPrice: {
    fontSize: 18,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginLeft: 12,
    fontWeight: '600',
  },
  modalOptionContainer: {
    marginBottom: 24,
  },
  modalOptionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modalQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalQuantityButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalQuantityDisplay: {
    marginHorizontal: 24,
    minWidth: 60,
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  modalQuantityText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalRemarksInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 100,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  modalFooterPricing: {
    flex: 1,
  },
  modalFooterLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFooterPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  modalAddToCartButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    marginLeft: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalAddToCartText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalApplyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalApplyText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  filterModalSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Enhanced Option Components
  optionContainer: {
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  modernPickerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernPicker: {
    height: 56,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },

  // Add some custom button styles for enhanced interactions
  enhancedButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
  enhancedButtonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Add ripple effect containers
  rippleContainer: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  rippleEffect: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
  },
});

export default PurchasePage;
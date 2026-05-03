// app/(tabs)/order-details/[id].jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  StatusBar,
  SafeAreaView,
  Modal,
  Image,
  Alert,
  Dimensions,
  Share,
  Platform,
  TextInput
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import CacheManager from '@/utils/cacheManager';
import { getGstRate, toPostTax } from '@/utils/taxHelper';

const { width, height } = Dimensions.get('window');

let taxCodeCache = {};

// Helper function to get field value with multiple possible field names
const getFieldValue = (obj, ...fieldNames) => {
  for (const fieldName of fieldNames) {
    if (obj && obj[fieldName] !== undefined && obj[fieldName] !== null) {
      return obj[fieldName];
    }
  }
  return null;
};

// Helper function to calculate pending amount
const getPendingAmount = (orderDetails) => {
  const total = getFieldValue(orderDetails, 'total_amount', 'Total') || 0;
  // Calculate from DownPayments array if available
  const downPayments = orderDetails?.DownPayments;
  const paid = downPayments && downPayments.length > 0
    ? downPayments.reduce((sum, payment) => sum + payment, 0)
    : (getFieldValue(orderDetails, 'paid_amount', 'Advance') || 0);
  return total - paid;
};

// Helper function to get total down payment from array
const getTotalDownPayment = (orderDetails) => {
  const downPayments = orderDetails?.DownPayments;
  return downPayments && downPayments.length > 0
    ? downPayments.reduce((sum, payment) => sum + payment, 0)
    : (getFieldValue(orderDetails, 'paid_amount', 'Advance') || 0);
};

// Helper function to clean up address formatting
const cleanAddress = (address) => {
  if (!address) return '';
  
  // Remove \r characters and excessive whitespace
  let cleaned = address.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Remove duplicated parts (simple deduplication by checking for exact matches)
  const lines = cleaned.split(' ');
  const uniqueWords = [];
  let lastWord = '';
  
  for (const word of lines) {
    if (word.toLowerCase() !== lastWord.toLowerCase() && word.length > 0) {
      uniqueWords.push(word);
      lastWord = word;
    }
  }
  
  return uniqueWords.join(' ');
};

// Helper function to parse address components
const parseAddress = (address) => {
  if (!address) return { address: 'N/A', city: 'N/A', state: 'N/A', pincode: 'N/A' };
  
  const cleaned = cleanAddress(address);
  
  // Try to extract pincode (6 digits)
  const pincodeMatch = cleaned.match(/(\d{6})/);
  const pincode = pincodeMatch ? pincodeMatch[1] : 'N/A';
  
  // Try to extract state (typically 2-letter codes like IN, KA, etc. or full state names)
  const stateMatch = cleaned.match(/\b(IN|KA|TN|AP|MH|DL|UP|WB|RJ|GJ|MP|PB|HR|JH|OR|AS|UK|HP|JK|GA|MN|ML|MZ|NL|SK|TR|AR)\b/i);
  const state = stateMatch ? stateMatch[1] : 'Karnataka'; // Default based on Bangalore
  
  // Extract city (usually comes before pincode)
  let city = 'N/A';
  if (cleaned.includes('Bangalore')) {
    city = 'Bangalore';
  } else {
    // Try to find a city name before the pincode
    const beforePincode = cleaned.split(pincode)[0];
    const words = beforePincode.trim().split(' ');
    city = words[words.length - 1] || 'N/A';
  }
  
  return {
    address: cleaned,
    city,
    state,
    pincode
  };
};

const OrderDetailsScreen = () => {
  const params = useLocalSearchParams();
  
  // Fix: Extract ID properly and handle array case + remove brackets
  const rawId = params.id;
  let id = Array.isArray(rawId) ? rawId[0] : rawId;
  
  // Remove square brackets if present in the string
  if (typeof id === 'string') {
    id = id.replace(/^\[/, '').replace(/\]$/, '');
  }
  
  console.log('🔍 Raw params received:', JSON.stringify(params, null, 2));
  console.log('🔍 Raw ID:', rawId);
  console.log('🔍 Processed ID:', id);
  
  const [orderDetails, setOrderDetails] = useState(null);
  const [productDetails, setProductDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [sapProducts, setSapProducts] = useState([]);
  const [sapOrderData, setSapOrderData] = useState(null);
  const [taxCodesLoaded, setTaxCodesLoaded] = useState(Object.keys(taxCodeCache).length > 0);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reuploadPayId, setReuploadPayId] = useState('');
  const [reuploadFile, setReuploadFile] = useState(null);
  const [isReuploading, setIsReuploading] = useState(false);
  const [reuploadModalVisible, setReuploadModalVisible] = useState(false);

  console.log("Raw params:", params);
  console.log("Extracted ID:", id);

  useEffect(() => {
    if (Object.keys(taxCodeCache).length === 0) {
      fetch('https://api.chesadentalcare.com/products_all')
        .then(res => res.json())
        .then(products => {
          products.forEach(p => { taxCodeCache[p.code] = p.taxcode; });
          setTaxCodesLoaded(true);
        })
        .catch(err => console.error('Error fetching product catalog:', err));
    }
  }, []);

  // Check payment rejection status
  useEffect(() => {
    if (!id) return;
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`https://api.chesadentalcare.com/order_receipt/?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data[0]) {
            setPaymentStatus(data[0].payment_status || 'pending');
            setRejectionReason(data[0].rejection_reason || '');
          }
        }
      } catch (err) {
        // silently fail
      }
    };
    checkPaymentStatus();
  }, [id]);

  const handleReupload = async () => {
    if (!reuploadPayId.trim()) {
      Alert.alert('Error', 'Please enter a Payment ID');
      return;
    }
    setIsReuploading(true);
    try {
      const formData = new FormData();
      formData.append('order_id', id);
      formData.append('pay_id', reuploadPayId.trim());
      if (reuploadFile) {
        formData.append('file', {
          uri: Platform.OS === 'ios' ? reuploadFile.uri.replace('file://', '') : reuploadFile.uri,
          name: reuploadFile.name || 'receipt.jpg',
          type: reuploadFile.mimeType || 'image/jpeg',
        });
      }
      const res = await fetch('https://api.chesadentalcare.com/reupload_receipt', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await res.json();
      if (result.success) {
        setPaymentStatus('pending');
        setRejectionReason('');
        setReuploadModalVisible(false);
        setReuploadPayId('');
        setReuploadFile(null);
        Alert.alert('Success', 'Payment proof re-uploaded successfully');
      } else {
        Alert.alert('Error', 'Failed to re-upload receipt');
      }
    } catch (err) {
      Alert.alert('Error', `Failed to re-upload: ${err.message}`);
    } finally {
      setIsReuploading(false);
    }
  };

  const pickReuploadFile = async () => {
    try {
      const result = await require('expo-document-picker').getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setReuploadFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  // Status definitions (must be defined before animations that use them)
  const statusSequence = [
    'Order Placed',
    'Confirm',
    'In Production',
    'Dispatched',
    'Delivered',
    'Installation Completed'
  ];

  // Keys are lowercase for case-insensitive lookup
  const statusMapping = {
    'order placed': 'Order Placed',
    'advance received': 'Confirm',
    'job card issued': 'In Production',
    'dispatched': 'Dispatched',
    'delivered': 'Delivered',
    'installation completed': 'Installation Completed',
    'waiting': 'Order Placed',
    'approved for dispatch': 'Dispatched',
    'in production': 'In Production',
    'confirm': 'Confirm',
    'open': 'Order Placed',
  };

  const mapStatus = (raw) => {
    if (!raw) return 'Order Placed';
    return statusMapping[raw.toLowerCase()] || 'Order Placed';
  };

  const progressMapping = {
    'Order Placed': 18,
    'Confirm': 34,
    'In Production': 51,
    'Dispatched': 67,
    'Delivered': 83,
    'Installation Completed': 100,
  };

  // Animation values (defined after statusSequence)
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) {
      console.error('❌ No ID provided');
      Alert.alert('Error', 'Invalid order ID');
      return;
    }

    console.log(`🔍 Loading order details for ID: ${id}`);
    console.log(`🔍 ID type: ${typeof id}`);
    fetchOrderDetails();
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Start pulsing animation for active step
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      )
    ]).start();
  }, [id]);

  // Re-animate progress bar when order data changes
  useEffect(() => {
    const status = productDetails[0]?.status || orderDetails?.status;
    if (status) {
      animateProgress(status);
    }
  }, [productDetails, orderDetails]);

  const fetchOrderDetails = async () => {
    if (!id) {
      console.error('❌ No ID provided to fetchOrderDetails');
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🔍 Starting fetch for order ID: ${id}`);
      
      const cached = await CacheManager.getCache(`order_${id}`);
      if (cached) {
        console.log(`📦 Using cached order details for ${id}`);
        console.log('📦 Cached order:', cached.order);
        console.log('📦 Cached products:', cached.products);
        setOrderDetails(cached.order);
        setProductDetails(cached.products || []);
        setIsLoading(false);
        animateProgress(cached.order?.status);
        return;
      }

      console.log(`🌐 Fetching order details for ${id} from API`);
      console.log(`🔗 Order API URL: https://api.chesadentalcare.com/order_detail/?id=${id}`);
      console.log(`🔗 Product API URL: https://api.chesadentalcare.com/idv_update?id=${id}`);
      
      // Add timeout and better error handling
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      // Follow the web version pattern: Always try both endpoints
      const fetchPromises = Promise.all([
        fetch(`https://api.chesadentalcare.com/order_detail/?id=${id}`),
        fetch(`https://api.chesadentalcare.com/idv_update?id=${id}`)
      ]);

      const [orderResponse, productResponse] = await Promise.race([
        fetchPromises,
        timeoutPromise
      ]);

      console.log('📊 Order response status:', orderResponse.status);
      console.log('📊 Product response status:', productResponse.status);

      let orderData, productData = [];

      // Handle order response
      if (orderResponse.ok) {
        orderData = await orderResponse.json();
        console.log('✅ Order details fetched successfully');
      } else {
        // Fallback to all_orders endpoint only if order_detail fails
        console.log('🔄 Order detail failed, trying fallback...');
        
        try {
          const allOrdersResponse = await Promise.race([
            fetch('https://api.chesadentalcare.com/get_all_orders'),
            timeoutPromise
          ]);
          
          if (allOrdersResponse.ok) {
            const allOrders = await allOrdersResponse.json();
            console.log(`📊 Found ${allOrders.length} total orders`);
            
            const matchingOrder = allOrders.find(order => 
              order.OrderNumber?.toString() === id.toString() || 
              order.OrderID?.toString() === id.toString() ||
              order.id?.toString() === id.toString()
            );
            
            if (matchingOrder) {
              console.log('✅ Found matching order in all_orders:', matchingOrder.OrderNumber || matchingOrder.OrderID);

              // Resolve MySQL data (billing, phone, email, etc.) via sapcopy2 lookup
              try {
                const mysqlResponse = await fetch(`https://api.chesadentalcare.com/get_orderId?ids=${id}`);
                if (mysqlResponse.ok) {
                  const mysqlData = await mysqlResponse.json();
                  if (mysqlData && mysqlData.length > 0) {
                    console.log('✅ Resolved MySQL data for SAP order, MySQL id:', mysqlData[0].id);
                    // MySQL first, SAP on top — SAP fields (Total, OrderStatus, etc.) win,
                    // MySQL-only fields (bname, phone, email, etc.) come through
                    orderData = [{ ...mysqlData[0], ...matchingOrder }];

                    // Re-fetch products with correct MySQL id
                    const mysqlId = mysqlData[0].id;
                    try {
                      const productRetry = await fetch(`https://api.chesadentalcare.com/idv_update?id=${mysqlId}`);
                      if (productRetry.ok) {
                        const retryData = await productRetry.json();
                        if (Array.isArray(retryData) && retryData.length > 0) {
                          productData = retryData;
                          console.log(`✅ Re-fetched ${retryData.length} products using MySQL id ${mysqlId}`);
                        }
                      }
                    } catch (e) {
                      console.warn('⚠️ Product re-fetch with MySQL id failed:', e.message);
                    }
                  } else {
                    orderData = [matchingOrder];
                  }
                } else {
                  orderData = [matchingOrder];
                }
              } catch (e) {
                console.warn('⚠️ Could not resolve MySQL data for SAP order:', e.message);
                orderData = [matchingOrder];
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ All orders endpoint failed:', error.message);
        }
      }

      // Handle product response (like web version)
      if (productResponse.ok) {
        const respData = await productResponse.json();
        // Only use if we got actual data (not an error string) and don't already have re-fetched products
        if (Array.isArray(respData) && respData.length > 0 && (!productData || productData.length === 0)) {
          productData = respData;
          console.log(`✅ Product details fetched: ${productData.length} products`);
        }
      } else if (!productData || productData.length === 0) {
        console.warn('⚠️ Product API failed, will extract from order data if available');
      }

      // Final validation
      if (!orderData || (Array.isArray(orderData) && orderData.length === 0)) {
        throw new Error('Order not found in any available endpoint');
      }

      console.log(`✅ Final order data:`, JSON.stringify(orderData, null, 2));
      console.log(`✅ Final product data:`, JSON.stringify(productData, null, 2));

      const orderRecord = Array.isArray(orderData) ? orderData[0] : orderData;
      let productRecords = [];

      // Priority 1: Use dedicated product API response (like web version)
      if (productData && Array.isArray(productData) && productData.length > 0) {
        productRecords = productData;
        console.log(`📦 Using ${productRecords.length} products from product API`);
      }
      // Priority 2: Check if order has grouped products (from AllOrdersTab)
      else if (orderRecord?.products && Array.isArray(orderRecord.products)) {
        productRecords = orderRecord.products.map(product => ({
          product_name: product.ProductName || product.product_name || 'Unknown Product',
          product_price: product.ProductPrice || product.product_price || 0,
          qty: product.Quantity || product.qty || 1,
          specification: product.Specification || product.specification || '',
          color: product.Color || product.color || '',
          discount: product.Discount || product.discount || 0,
          suction: product.Suction || product.suction || '',
          remarks: product.Remarks || product.remarks || ''
        }));
        console.log(`📦 Using ${productRecords.length} grouped products from order record`);
      }
      // Priority 3: Extract single product from order record
      else if (orderRecord) {
        const productInfo = {
          product_name: getFieldValue(orderRecord, 'ItemDescription', 'ProductName', 'product_name', 'ItemName') || 'Unknown Product',
          product_price: getFieldValue(orderRecord, 'LinePrice', 'ProductPrice', 'product_price', 'UnitPrice', 'Price') || 0,
          qty: getFieldValue(orderRecord, 'Quantity', 'qty', 'ItemQty') || 1,
          specification: getFieldValue(orderRecord, 'Specification', 'specification', 'ItemSpec') || '',
          color: getFieldValue(orderRecord, 'Color', 'color', 'ItemColor') || '',
          discount: getFieldValue(orderRecord, 'Discount', 'discount') || 0,
          suction: getFieldValue(orderRecord, 'Suction', 'suction') || '',
          remarks: getFieldValue(orderRecord, 'Remarks', 'remarks') || '',
          status: getFieldValue(orderRecord, 'OrderStatus', 'status', 'Status', 'LineStatus') || 'Unknown'
        };
        
        productRecords.push(productInfo);
        console.log('📦 Extracted single product from order record');
        console.log('📦 Product info extracted:', productInfo);
      }
      
      // Additional validation
      if (!orderRecord) {
        throw new Error('Invalid order data structure');
      }

      console.log('✅ Processed order record:', orderRecord);
      console.log('✅ Processed product records:', productRecords);

      // Cache the data
      try {
        await CacheManager.setCache(`order_${id}`, {
          order: orderRecord,
          products: productRecords
        });
        console.log('📦 Successfully cached order and product data');
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache data:', cacheError);
      }
      console.log("📦 Final orderRecord:", JSON.stringify(orderRecord, null, 2));
      console.log("📦 Final productRecords:", JSON.stringify(productRecords, null, 2));
      
      // Debug the specific fields we're trying to access
      console.log("🔍 Order fields debug:");
      const totalAmount = getFieldValue(orderRecord, 'total_amount', 'Total');
      const paidAmount = getFieldValue(orderRecord, 'paid_amount', 'Advance');
      const pendingAmount = totalAmount && paidAmount ? totalAmount - paidAmount : null;
      console.log("  - total_amount:", totalAmount);
      console.log("  - paid_amount:", paidAmount);
      console.log("  - pending_amount (calculated):", pendingAmount);
      console.log("  - name:", getFieldValue(orderRecord, 'name', 'CustomerName'));
      console.log("  - address:", getFieldValue(orderRecord, 'address', 'Address'));
      console.log("  - order_date:", getFieldValue(orderRecord, 'order_date', 'OrderDate'));
      
      console.log("🔍 Product fields debug:");
      if (productRecords[0]) {
        console.log("  - product_name:", productRecords[0].product_name);
        console.log("  - product_price:", productRecords[0].product_price);
        console.log("  - status:", productRecords[0].status);
        console.log("  - suction:", productRecords[0].suction);
        console.log("  - qty:", productRecords[0].qty);
        console.log("  - discount:", productRecords[0].discount);
        console.log("  - color:", productRecords[0].color);
      }
      // Resolve SalesEmp numeric code to employee name
      if (orderRecord?.SalesEmp && !orderRecord?.exe_name) {
        try {
          const empResponse = await fetch('https://api.chesadentalcare.com/sales_employees_info');
          if (empResponse.ok) {
            const empData = await empResponse.json();
            const match = empData.find(e => Number(e.id) === Number(orderRecord.SalesEmp));
            if (match) {
              orderRecord.exe_name = match.bname || match.username;
              console.log('✅ Resolved SalesEmp', orderRecord.SalesEmp, '->', orderRecord.exe_name);
            }
          }
        } catch (e) {
          console.warn('⚠️ Could not resolve sales employee name:', e.message);
        }
      }

      // Set order status like web version does - status comes from productDetails[0]
      const orderStatus = productRecords[0]?.status || orderRecord?.status;
      const mappedStatus = mapStatus(orderStatus);
      console.log('📊 Order status mapping:', orderStatus, '->', mappedStatus);

      setOrderDetails(orderRecord);
      setProductDetails(productRecords);
      
      // Fetch SAP order data for post-tax prices
      if (orderRecord?.OrderNumber) {
        try {
          const sapResponse = await fetch(`https://api.chesadentalcare.com/fetch_order_by_docnum/${orderRecord.OrderNumber}`);
          if (sapResponse.ok) {
            const sapData = await sapResponse.json();
            setSapOrderData(sapData);
            
            if (sapData?.DocumentLines) {
              const documentLines = sapData.DocumentLines.map(line => {
                let taxPercentage = 0;
                if (line.TaxCode) {
                  const match = line.TaxCode.match(/-(\d+)/);
                  if (match) taxPercentage = parseFloat(match[1]);
                }
                const lineTotal = line.LineTotal || 0;
                const taxAmount = (lineTotal * taxPercentage) / 100;
                const linePriceAfterTax = lineTotal + taxAmount;
                
                return {
                  ItemDescription: line.ItemDescription,
                  Quantity: line.Quantity,
                  LinePrice: lineTotal,
                  TaxPercentage: taxPercentage,
                  TaxAmount: taxAmount,
                  LinePriceAfterTax: linePriceAfterTax,
                  Color: line.U_SBS_COLOR
                };
              });
              setSapProducts(documentLines);
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch SAP order data:', error);
        }
      }
      
      animateProgress(orderStatus);
      
      console.log('✅ Order details set successfully');
    } catch (error) {
      console.error('❌ Error fetching order details:', error.message);
      console.error('❌ Full error:', error);
      console.error('❌ Error stack:', error.stack);
      
      // More specific error messages
      let errorMessage = 'Failed to fetch order details';
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Order not found. Please verify the order ID.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response from server. Please try again.';
      }
      
      Alert.alert('Error', `${errorMessage}\n\nOrder ID: ${id}\nError: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (status) => {
    if (!status) {
      console.warn('⚠️ No status provided for progress calculation');
      return 0;
    }

    const mappedStatus = mapStatus(status);
    const currentIndex = statusSequence.indexOf(mappedStatus);
    const progressPercentage = ((currentIndex + 1) / statusSequence.length) * 100;
    
    console.log(`📊 Progress calculation: ${status} -> ${mappedStatus} -> ${progressPercentage}%`);
    return progressPercentage;
  };

  const animateProgress = (status) => {
    if (!status) {
      console.warn('⚠️ No status provided for progress animation');
      return;
    }

    const progressPercentage = getProgressPercentage(status);
    const progress = progressPercentage / 100;
    
    // Simple progress bar animation
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  };

  const handleViewReceipt = async () => {
    if (!id) {
      Alert.alert('Error', 'Invalid order ID');
      return;
    }

    try {
      console.log(`🧾 Fetching receipt for order ${id}`);
      const response = await fetch(`https://api.chesadentalcare.com/order_receipt/?id=${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Receipt API error:', errorText);
        throw new Error(`Failed to fetch receipt: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📄 Receipt data:', data);
      
      // Match web logic exactly
      const receipt = data[0];
      if (receipt && receipt.pay_rcpt) {
        const baseURL = 'https://chesadentalcare.com/possystem/admin/admin/uploads/receipt/';
        const fullReceiptUrl = `${baseURL}${receipt.pay_rcpt}`;
        console.log('🔗 Receipt URL:', fullReceiptUrl);
        
        // Store receipt details like web version
        setReceiptDetails({
          pay_id: receipt.pay_id,
          pay_rcpt: receipt.pay_rcpt,
          receiptUrl: fullReceiptUrl
        });
        setReceiptUrl(fullReceiptUrl);
        setReceiptModalVisible(true);
      } else {
        throw new Error('Receipt data is not in the expected format.');
      }
    } catch (error) {
      console.error('❌ Error loading receipt:', error);
      Alert.alert('Error', `Error fetching receipt details: ${error.message}`);
    }
  };

  const handleShareOrder = async () => {
    if (!orderDetails || !id) {
      Alert.alert('Error', 'Order details not available');
      return;
    }

    try {
      const shareContent = {
        message: `Order Details - #${id}\nCustomer: ${orderDetails?.name || 'N/A'}\nTotal: ₹${orderDetails?.total_amount?.toLocaleString() || '0'}\nStatus: ${orderDetails?.status || 'Unknown'}`,
        title: `Order #${id} Details`
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('❌ Error sharing order:', error);
      // Share errors are usually not critical, so we don't show an alert
    }
  };

  const handleCloseReceiptModal = () => {
    setReceiptModalVisible(false);
    setReceiptDetails(null);
    setReceiptUrl('');
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getProgressIcon = (step) => {
    const icons = {
      'Order Placed': 'bag-handle',
      'Confirm': 'checkmark',
      'In Production': 'build',
      'Dispatched': 'car',
      'Delivered': 'cube',
      'Installation Completed': 'construct'
    };
    return icons[step] || 'ellipse';
  };

  const getStatusColor = (status) => {
    if (!status) return '#6b7280';
    const key = status.toLowerCase();
    const colors = {
      'delivered': '#10b981',
      'dispatched': '#3b82f6',
      'waiting': '#ef4444',
      'job card issued': '#8b5cf6',
      'approved for dispatch': '#06b6d4',
      'advance received': '#f59e0b',
      'installation completed': '#10b981',
      'order placed': '#f59e0b',
      'in production': '#8b5cf6',
      'confirm': '#10b981',
      'open': '#f59e0b',
    };
    return colors[key] || '#6b7280';
  };

  const getActiveStepIndex = () => {
    const orderStatus = productDetails[0]?.status || orderDetails?.status;
    const mapped = mapStatus(orderStatus);
    const idx = statusSequence.indexOf(mapped);
    return idx >= 0 ? idx : 0;
  };

  const ProgressTracker = () => {
    const activeStepIndex = getActiveStepIndex();
    const orderStatus = productDetails[0]?.status || orderDetails?.status;
    const progressPercentage = getProgressPercentage(orderStatus);

    return (
      <View style={styles.trackingCard}>
        {/* Header */}
        <View style={styles.trackingHeader}>
          <View>
            <Text style={styles.trackingTitle}>Order Tracking</Text>
            <Text style={styles.trackingSubtitle}>
              {statusSequence[activeStepIndex] || mapStatus(orderStatus)}
            </Text>
          </View>
          <View style={[
            styles.trackingBadge,
            progressPercentage >= 100 && { backgroundColor: '#059669' },
          ]}>
            <Text style={styles.trackingBadgeText}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.trackingBarWrap}>
          <View style={styles.trackingBarBg}>
            <Animated.View
              style={[
                styles.trackingBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Vertical Timeline */}
        <View style={styles.timelineWrap}>
          {statusSequence.map((step, index) => {
            const isCompleted = index < activeStepIndex;
            const isCurrent = index === activeStepIndex;
            const isLast = index === statusSequence.length - 1;

            return (
              <View key={step} style={styles.tlRow}>
                {/* Left: circle + line */}
                <View style={styles.tlLeft}>
                  <Animated.View
                    style={[
                      styles.tlCircle,
                      isCompleted && styles.tlCircleCompleted,
                      isCurrent && styles.tlCircleCurrent,
                      isCurrent && { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Ionicons
                        name={getProgressIcon(step)}
                        size={13}
                        color={isCurrent ? '#fff' : '#cbd5e1'}
                      />
                    )}
                  </Animated.View>
                  {!isLast && (
                    <View
                      style={[
                        styles.tlLine,
                        isCompleted && styles.tlLineCompleted,
                      ]}
                    />
                  )}
                </View>

                {/* Right: text */}
                <View style={styles.tlContent}>
                  <Text
                    style={[
                      styles.tlStepName,
                      isCompleted && styles.tlStepNameDone,
                      isCurrent && styles.tlStepNameActive,
                    ]}
                  >
                    {step}
                  </Text>
                  <Text
                    style={[
                      styles.tlStatus,
                      isCompleted && styles.tlStatusDone,
                      isCurrent && styles.tlStatusActive,
                    ]}
                  >
                    {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.trackingFooter}>
          <View style={styles.trackingFooterItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.trackingFooterLabel}>Ordered</Text>
              <Text style={styles.trackingFooterValue}>
                {getFieldValue(orderDetails, 'order_date', 'OrderDate') || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.trackingFooterDivider} />
          <View style={styles.trackingFooterItem}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <View style={{ marginLeft: 6 }}>
              <Text style={styles.trackingFooterLabel}>Expected</Text>
              <Text style={styles.trackingFooterValue}>
                {getFieldValue(orderDetails, 'expect_date', 'ExpectedDispatchDate') || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading order details...</Text>
          <Text style={styles.loadingSubtext}>Order ID: {id}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if no order details and not loading
  if (!orderDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
          <Text style={styles.errorText}>Order not found</Text>
          <Text style={styles.errorSubtext}>Order ID: {id}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: '#10b981', marginTop: 10 }]}
            onPress={() => {
              setIsLoading(true);
              fetchOrderDetails();
            }}
          >
            <Text style={styles.backButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.detailsHeader}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.detailsTitle}>Order Details</Text>
          <Text style={styles.detailsSubtitle}>#{id}</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleShareOrder}
            style={styles.headerButton}
          >
            <Ionicons name="share" size={20} color="#3b82f6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleViewReceipt}
            style={styles.headerButton}
          >
            <Ionicons name="receipt" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
          <ProgressTracker />

          {/* Payment Rejected Banner */}
          {paymentStatus === 'rejected' && (
            <View style={styles.rejectedBanner}>
              <View style={styles.rejectedBannerHeader}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.rejectedBannerTitle}>Payment Rejected</Text>
              </View>
              <Text style={styles.rejectedBannerReason}>Reason: {rejectionReason}</Text>
              <TouchableOpacity
                style={styles.reuploadButton}
                onPress={() => setReuploadModalVisible(true)}
              >
                <Ionicons name="cloud-upload" size={16} color="#fff" />
                <Text style={styles.reuploadButtonText}>Re-upload Payment Proof</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Order Summary */}
          <View style={styles.orderInfoCard}>
            <View style={styles.orderTitleRow}>
              <Text style={styles.orderTitle}>Order #{id}</Text>
              <Text style={styles.orderDate}>
                {getFieldValue(orderDetails, 'order_date', 'OrderDate') || 'N/A'}
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <Text style={styles.currentStatusLabel}>Current Status:</Text>
              <Text style={[styles.currentStatus, { color: getStatusColor(productDetails[0]?.status || orderDetails?.status) }]}>
                {productDetails[0]?.status || orderDetails?.status || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.orderStatusTable}>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Total Amount (incl. GST)</Text>
                <Text style={styles.orderStatusValue}>
                  {formatCurrency(
                    sapProducts.length > 0
                      ? sapProducts.reduce((sum, p) => sum + (p.LinePriceAfterTax || 0), 0)
                      : productDetails.reduce((sum, p) => {
                          const taxcode = taxCodeCache[p.product_code] || '';
                          return sum + toPostTax(Number(p.product_price) || 0, taxcode) * (Number(p.qty) || 1);
                        }, 0) || getFieldValue(orderDetails, 'total_amount', 'Total')
                  )}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Advance Amount</Text>
                <Text style={[styles.orderStatusValue, { color: '#10b981' }]}>
                  {formatCurrency(getTotalDownPayment(orderDetails))}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Balance Amount</Text>
                <Text style={[styles.orderStatusValue, { color: '#ef4444' }]}>
                  {formatCurrency(
                    (sapProducts.length > 0
                      ? sapProducts.reduce((sum, p) => sum + (p.LinePriceAfterTax || 0), 0)
                      : productDetails.reduce((sum, p) => {
                          const taxcode = taxCodeCache[p.product_code] || '';
                          return sum + toPostTax(Number(p.product_price) || 0, taxcode) * (Number(p.qty) || 1);
                        }, 0) || getFieldValue(orderDetails, 'total_amount', 'Total')
                    ) - getTotalDownPayment(orderDetails)
                  )}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Grand Total (incl. GST)</Text>
                <Text style={[styles.orderStatusValue, { fontWeight: '700' }]}>
                  {formatCurrency(
                    sapProducts.length > 0
                      ? sapProducts.reduce((sum, p) => sum + (p.LinePriceAfterTax || 0), 0)
                      : productDetails.reduce((sum, p) => {
                          const taxcode = taxCodeCache[p.product_code] || '';
                          return sum + toPostTax(Number(p.product_price) || 0, taxcode) * (Number(p.qty) || 1);
                        }, 0) || getFieldValue(orderDetails, 'total_amount', 'Total')
                  )}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Order Status</Text>
                <Text style={[styles.orderStatusValue, { color: getStatusColor(productDetails[0]?.status || orderDetails?.status) }]}>
                  {productDetails[0]?.status || orderDetails?.status || 'Unknown'}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Log Type</Text>
                <Text style={styles.orderStatusValue}>
                  {productDetails[0]?.log_type || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={24} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Products ({productDetails.length})</Text>
            </View>

            {productDetails && productDetails.length > 0 ? (
              <View>
                {/* Product Cards */}
                {sapProducts.length > 0 ? sapProducts.map((product, index) => (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productCardHeader}>
                      <View style={styles.productCardIndexBadge}>
                        <Text style={styles.productCardIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.productCardName} numberOfLines={2}>
                        {product.ItemDescription}
                      </Text>
                    </View>
                    <View style={styles.productCardDivider} />
                    <View style={styles.productCardGrid}>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Qty</Text>
                        <Text style={styles.productCardValue}>{product.Quantity}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Color</Text>
                        <Text style={styles.productCardValue}>{product.Color || 'N/A'}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Pre-Tax</Text>
                        <Text style={styles.productCardValue}>{formatCurrency(product.LinePrice / product.Quantity)}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>GST</Text>
                        <Text style={styles.productCardValue}>{product.TaxPercentage}%</Text>
                      </View>
                    </View>
                    <View style={styles.productCardFooter}>
                      <View style={styles.productCardFooterItem}>
                        <Text style={styles.productCardFooterLabel}>Unit (Post-Tax)</Text>
                        <Text style={styles.productCardFooterValue}>{formatCurrency(product.LinePriceAfterTax / product.Quantity)}</Text>
                      </View>
                      <View style={styles.productCardFooterDivider} />
                      <View style={styles.productCardFooterItem}>
                        <Text style={styles.productCardFooterLabel}>Total</Text>
                        <Text style={styles.productCardFooterTotal}>{formatCurrency(product.LinePriceAfterTax)}</Text>
                      </View>
                    </View>
                  </View>
                )) : productDetails.map((product, index) => {
                  const taxcode = taxCodeCache[product.product_code] || '';
                  const gstRate = getGstRate(taxcode);
                  const preTax = Number(product.product_price) || 0;
                  const taxAmt = preTax * (gstRate / 100);
                  const postTax = preTax + taxAmt;
                  const qty = Number(product.qty) || 1;
                  return (
                  <View key={index} style={styles.productCard}>
                    <View style={styles.productCardHeader}>
                      <View style={styles.productCardIndexBadge}>
                        <Text style={styles.productCardIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.productCardName} numberOfLines={2}>
                        {product.product_name || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.productCardDivider} />
                    <View style={styles.productCardGrid}>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Qty</Text>
                        <Text style={styles.productCardValue}>{qty}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Color</Text>
                        <Text style={styles.productCardValue}>{product.color || 'N/A'}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>Pre-Tax</Text>
                        <Text style={styles.productCardValue}>{formatCurrency(preTax)}</Text>
                      </View>
                      <View style={styles.productCardGridItem}>
                        <Text style={styles.productCardLabel}>GST</Text>
                        <Text style={styles.productCardValue}>{gstRate}%</Text>
                      </View>
                    </View>
                    <View style={styles.productCardFooter}>
                      <View style={styles.productCardFooterItem}>
                        <Text style={styles.productCardFooterLabel}>Unit (Post-Tax)</Text>
                        <Text style={styles.productCardFooterValue}>{formatCurrency(postTax)}</Text>
                      </View>
                      <View style={styles.productCardFooterDivider} />
                      <View style={styles.productCardFooterItem}>
                        <Text style={styles.productCardFooterLabel}>Total</Text>
                        <Text style={styles.productCardFooterTotal}>{formatCurrency(postTax * qty)}</Text>
                      </View>
                    </View>
                  </View>
                  );
                })}

                {/* Additional Details */}
                {(productDetails.some(p => p.specification) || productDetails.some(p => p.remarks)) && (
                <View style={styles.additionalDetailsContainer}>
                  <Text style={styles.additionalDetailsTitle}>Additional Details</Text>

                  {productDetails.some(p => p.specification) && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Specifications:</Text>
                      <Text style={styles.detailValue}>
                        {productDetails
                          .map(p => p.specification)
                          .filter(spec => spec)
                          .join(', ') || 'N/A'}
                      </Text>
                    </View>
                  )}

                  {productDetails.some(p => p.remarks) && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Remarks:</Text>
                      <Text style={styles.detailValue}>
                        {productDetails
                          .map(p => p.remarks)
                          .filter(remark => remark)
                          .join(', ') || 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
                )}
              </View>
            ) : (
              <View style={styles.noProductsContainer}>
                <Ionicons name="cube-outline" size={40} color="#d1d5db" />
                <Text style={styles.noProductsText}>No products found</Text>
              </View>
            )}
          </View>

          {/* Additional Order Details - matching web version */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Additional Order Details</Text>
            </View>
            
            <View style={styles.orderStatusTable}>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Remarks</Text>
                <Text style={styles.orderStatusValue}>
                  {productDetails
                    .map((product) => product.remarks)
                    .filter((remark) => remark)
                    .join(", ") || "N/A"}
                </Text>
              </View>
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Order Status</Text>
                <Text style={[styles.orderStatusValue, { color: getStatusColor(productDetails[0]?.status || orderDetails?.status) }]}>
                  {productDetails[0]?.status || orderDetails?.status || 'Unknown'}
                </Text>
              </View>
              {/* <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Log Type</Text>
                <Text style={styles.orderStatusValue}>
                  {orderDetails?.log_type || 'N/A'}
                </Text>
              </View> */}
              <View style={styles.orderStatusRow}>
                <Text style={styles.orderStatusLabel}>Specifications</Text>
                <Text style={styles.orderStatusValue}>
                  {productDetails
                    .map((product) => product.specification)
                    .filter((spec) => spec)
                    .join(", ") || "N/A"}
                </Text>
              </View>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.addressContainer}>
            {/* Shipping Address */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Ionicons name="location-outline" size={24} color="#3b82f6" />
                <Text style={styles.addressTitle}>Shipping Address</Text>
              </View>
              <Text style={styles.addressName}>{getFieldValue(orderDetails, 'name', 'CustomerName') || 'N/A'}</Text>
              {(() => {
                const addressInfo = parseAddress(getFieldValue(orderDetails, 'address', 'Address'));
                return (
                  <>
                    <Text style={styles.addressText}>{addressInfo.address}</Text>
                    <Text style={styles.addressText}>
                      {addressInfo.city}, {addressInfo.state} - {addressInfo.pincode}
                    </Text>
                  </>
                );
              })()}
              <View style={styles.contactRow}>
                <Ionicons name="call" size={16} color="#6b7280" />
                <Text style={styles.contactText}>{getFieldValue(orderDetails, 'phone', 'Phone') || 'N/A'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={16} color="#6b7280" />
                <Text style={styles.contactText}>{getFieldValue(orderDetails, 'email', 'Email') || 'N/A'}</Text>
              </View>
            </View>
            
            {/* Billing Address */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Ionicons name="card-outline" size={24} color="#3b82f6" />
                <Text style={styles.addressTitle}>Billing Address</Text>
              </View>
              <Text style={styles.addressName}>{orderDetails?.bname || 'N/A'}</Text>
              <Text style={styles.addressText}>{orderDetails?.baddress || 'N/A'}</Text>
              <Text style={styles.addressText}>
                {orderDetails?.bcity || 'N/A'}, {orderDetails?.bstate || 'N/A'} - {orderDetails?.bpincode || 'N/A'}
              </Text>
              <View style={styles.contactRow}>
                <Ionicons name="call" size={16} color="#6b7280" />
                <Text style={styles.contactText}>{orderDetails?.bphone || 'N/A'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={16} color="#6b7280" />
                <Text style={styles.contactText}>{orderDetails?.bemail || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Delivery Information */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car-outline" size={24} color="#3b82f6" />
              <Text style={styles.sectionTitle}>Delivery Information</Text>
            </View>
            
            <View style={styles.deliveryGrid}>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Order Date</Text>
                <Text style={styles.deliveryValue}>{getFieldValue(orderDetails, 'order_date', 'OrderDate') || 'N/A'}</Text>
              </View>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Expected Dispatch</Text>
                <Text style={styles.deliveryValue}>{getFieldValue(orderDetails, 'expect_date', 'ExpectedDispatchDate') || 'N/A'}</Text>
              </View>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Sales Employee</Text>
                <Text style={styles.deliveryValue}>{getFieldValue(orderDetails, 'exe_name', 'sales_emp', 'SalesEmp') || 'N/A'}</Text>
              </View>
              <View style={styles.deliveryItem}>
                <Text style={styles.deliveryLabel}>Document Status</Text>
                <Text style={styles.deliveryValue}>{(() => {
                    const ds = getFieldValue(orderDetails, 'doc_status', 'DocStatus');
                    if (ds === 'O') return 'Open';
                    if (ds === 'C') return 'Closed';
                    return 'N/A';
                  })()}</Text>
              </View>
            </View>
            
            {orderDetails?.logistic_status && (
              <View style={styles.logisticInfo}>
                <Text style={styles.logisticLabel}>Logistic Status:</Text>
                <Text style={styles.logisticValue}>{orderDetails.logistic_status}</Text>
              </View>
            )}
            
            {orderDetails?.track && (
              <View style={styles.logisticInfo}>
                <Text style={styles.logisticLabel}>Tracking ID:</Text>
                <Text style={styles.logisticValue}>{orderDetails.track}</Text>
              </View>
            )}
          </View>
      </ScrollView>

      {/* Re-upload Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reuploadModalVisible}
        onRequestClose={() => setReuploadModalVisible(false)}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={[styles.receiptModalContent, { height: 'auto', maxHeight: '60%' }]}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Re-upload Payment Proof</Text>
              <TouchableOpacity onPress={() => setReuploadModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                Your payment was rejected. Please re-upload the correct payment proof.
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Payment ID</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 }}
                value={reuploadPayId}
                onChangeText={setReuploadPayId}
                placeholder="Enter Payment ID"
                maxLength={12}
              />
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 }}
                onPress={pickReuploadFile}
              >
                <Text style={{ color: reuploadFile ? '#059669' : '#6b7280', fontWeight: '500' }}>
                  {reuploadFile ? reuploadFile.name : 'Pick Receipt Image / PDF'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: isReuploading ? '#93c5fd' : '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center' }}
                onPress={handleReupload}
                disabled={isReuploading}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                  {isReuploading ? 'Uploading...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={handleCloseReceiptModal}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalContent}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Payment Receipt</Text>
              <TouchableOpacity
                onPress={handleCloseReceiptModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {receiptDetails && receiptDetails.receiptUrl ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {receiptDetails.pay_id && (
                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptPaymentId}>
                      Payment ID: {receiptDetails.pay_id}
                    </Text>
                  </View>
                )}
                <Image 
                  source={{ uri: receiptDetails.receiptUrl }} 
                  style={styles.receiptImage}
                  resizeMode="contain"
                  onError={(e) => {
                    console.error('❌ Receipt image load error:', e.nativeEvent.error);
                    Alert.alert('Error', 'Failed to load receipt image');
                  }}
                />
              </ScrollView>
            ) : (
              <View style={styles.noReceiptContainer}>
                <Ionicons name="document-text-outline" size={80} color="#d1d5db" />
                <Text style={styles.noReceiptText}>No receipt available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: '#ffffffff',
    marginTop: Platform.ios ? 10 : 25,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailsSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Scroll Container
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Tracking Card
  trackingCard: {
    backgroundColor: '#fff',
    marginVertical: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  trackingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  trackingBadge: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Progress Bar
  trackingBarWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  trackingBarBg: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackingBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  // Vertical Timeline
  timelineWrap: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  tlRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  tlLeft: {
    width: 32,
    alignItems: 'center',
  },
  tlCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tlCircleCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  tlCircleCurrent: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  tlLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  tlLineCompleted: {
    backgroundColor: '#059669',
  },
  tlContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  tlStepName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  tlStepNameDone: {
    color: '#1e293b',
    fontWeight: '600',
  },
  tlStepNameActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  tlStatus: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 1,
  },
  tlStatusDone: {
    color: '#059669',
    fontWeight: '500',
  },
  tlStatusActive: {
    color: '#3b82f6',
    fontWeight: '500',
  },

  // Tracking Footer
  trackingFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  trackingFooterItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  trackingFooterDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  trackingFooterLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  trackingFooterValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },

  // Order Info Card
  orderInfoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    marginRight: 8,
  },
  currentStatus: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // Progress Info
  progressInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  progressPercentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 4,
  },
  currentStatusText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Product Card Styles
  productCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
  },
  productCardIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productCardIndexText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  productCardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 20,
  },
  productCardDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  productCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  productCardGridItem: {
    width: '50%',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  productCardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  productCardValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  productCardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  productCardFooterItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  productCardFooterDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  productCardFooterLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  productCardFooterValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  productCardFooterTotal: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '700',
  },
  additionalDetailsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  additionalDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    color: '#1e293b',
    lineHeight: 16,
  },

  // Order Status Table
  orderStatusTable: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
  },
  orderStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  orderStatusLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  orderStatusValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '55%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },

  // Product Items
  productItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  productDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  productDetailItem: {
    width: '50%',
    marginBottom: 8,
  },
  productDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  productDetailValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  specificationContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  specificationLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  specificationText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 18,
  },
  remarksContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  remarksLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 13,
    color: '#451a03',
    lineHeight: 18,
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noProductsText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },

  // Address Container
  addressContainer: {
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
  },

  // Delivery Information
  deliveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  deliveryItem: {
    width: '50%',
    marginBottom: 12,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  deliveryValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  logisticInfo: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  logisticLabel: {
    fontSize: 12,
    color: '#0c4a6e',
    fontWeight: '600',
    marginBottom: 4,
  },
  logisticValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },

  // Receipt Modal
  receiptModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    backgroundColor: '#fff',
    width: width * 0.9,
    height: height * 0.8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  receiptImage: {
    width: '100%',
    height: height * 0.7,
  },
  receiptInfo: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  receiptPaymentId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  noReceiptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  }, 
  noReceiptText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  rejectedBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 12,
  },
  rejectedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rejectedBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  rejectedBannerReason: {
    fontSize: 13,
    color: '#991b1b',
    marginBottom: 12,
  },
  reuploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  reuploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default OrderDetailsScreen;
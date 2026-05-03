import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheManager from '@/utils/cacheManager';
import PaymentUpdateModal from '@/components/modals/PaymentUpdateModal';
import { getGstRate, toPostTax } from '@/utils/taxHelper';

const { width, height } = Dimensions.get('window');

let taxCodeCache = {};

// Function to group orders by OrderNumber and combine their products
const groupOrdersByOrderNumber = (orders) => {
  const orderMap = new Map();
  
  orders.forEach(order => {
    const orderKey = order.OrderNumber || order.OrderID;
    
    if (orderMap.has(orderKey)) {
      // Order already exists, add product info to products array
      const existingOrder = orderMap.get(orderKey);
      if (!existingOrder.products) {
        existingOrder.products = [];
      }
      
      // Add product information - always add even if ProductName is empty
      existingOrder.products.push({
        ProductName: order.ProductName || order.product_name || order.ItemDescription || 'Unknown Product',
        ProductPrice: order.LinePriceAfterTax || order.ProductPrice || order.product_price || 0,
        LinePrice: order.LinePrice || 0,
        LinePriceAfterTax: order.LinePriceAfterTax || 0,
        Quantity: order.Quantity || order.qty || 1,
        Specification: order.Specification || order.specification,
        Color: order.Color || order.color,
        Discount: order.Discount || order.discount || 0,
        UnitPrice: order.UnitPrice || order.unit_price || order.ProductPrice || order.product_price,
        ItemCode: order.ItemCode || order.item_code || order.ItemName
      });
      
      // Update total if this order has a higher total (in case of discrepancies)
      if ((order.Total || 0) > (existingOrder.Total || 0)) {
        existingOrder.Total = order.Total;
      }
      // Payment info is same across all line items, already set from first occurrence
    } else {
      // First occurrence of this order
      const newOrder = {
        ...order,
        products: []
      };
      
      // Add first product - always add
      newOrder.products.push({
        ProductName: order.ProductName || order.product_name || order.ItemDescription || 'Unknown Product',
        ProductPrice: order.LinePriceAfterTax || order.ProductPrice || order.product_price || 0,
        LinePrice: order.LinePrice || 0,
        LinePriceAfterTax: order.LinePriceAfterTax || 0,
        Quantity: order.Quantity || order.qty || 1,
        Specification: order.Specification || order.specification,
        Color: order.Color || order.color,
        Discount: order.Discount || order.discount || 0,
        UnitPrice: order.UnitPrice || order.unit_price || order.ProductPrice || order.product_price,
        ItemCode: order.ItemCode || order.item_code || order.ItemName
      });
      
      orderMap.set(orderKey, newOrder);
    }
  });
  
  const groupedOrders = Array.from(orderMap.values());
  console.log(`📦 Grouped ${orders.length} order records into ${groupedOrders.length} unique orders`);
  
  return groupedOrders;
};

const AllOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    status: ''
  });
  const [salesPerson, setSalesPerson] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState(null);
  const [picklistModalVisible, setPicklistModalVisible] = useState(false);
  const [selectedPicklistOrder, setSelectedPicklistOrder] = useState(null);
  const [employeeInputs, setEmployeeInputs] = useState({
    color: '',
    dispatchDate: ''
  });
  const [rejectedPaymentUpdates, setRejectedPaymentUpdates] = useState({});

  const fetchRejectedPaymentUpdates = async () => {
    try {
      const response = await fetch('https://api.chesadentalcare.com/payment-updates?status=rejected');
      if (!response.ok) return;
      const data = await response.json();
      const rejectedMap = {};
      data.forEach(update => {
        if (!rejectedMap[update.order_number]) {
          rejectedMap[update.order_number] = update;
        }
      });
      setRejectedPaymentUpdates(rejectedMap);
    } catch (err) {
      console.error('Error fetching rejected payment updates:', err);
    }
  };

  useEffect(() => {
    checkSalesPersonAndFetch();
    fetchRejectedPaymentUpdates();
    // Fetch product catalog for taxcodes
    if (Object.keys(taxCodeCache).length === 0) {
      fetch('https://api.chesadentalcare.com/products_all')
        .then(res => res.json())
        .then(products => {
          products.forEach(p => { taxCodeCache[p.code] = p.taxcode; });
        })
        .catch(err => console.error('Error fetching product catalog:', err));
    }
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, orders, filters]);

  const checkSalesPersonAndFetch = async () => {
    try {
      const possibleKeys = ['sales_person', 'user', 'salesPerson', 'username'];
      let foundSalesPerson = null;
      
      for (const key of possibleKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value && value !== 'null' && value !== '') {
          foundSalesPerson = value.replace(/"/g, '');
          break;
        }
      }
      
      if (!foundSalesPerson) {
        Alert.alert(
          'Error', 
          'Sales person not found. Please login again.',
          [{ text: 'OK', onPress: () => router.replace('/auth') }]
        );
        return;
      }
      
      setSalesPerson(foundSalesPerson);
      fetchAllOrders(foundSalesPerson, true);
    } catch (error) {
      console.error('Error checking sales person:', error);
      Alert.alert('Error', 'Failed to retrieve user information');
    }
  };

  const fetchAllOrders = async (salesPersonName, useCache = false) => {
    try {
      if (useCache) {
        const cached = await CacheManager.getCache('all_orders');
        if (cached && cached.length > 0) {
          setOrders(cached);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('https://api.chesadentalcare.com/get_all_orders');
      
      if (!response.ok) {
        if (response.status === 404) {
          setOrders([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get sales employee info to filter orders
      const salesEmpResponse = await fetch('https://api.chesadentalcare.com/sales_employees_info');
      if (!salesEmpResponse.ok) {
        throw new Error('Failed to fetch sales employees data');
      }
      
      const salesEmpData = await salesEmpResponse.json();
      
      // Find matching sales employee based on role and sales person
      const role = await AsyncStorage.getItem('role');
      let filteredOrders = [];
      let employeeNamesMap = {};

      if (role === 'coordinator') {
        const salesPersonLower = salesPersonName ? salesPersonName.toLowerCase() : '';
        const coordinatorId = {
          "hemavathi s": 1,
          "sangeetha k": 2,
          "samrin": 3,
        }[salesPersonLower];

        const matchingEmployees = salesEmpData.filter(
          (emp) => Number(emp.coordinator) === coordinatorId
        );

        const matchingSalesEmpIds = matchingEmployees.map((emp) => emp.id);
        matchingEmployees.forEach((emp) => {
          employeeNamesMap[emp.id] = emp.bname || emp.username;
        });

        filteredOrders = data
          .filter((order) => matchingSalesEmpIds.includes(Number(order.SalesEmp)))
          .map((order) => ({
            ...order,
            employeeName: employeeNamesMap[Number(order.SalesEmp)] || 'Unknown',
          }));
      } else if (role === 'sale_staff') {
        // Clean the sales person name - remove trailing/leading spaces
        const cleanSalesPersonName = salesPersonName ? salesPersonName.trim() : '';
        const salesPersonLower = cleanSalesPersonName.toLowerCase();
        console.log('🔍 Mobile Orders Debug - Sale Staff Filtering:');
        console.log('  - Sales person name (raw):', `"${salesPersonName}"`);
        console.log('  - Sales person name (cleaned):', `"${cleanSalesPersonName}"`);
        console.log('  - Sales person lowercase:', `"${salesPersonLower}"`);
        console.log('  - Total employee data:', salesEmpData.length);
        
        const matchingEmployee = salesEmpData.find(
          (emp) => emp.username.trim().toLowerCase() === salesPersonLower
        );

        console.log('  - Matching employee found:', matchingEmployee ? matchingEmployee.id : 'None');
        if (matchingEmployee) {
          console.log('  - Matching employee details:', {
            id: matchingEmployee.id,
            username: matchingEmployee.username,
            bname: matchingEmployee.bname
          });
        }

        if (matchingEmployee) {
          employeeNamesMap[matchingEmployee.id] = matchingEmployee.bname || matchingEmployee.username;
          const beforeFilter = data.length;
          filteredOrders = data
            .filter((order) => Number(order.SalesEmp) === matchingEmployee.id);
          
          console.log('  - Orders before filtering:', beforeFilter);
          console.log('  - Orders after filtering:', filteredOrders.length);
          console.log('  - Sample order SalesEmp IDs:', data.slice(0, 3).map(o => o.SalesEmp).join(', '));
          
          filteredOrders = filteredOrders.map((order) => ({
              ...order,
              employeeName: employeeNamesMap[matchingEmployee.id] || 'Unknown',
            }));
        }
      } else if (role === 'sale_head') {
        filteredOrders = data.map((order) => {
          const employeeName = salesEmpData.find(
            (emp) => Number(emp.id) === Number(order.SalesEmp)
          )?.bname || 'Unknown';

          return {
            ...order,
            employeeName,
          };
        });
      }
      
      // Group orders by OrderNumber to handle multiple products per order
      const groupedOrders = groupOrdersByOrderNumber(filteredOrders);
      
      await CacheManager.setCache('all_orders', groupedOrders);
      setOrders(groupedOrders);
    } catch (error) {
      console.error('Error fetching all orders:', error);
      Alert.alert('Error', `Failed to fetch orders: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.OrderNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.OrderID?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.CustomerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(order => order.OrderStatus === filters.status);
    }

    if (filters.month && filters.year) {
      filtered = filtered.filter(order => {
        if (!order.OrderDate) return false;
        const orderDate = new Date(order.OrderDate.split('-').reverse().join('-'));
        return orderDate.getMonth() + 1 === parseInt(filters.month) &&
               orderDate.getFullYear() === parseInt(filters.year);
      });
    }

    setFilteredOrders(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    CacheManager.clearCache('all_orders');
    fetchRejectedPaymentUpdates();
    if (salesPerson) {
      fetchAllOrders(salesPerson, false);
    }
  }, [salesPerson]);

  const getStatusColor = (status) => {
    const colors = {
      'Delivered': '#4CAF50',
      'Dispatched': '#2196F3',
      'Approved For Dispatch': '#00BCD4',
      'Job Card Issued': '#9C27B0',
      'Ready For Dispatch': '#FF9800',
      'Open': '#FFC107'
    };
    return colors[status] || '#757575';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Delivered': 'checkmark-circle',
      'Dispatched': 'car',
      'Approved For Dispatch': 'checkmark-done',
      'Job Card Issued': 'document-text',
      'Ready For Dispatch': 'time',
      'Open': 'folder-open'
    };
    return icons[status] || 'help-circle';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getPostTaxTotal = (item) => {
    // SAP orders have Total (DocTotal) which is already post-tax
    if (item.Total) return item.Total;
    // MySQL/fallback: calculate from product prices
    if (!item.products || item.products.length === 0) return 0;
    return item.products.reduce((sum, product) => {
      const taxcode = taxCodeCache[product.ItemCode] || '';
      const preTax = Number(product.ProductPrice) || 0;
      const qty = Number(product.Quantity) || 1;
      return sum + toPostTax(preTax, taxcode) * qty;
    }, 0);
  };

  const getPostTaxPrice = (product) => {
    // SAP products already have post-tax line price
    if (product.LinePriceAfterTax) return product.LinePriceAfterTax;
    const taxcode = taxCodeCache[product.ItemCode] || '';
    return toPostTax(Number(product.ProductPrice) || 0, taxcode);
  };

  const handleOrderPress = (orderItem) => {
    console.log('🔄 Navigating to order. OrderID:', orderItem.OrderID, 'OrderNumber:', orderItem.OrderNumber);
    // Use OrderNumber for navigation as it's likely the primary identifier
    const navId = orderItem.OrderNumber || orderItem.OrderID;
    console.log('🔄 Using navigation ID:', navId);
    router.push(`/${navId}`);
  };

  const handlePaymentUpdate = (orderItem) => {
    setSelectedPaymentOrder({ orderId: orderItem.OrderID, orderNumber: orderItem.OrderNumber });
    setPaymentModalVisible(true);
  };

  const handleMoveToPicklist = (orderItem) => {
    setSelectedPicklistOrder(orderItem);
    setPicklistModalVisible(true);
  };

  const handlePicklistSubmit = async () => {
    if (!employeeInputs.color.trim()) {
      Alert.alert('Error', 'Please enter a color');
      return;
    }
    if (!employeeInputs.dispatchDate) {
      Alert.alert('Error', 'Please select a dispatch date');
      return;
    }

    setPicklistModalVisible(false);

    try {
      const order = selectedPicklistOrder;
      const hasDCH = order.products?.some((product) =>
        product.ItemCode?.startsWith("DCH")
      );

      if (!hasDCH) {
        Alert.alert('Info', 'This order does not contain DCH products');
        return;
      }

      const dchDescriptions = order.products
        .filter((p) => p.ItemCode?.startsWith("DCH"))
        .map((p) => p.ProductName)
        .join(", ");

      const cellularResponse = await fetch(
        `https://api.chesadentalcare.com/get-cellular?CardName=${encodeURIComponent(order.CustomerName)}`
      );
      const cellularData = await cellularResponse.json();
      const cellular = cellularData.Cellular || "";

      const response = await fetch(`https://api.chesadentalcare.com//move_to_picklist_sql`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: order.OrderID,
          order_number: order.OrderNumber,
          itemName: dchDescriptions,
          oldAddress: order.Address,
          phoneNumber: cellular,
          old_color: order.Color,
          customerName: order.ShipName || order.CustomerName,
          old_dispatch_date: order.ExpectedDispatchDate || "",
          employee_entered_color: employeeInputs.color,
          employee_entered_dispatch_date: employeeInputs.dispatchDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details?.includes("Duplicate entry")) {
          Alert.alert('Info', 'Message already sent to customer once. Please follow up.');
          return;
        }
        throw new Error('Failed to send picklist request');
      }

      Alert.alert('Success', 'Picklist request sent successfully!');
      setEmployeeInputs({ color: '', dispatchDate: '' });
      onRefresh();
    } catch (error) {
      console.error('Error moving to picklist:', error);
      Alert.alert('Error', 'Failed to send picklist request');
    }
  };

  const renderOrderItem = ({ item, index }) => {
    // Calculate total from DownPayments array like web app
    const totalDownPayment = item.DownPayments && item.DownPayments.length > 0
      ? item.DownPayments.reduce((sum, payment) => sum + payment, 0)
      : 0;
    const postTaxTotal = getPostTaxTotal(item);
    const pendingAmount = postTaxTotal - totalDownPayment;
    
    return (
      <TouchableOpacity
        onPress={() => handleOrderPress(item)}
        style={styles.orderContent}
        activeOpacity={0.8}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item.OrderID}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.OrderStatus) }]}>
            <Ionicons 
              name={getStatusIcon(item.OrderStatus)} 
              size={12} 
              color="#fff" 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>{item.OrderStatus}</Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="receipt" size={16} color="#666" />
            <Text style={styles.infoText}>{item.OrderNumber || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.infoText}>{item.CustomerName || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.infoText}>{item.OrderDate || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-circle" size={16} color="#666" />
            <Text style={styles.infoText}>{item.employeeName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.Address || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Products Section */}
        {item.products && item.products.length > 0 && (
          <View style={styles.productsContainer}>
            <View style={styles.productsHeader}>
              <Ionicons name="cube-outline" size={16} color="#007AFF" />
              <Text style={styles.productsTitle}>
                Products ({item.products.length})
              </Text>
            </View>
            
            {item.products.slice(0, 2).map((product, productIndex) => (
              <View key={`${item.OrderID}-product-${productIndex}`} style={styles.productItem}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.ProductName}
                </Text>
                <View style={styles.productDetails}>
                  <Text style={styles.productDetail}>
                    Qty: {product.Quantity} | Price: {formatCurrency(getPostTaxPrice(product))}
                  </Text>
                  {product.Color && (
                    <Text style={styles.productDetail}>Color: {product.Color}</Text>
                  )}
                </View>
              </View>
            ))}
            
            {item.products.length > 2 && (
              <Text style={styles.moreProductsText}>
                +{item.products.length - 2} more products
              </Text>
            )}
          </View>
        )}

        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total (incl. GST):</Text>
            <Text style={styles.totalAmount}>{formatCurrency(postTaxTotal)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Down Payment:</Text>
            <Text style={styles.downPaymentAmount}>{formatCurrency(totalDownPayment)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Pending Amount:</Text>
            <Text style={styles.pendingAmount}>{formatCurrency(pendingAmount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Status:</Text>
            <Text style={styles.docStatus}>{item.DocStatus === 'O' ? 'Open' : 'Closed'}</Text>
          </View>
        </View>

        {rejectedPaymentUpdates[item.OrderNumber] && (
          <View style={styles.rejectedPaymentBanner}>
            <View style={styles.rejectedBannerContent}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.rejectedBannerTitle}>Payment Update Rejected</Text>
                <Text style={styles.rejectedBannerReason} numberOfLines={2}>
                  Amount: {formatCurrency(rejectedPaymentUpdates[item.OrderNumber].amount)} | Reason: {rejectedPaymentUpdates[item.OrderNumber].rejection_reason}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.reuploadButton}
              onPress={() => handlePaymentUpdate(item)}
            >
              <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
              <Text style={styles.reuploadButtonText}>Re-upload Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleOrderPress(item)}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => handlePaymentUpdate(item)}
          >
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.paymentButtonText}>Update Payment</Text>
          </TouchableOpacity>
          {!['Delivered', 'Approved For Dispatch', 'Ready For Dispatch', 'Dispatched', 'Job Card Issued'].includes(item.OrderStatus) && (
            <TouchableOpacity
              style={styles.picklistButton}
              onPress={() => handleMoveToPicklist(item)}
            >
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={styles.picklistButtonText}>Move to Picklist</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const FilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter All Orders</Text>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.statusButtons}>
                {['Open', 'Delivered', 'Dispatched', 'Job Card Issued', 'Approved For Dispatch', 'Ready For Dispatch'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      filters.status === status && styles.activeStatusButton
                    ]}
                    onPress={() => setFilters({...filters, status: filters.status === status ? '' : status})}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      filters.status === status && styles.activeStatusButtonText
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Month</Text>
              <View style={styles.statusButtons}>
                {Array.from({length: 12}, (_, i) => {
                  const month = i + 1;
                  const monthName = new Date(2024, i).toLocaleString('default', { month: 'short' });
                  return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.statusButton,
                        filters.month === month.toString() && styles.activeStatusButton
                      ]}
                      onPress={() => setFilters({
                        ...filters, 
                        month: filters.month === month.toString() ? '' : month.toString()
                      })}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        filters.month === month.toString() && styles.activeStatusButtonText
                      ]}>
                        {monthName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Year</Text>
              <View style={styles.statusButtons}>
                {[2023, 2024, 2025].map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.statusButton,
                      filters.year === year.toString() && styles.activeStatusButton
                    ]}
                    onPress={() => setFilters({
                      ...filters, 
                      year: filters.year === year.toString() ? '' : year.toString()
                    })}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      filters.year === year.toString() && styles.activeStatusButtonText
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setFilters({ month: '', year: '', status: '' })}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading all orders...</Text>
        <Text style={styles.loadingSubtext}>Sales Person: {salesPerson}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order Number, ID, Customer..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          {searchTerm ? (
            <TouchableOpacity
              onPress={() => setSearchTerm('')}
              style={styles.clearSearch}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          Showing {filteredOrders.length} of {orders.length} orders
        </Text>
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm || filters.status || filters.month || filters.year
              ? 'Try adjusting your filters' 
              : orders.length === 0 
                ? `No orders found for ${salesPerson}`
                : 'Pull down to refresh'
            }
          </Text>
          {orders.length === 0 && (
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item, index) => `order-${item.OrderNumber || item.OrderID || index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        />
      )}

      <FilterModal />
      
      <PaymentUpdateModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        orderId={selectedPaymentOrder?.orderId}
        orderNumber={selectedPaymentOrder?.orderNumber}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={picklistModalVisible}
        onRequestClose={() => setPicklistModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPicklistModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.picklistModalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Order Details</Text>
                <TouchableOpacity
                  onPress={() => setPicklistModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Color *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter color (e.g., Blue, Red, etc.)"
                  value={employeeInputs.color}
                  onChangeText={(text) => setEmployeeInputs({...employeeInputs, color: text})}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Dispatch Date *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => {
                    const today = new Date();
                    const dateString = today.toISOString().split('T')[0];
                    setEmployeeInputs({...employeeInputs, dispatchDate: dateString});
                  }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.datePickerText}>
                    {employeeInputs.dispatchDate || 'Select Date (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  value={employeeInputs.dispatchDate}
                  onChangeText={(text) => setEmployeeInputs({...employeeInputs, dispatchDate: text})}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setPicklistModalVisible(false);
                    setEmployeeInputs({ color: '', dispatchDate: '' });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handlePicklistSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  clearSearch: {
    padding: 4,
  },
  filterButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultsText: {
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 3,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  orderInfo: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  amountContainer: {
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  downPaymentAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  pendingAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f44336',
  },
  docStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    gap: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  picklistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  picklistButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectedPaymentBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  rejectedBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rejectedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectedBannerReason: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 2,
  },
  reuploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 5,
    marginTop: 8,
  },
  reuploadButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  refreshButton: {
    marginTop: 20,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeStatusButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 13,
    color: '#666',
  },
  activeStatusButtonText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Products Section Styles
  productsContainer: {
    marginTop: 8,
    marginBottom: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 5,
  },
  productItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#007AFF',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  productDetails: {
    flexDirection: 'column',
  },
  productDetail: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  moreProductsText: {
    fontSize: 11,
    color: '#007AFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 3,
  },
  picklistModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.7,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#333',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    backgroundColor: '#f8f9fa',
  },
  datePickerText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
});

export default AllOrdersTab;
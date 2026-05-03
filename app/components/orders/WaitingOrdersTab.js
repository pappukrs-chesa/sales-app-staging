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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CacheManager from '@/utils/cacheManager';
import { getGstRate } from '@/utils/taxHelper';

const { width, height } = Dimensions.get('window');

const taxCodeCache = {};

const WaitingOrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [postTaxTotals, setPostTaxTotals] = useState({});
  const [rejectedPayments, setRejectedPayments] = useState({});
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    status: ''
  });
  const [salesPerson, setSalesPerson] = useState('');

  useEffect(() => {
    checkSalesPersonAndFetch();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, orders, filters]);

  // Compute post-tax totals for each order
  useEffect(() => {
    if (orders.length === 0) return;

    const computePostTaxTotals = async () => {
      try {
        if (Object.keys(taxCodeCache).length === 0) {
          const res = await fetch('https://api.chesadentalcare.com/products_all');
          const products = await res.json();
          products.forEach(p => { taxCodeCache[p.code] = p.taxcode; });
        }

        const totals = {};
        await Promise.all(
          orders.map(async (order) => {
            try {
              const orderId = order.orderno || order.id;
              const res = await fetch(`https://api.chesadentalcare.com/idv_update?id=${orderId}`);
              const items = await res.json();
              const postTaxTotal = items.reduce((sum, item) => {
                const taxcode = taxCodeCache[item.product_code] || '';
                const rate = getGstRate(taxcode);
                const preTax = Number(item.product_price) || 0;
                return sum + preTax * (1 + rate / 100) * (Number(item.qty) || 1);
              }, 0);
              totals[order.id] = postTaxTotal;
            } catch (err) {
              totals[order.id] = null;
            }
          })
        );
        setPostTaxTotals(totals);
      } catch (err) {
        console.error('Error computing post-tax totals:', err);
      }
    };

    computePostTaxTotals();
  }, [orders]);

  // Check payment rejection status for each order
  useEffect(() => {
    if (orders.length === 0) return;

    const checkRejections = async () => {
      const rejected = {};
      await Promise.all(
        orders.map(async (order) => {
          try {
            const orderId = order.orderno || order.id;
            const res = await fetch(`https://api.chesadentalcare.com/order_receipt/?id=${orderId}`);
            if (res.ok) {
              const data = await res.json();
              if (data[0]?.payment_status === 'rejected') {
                rejected[order.id] = data[0].rejection_reason || 'Payment rejected';
              }
            }
          } catch (err) {
            // silently fail
          }
        })
      );
      setRejectedPayments(rejected);
    };

    checkRejections();
  }, [orders]);

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
      fetchOrders(foundSalesPerson, true);
    } catch (error) {
      console.error('Error checking sales person:', error);
      Alert.alert('Error', 'Failed to retrieve user information');
    }
  };

  const fetchOrders = async (salesPersonName, useCache = false) => {
    try {
      if (useCache) {
        const cached = await CacheManager.getCache('waiting_orders');
        if (cached && cached.length > 0) {
          setOrders(cached);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('https://api.chesadentalcare.com/accounts_waiting_orders');
      
      if (!response.ok) {
        if (response.status === 404) {
          setOrders([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter orders where exe_name matches sales_person
      const filteredOrders = data.filter(order => {
        return order.exe_name === salesPersonName;
      });
      
      // Fetch sales employee names
      const ordersWithSalesEmpNames = await fetchSalesEmployeeNames(filteredOrders);
      
      // Cache the data
      await CacheManager.setCache('waiting_orders', ordersWithSalesEmpNames);
      
      setOrders(ordersWithSalesEmpNames);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', `Failed to fetch orders: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSalesEmployeeNames = async (orders) => {
    const salesEmpCache = {};
    const uniqueSalesEmpIds = [...new Set(orders.map(order => order.SalesEmp).filter(id => id))];
    
    for (const id of uniqueSalesEmpIds) {
      if (salesEmpCache[id]) continue;
      
      try {
        const cached = await CacheManager.getCache(`sales_emp_${id}`);
        if (cached) {
          salesEmpCache[id] = cached;
          continue;
        }
        
        const response = await fetch(`https://api.chesadentalcare.com/sales_emp/${id}`);
        if (response.ok) {
          const salesEmpData = await response.json();
          salesEmpCache[id] = salesEmpData.SalesEmpName || 'Unknown';
          await CacheManager.setCache(`sales_emp_${id}`, salesEmpCache[id]);
        } else {
          salesEmpCache[id] = 'Unknown';
        }
      } catch (error) {
        console.error(`Error fetching sales emp ${id}:`, error);
        salesEmpCache[id] = 'Unknown';
      }
    }
    
    return orders.map(order => ({
      ...order,
      salesEmployeeName: salesEmpCache[order.SalesEmp] || 'Unknown'
    }));
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.OrderNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(order => order.order_status === filters.status);
    }

    if (filters.month && filters.year) {
      filtered = filtered.filter(order => {
        if (!order.order_date) return false;
        const orderDate = new Date(order.order_date);
        return orderDate.getMonth() + 1 === parseInt(filters.month) &&
               orderDate.getFullYear() === parseInt(filters.year);
      });
    }

    setFilteredOrders(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    CacheManager.clearCache('waiting_orders');
    if (salesPerson) {
      fetchOrders(salesPerson, false);
    }
  }, [salesPerson]);

  const getStatusColor = (status) => {
    const colors = {
      'Delivered': '#4CAF50',
      'Dispatched': '#2196F3',
      'Waiting': '#FF5722',
      'Job Card Issued': '#9C27B0',
      'Approved For Dispatch': '#00BCD4'
    };
    return colors[status] || '#757575';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Delivered': 'checkmark-circle',
      'Dispatched': 'car',
      'Waiting': 'time',
      'Job Card Issued': 'document-text',
      'Approved For Dispatch': 'checkmark-done'
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

  const handleOrderPress = (orderItem) => {
    console.log('🔄 Navigating to waiting order. ID:', orderItem.id, 'Order#:', orderItem.orderno);
    // Use the appropriate ID field for navigation
    const navId = orderItem.orderno || orderItem.id;
    console.log('🔄 Using navigation ID:', navId);
    router.push(`/${navId}`);
  };

  const renderOrderItem = ({ item, index }) => {
    return (
      <TouchableOpacity
        onPress={() => handleOrderPress(item)}
        style={styles.orderContent}
        activeOpacity={0.8}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) }]}>
            <Ionicons 
              name={getStatusIcon(item.order_status)} 
              size={12} 
              color="#fff" 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>{item.order_status}</Text>
          </View>
        </View>

        {rejectedPayments[item.id] && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.rejectedBannerText}>
              Payment Rejected: {rejectedPayments[item.id]}
            </Text>
          </View>
        )}

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={16} color="#666" />
            <Text style={styles.infoText}>{item.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <Text style={styles.infoText}>{item.order_date || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.address || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="storefront" size={16} color="#666" />
            <Text style={styles.infoText}>{item.bname || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total (incl. GST):</Text>
            <Text style={styles.totalAmount}>
              {postTaxTotals[item.id] != null
                ? formatCurrency(postTaxTotals[item.id])
                : formatCurrency(item.total_amount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paid:</Text>
            <Text style={styles.paidAmount}>{formatCurrency(item.paid_amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Pending:</Text>
            <Text style={styles.pendingAmount}>
              {postTaxTotals[item.id] != null
                ? formatCurrency(postTaxTotals[item.id] - (item.paid_amount || 0))
                : formatCurrency(item.pending_amount)}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => handleOrderPress(item)}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Filter Waiting Orders</Text>
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
                {['Waiting', 'Delivered', 'Dispatched', 'Job Card Issued', 'Approved For Dispatch'].map(status => (
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
        <Text style={styles.loadingText}>Loading waiting orders...</Text>
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
            placeholder="Search by Order Number..."
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
          keyExtractor={(item, index) => `waiting-order-${item.orderno || item.id || index}`}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearSearch: {
    padding: 5,
  },
  filterButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
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
    marginBottom: 15,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  amountContainer: {
    marginBottom: 15,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  pendingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  rejectedBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeStatusButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeStatusButtonText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    gap: 15,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default WaitingOrdersTab;
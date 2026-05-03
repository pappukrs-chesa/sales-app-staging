import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ForecastedOrdersCard = ({ 
  leads = [], 
  selectedEmployeeName 
}) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!selectedEmployeeName || leads.length === 0) {
      return [];
    }

    const employees = selectedEmployeeName.split(',').map(name => name.trim().toLowerCase());
    
    return leads.filter(order => {
      const orderEmployeeName = order.SalesEmployee 
        ? order.SalesEmployee.toLowerCase().trim()
        : '';
      return employees.includes(orderEmployeeName);
    });
  }, [leads, selectedEmployeeName]);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (expectedDate) => {
    if (!expectedDate) return '#64748B';
    
    const today = new Date();
    const expectDate = new Date(expectedDate);
    const daysDiff = Math.ceil((expectDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return '#EF4444'; // Overdue - red
    if (daysDiff <= 7) return '#F59E0B'; // Due soon - yellow
    if (daysDiff <= 30) return '#3B82F6'; // This month - blue
    return '#10B981'; // Future - green
  };

  const getStatusText = (expectedDate) => {
    if (!expectedDate) return 'No Date';
    
    const today = new Date();
    const expectDate = new Date(expectedDate);
    const daysDiff = Math.ceil((expectDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return `Overdue by ${Math.abs(daysDiff)} days`;
    if (daysDiff === 0) return 'Due Today';
    if (daysDiff <= 7) return `Due in ${daysDiff} days`;
    if (daysDiff <= 30) return 'This Month';
    return 'Future';
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderItem}
      onPress={() => {
        setSelectedOrder(item);
        setIsDetailModalOpen(true);
      }}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderTitleContainer}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {item.name || 'Unknown'}
          </Text>
          <Text style={styles.orderSubtitle}>
            Order: {item.ordernumber}
          </Text>
        </View>
        <View style={styles.orderValue}>
          <Text style={styles.orderValueText}>
            {formatCurrency(item.value)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderDetailRow}>
          <Ionicons name="person" size={14} color="#64748B" />
          <Text style={styles.orderDetailText}>
            {item.SalesEmployee || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.orderDetailRow}>
          <Ionicons name="calendar" size={14} color="#64748B" />
          <Text style={styles.orderDetailText}>
            {formatDate(item.expect_date)}
          </Text>
        </View>

        <View style={styles.orderDetailRow}>
          <View style={[
            styles.statusChip, 
            { backgroundColor: getStatusColor(item.expect_date) }
          ]}>
            <Text style={styles.statusText}>
              {getStatusText(item.expect_date)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOrderDetail = () => (
    <Modal
      visible={isDetailModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsDetailModalOpen(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

        {selectedOrder && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Order Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{selectedOrder.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order Number:</Text>
                <Text style={styles.detailValue}>{selectedOrder.ordernumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>{selectedOrder.orderid}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Value:</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedOrder.value)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expected Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedOrder.expect_date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sales Person:</Text>
                <Text style={styles.detailValue}>{selectedOrder.SalesEmployee || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Status</Text>
              <View style={[
                styles.statusChip, 
                { backgroundColor: getStatusColor(selectedOrder.expect_date), alignSelf: 'flex-start' }
              ]}>
                <Text style={styles.statusText}>
                  {getStatusText(selectedOrder.expect_date)}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const totalValue = filteredOrders.reduce((sum, order) => sum + Number(order.value || 0), 0);
  // console.log('Total Value:', totalValue);
  const overdueCount = filteredOrders.filter(order => {
    if (!order.expect_date) return false;
    const today = new Date();
    const expectDate = new Date(order.expect_date);
    return expectDate < today;
  }).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="time" size={20} color="#007AFF" />
          <Text style={styles.title}>Forecasted Orders</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredOrders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(totalValue)}
          </Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: overdueCount > 0 ? '#EF4444' : '#10B981' }]}>
            {overdueCount}
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {!selectedEmployeeName ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Please select an employee to view orders</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No forecasted orders found</Text>
        </View>
      ) : (
        <View style={styles.ordersContainer}>
          <FlatList
            data={filteredOrders}
            keyExtractor={(item, index) => `${item.orderid}-${index}`}
            renderItem={renderOrderItem}
            style={styles.ordersList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersListContent}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {renderOrderDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: 500, // Increased max height
    minHeight: 420, // Increased minimum height to show 3-4 items
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  ordersContainer: {
    flex: 1,
    height: 280, // Increased height to show 3-4 items properly
  },
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    paddingBottom: 16,
  },
  orderItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  orderSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  orderValue: {
    alignItems: 'flex-end',
  },
  orderValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  orderDetails: {
    marginBottom: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  placeholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
});

export default ForecastedOrdersCard;
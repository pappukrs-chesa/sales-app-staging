import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const PaymentReceivedCard = ({ 
  selectedEmployeeName, 
  targetSale = 0,
  employeeData 
}) => {
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [filter, setFilter] = useState({ type: 'months', value: 1 });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoiceData();
  }, []);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      
      // Get invoice data from storage
      const storedInvoiceData = await AsyncStorage.getItem('InvoiceCard');
      if (storedInvoiceData) {
        setInvoiceData(JSON.parse(storedInvoiceData));
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      setInvoiceData(null);
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (!invoiceData || !selectedEmployeeName) {
      return {
        currentMonthTotal: 0,
        lastThreeMonthsTotal: 0,
        lastSixMonthsTotal: 0,
        thisWeekTotal: 0,
        last4WeeksTotal: 0,
        last10WeeksTotal: 0,
        last20WeeksTotal: 0,
        monthlyTotals: [],
      };
    }

    const selectedEmployeeNames = selectedEmployeeName
      .split(', ')
      .map(name => name.toLowerCase());

    let currentMonthTotal = 0;
    let lastThreeMonthsTotal = 0;
    let lastSixMonthsTotal = 0;
    let thisWeekTotal = 0;
    let last4WeeksTotal = 0;
    let last10WeeksTotal = 0;
    let last20WeeksTotal = 0;

    const monthlySalesMap = {};

    selectedEmployeeNames.forEach(employeeName => {
      const employeeKey = Object.keys(invoiceData).find(
        key => key.toLowerCase() === employeeName
      );

      if (!employeeKey || !invoiceData[employeeKey]) return;

      const employee = invoiceData[employeeKey];

      // Accumulate totals
      currentMonthTotal += employee.currentMonthTotal || 0;
      lastThreeMonthsTotal += employee.lastThreeMonthsTotal || 0;
      lastSixMonthsTotal += employee.lastSixMonthsTotal || 0;
      thisWeekTotal += employee.thisWeekTotal || 0;
      last4WeeksTotal += employee.last4WeeksTotal || 0;
      last10WeeksTotal += employee.last10WeeksTotal || 0;
      last20WeeksTotal += employee.last20WeeksTotal || 0;

      // Process monthly totals
      if (employee.monthlyTotals) {
        Object.entries(employee.monthlyTotals).forEach(([monthYear, sales]) => {
          const [monthName, year] = monthYear.split(' ');
          const key = `${monthName} ${year}`;
          monthlySalesMap[key] = (monthlySalesMap[key] || 0) + sales;
        });
      }
    });

    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const sortedMonthlyTotals = Object.entries(monthlySalesMap)
      .map(([monthYear, sales]) => {
        const [monthName, year] = monthYear.split(' ');
        return {
          name: monthName,
          year: parseInt(year, 10),
          Sales: Math.floor(sales),
          Target: targetSale,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
      });

    return {
      currentMonthTotal,
      lastThreeMonthsTotal,
      lastSixMonthsTotal,
      thisWeekTotal,
      last4WeeksTotal,
      last10WeeksTotal,
      last20WeeksTotal,
      monthlyTotals: sortedMonthlyTotals,
    };
  }, [invoiceData, selectedEmployeeName, targetSale]);

  const filteredTotalAmount = useMemo(() => {
    if (filter.type === 'months') {
      switch (filter.value) {
        case 1:
          return Math.floor(processedData.currentMonthTotal) || 0;
        case 3:
          return Math.floor(processedData.lastThreeMonthsTotal) || 0;
        case 6:
          return Math.floor(processedData.lastSixMonthsTotal) || 0;
        default:
          return 0;
      }
    } else if (filter.type === 'weeks') {
      switch (filter.value) {
        case 1:
          return Math.floor(processedData.thisWeekTotal) || 0;
        case 4:
          return Math.floor(processedData.last4WeeksTotal) || 0;
        case 10:
          return Math.floor(processedData.last10WeeksTotal) || 0;
        case 20:
          return Math.floor(processedData.last20WeeksTotal) || 0;
        default:
          return 0;
      }
    }
    return 0;
  }, [filter, processedData]);

  const targetAmount = filter.type === 'months' 
    ? filter.value * targetSale 
    : (filter.value / 4) * targetSale;

  const chartData = useMemo(() => {
    if (!processedData.monthlyTotals || processedData.monthlyTotals.length === 0) {
      return null;
    }

    const data = processedData.monthlyTotals.slice(-6).map(item => item.Sales);
    const labels = processedData.monthlyTotals.slice(-6).map(item => 
      `${item.name.substring(0, 3)} ${item.year}`
    );

    return {
      labels,
      datasets: [
        {
          data,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        },
      ],
    };
  }, [processedData]);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filterOptions = [
    { type: 'months', value: 1, label: '1 Month' },
    { type: 'months', value: 3, label: '3 Months' },
    { type: 'months', value: 6, label: '6 Months' },
    { type: 'weeks', value: 1, label: '1 Week' },
    { type: 'weeks', value: 4, label: '4 Weeks' },
    { type: 'weeks', value: 10, label: '10 Weeks' },
    { type: 'weeks', value: 20, label: '20 Weeks' },
  ];

  const handleFilterSelect = (selectedFilter) => {
    setFilter(selectedFilter);
    setIsFilterModalOpen(false);
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Invoice Data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="receipt" size={20} color="#007AFF" />
          <Text style={styles.title}>Payment Received</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Ionicons name="options" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {!selectedEmployeeName ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Please select an employee</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Total Invoice Done vs Target</Text>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              {formatCurrency(filteredTotalAmount)}
            </Text>
            <Text style={styles.vsText}> vs </Text>
            <Text style={styles.targetAmount}>
              {formatCurrency(targetAmount)}
            </Text>
          </View>

          {chartData && (
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={screenWidth - 80}
                height={160}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#8B5CF6',
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={false}
                withHorizontalLabels={false}
              />
            </View>
          )}

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Progress: {((filteredTotalAmount / targetAmount) * 100).toFixed(1)}%
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((filteredTotalAmount / targetAmount) * 100, 100)}%`,
                    backgroundColor: filteredTotalAmount >= targetAmount ? '#10B981' : '#3B82F6',
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Time Period</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.filterOptions}>
            {filterOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterOption,
                  filter.type === option.type && filter.value === option.value && styles.selectedFilterOption
                ]}
                onPress={() => handleFilterSelect(option)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filter.type === option.type && filter.value === option.value && styles.selectedFilterOptionText
                ]}>
                  {option.label}
                </Text>
                {filter.type === option.type && filter.value === option.value && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 280,
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
  filterButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  vsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginHorizontal: 8,
  },
  targetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  progressContainer: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cancelButton: {
    fontSize: 16,
    color: '#64748B',
  },
  placeholder: {
    width: 60,
  },
  filterOptions: {
    flex: 1,
    padding: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedFilterOption: {
    backgroundColor: '#F0F9FF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  selectedFilterOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default PaymentReceivedCard;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EmployeeSalesCard = ({ 
  selectedEmployeeName, 
  employeeData, 
  targetSale 
}) => {
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState({
    total: 0,
    month: 0,
    week: 0,
    today: 0,
  });

  useEffect(() => {
    if (selectedEmployeeName) {
      fetchSalesData();
    }
  }, [selectedEmployeeName]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Get booking data from storage
      const bookingData = await AsyncStorage.getItem('BookingCard');
      if (bookingData) {
        const parsedData = JSON.parse(bookingData);
        const employeeKeys = Object.keys(parsedData.data || {});
        
        let totalSales = 0;
        let monthSales = 0;
        let weekSales = 0;
        let todaySales = 0;

        selectedEmployeeName.split(', ').forEach((name) => {
          const employeeKey = employeeKeys.find(
            (key) => key.toLowerCase() === name.toLowerCase()
          );
          if (employeeKey && parsedData.data[employeeKey]) {
            const empData = parsedData.data[employeeKey];
            totalSales += empData.total || 0;
            monthSales += empData.currentMonthTotal || 0;
            weekSales += empData.weekTotal || 0;
            todaySales += empData.todayTotal || 0;
          }
        });

        setSalesData({
          total: totalSales,
          month: monthSales,
          week: weekSales,
          today: todaySales,
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSalesData({ total: 0, month: 0, week: 0, today: 0 });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSalesIcon = (type) => {
    const icons = {
      total: 'trending-up',
      month: 'calendar',
      week: 'calendar-outline',
      today: 'today',
    };
    return icons[type] || 'stats-chart';
  };

  const getSalesColor = (type) => {
    const colors = {
      total: '#10B981',
      month: '#3B82F6',
      week: '#8B5CF6',
      today: '#F59E0B',
    };
    return colors[type] || '#64748B';
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Sales Data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="bar-chart" size={20} color="#007AFF" />
          <Text style={styles.title}>Employee Sales</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchSalesData}>
          <Ionicons name="refresh" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {selectedEmployeeName ? (
        <View style={styles.content}>
          <Text style={styles.selectedEmployee}>
            {selectedEmployeeName.length > 30 
              ? selectedEmployeeName.substring(0, 30) + '...' 
              : selectedEmployeeName
            }
          </Text>

          <View style={styles.metricsGrid}>
            {Object.entries(salesData).map(([key, value]) => (
              <View key={key} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Ionicons 
                    name={getSalesIcon(key)} 
                    size={18} 
                    color={getSalesColor(key)} 
                  />
                  <Text style={[styles.metricLabel, { color: getSalesColor(key) }]}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                </View>
                <Text style={styles.metricValue}>
                  {formatCurrency(value)}
                </Text>
              </View>
            ))}
          </View>

          {targetSale > 0 && (
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>Monthly Target</Text>
              <Text style={styles.targetValue}>{formatCurrency(targetSale)}</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min((salesData.month / targetSale) * 100, 100)}%`,
                      backgroundColor: salesData.month >= targetSale ? '#10B981' : '#3B82F6',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {((salesData.month / targetSale) * 100).toFixed(1)}% of target
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Select employees to view sales data</Text>
        </View>
      )}
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
  refreshButton: {
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
  selectedEmployee: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  targetSection: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
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
});

export default EmployeeSalesCard;
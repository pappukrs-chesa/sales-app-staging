import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

const TrendChartCard = ({ 
  selectedEmployeeName, 
  employeeData = {},
  targetSale = 0 
}) => {
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    fetchBookingData();
  }, []);

  const fetchBookingData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('BookingCard');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setBookingData(parsed);
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
    }
  };

  const chartData = useMemo(() => {
    if (!bookingData || !selectedEmployeeName || !bookingData.data) {
      return null;
    }

    const selectedEmployeeNames = selectedEmployeeName
      .split(', ')
      .map(name => name.toLowerCase());

    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Aggregate monthly data for selected employees
    const aggregatedMonthlyData = {};
    
    selectedEmployeeNames.forEach(employeeName => {
      const employeeKey = Object.keys(bookingData.data).find(
        key => key.toLowerCase() === employeeName
      );

      if (employeeKey && bookingData.data[employeeKey]) {
        const employee = bookingData.data[employeeKey];
        
        if (employee.monthlyTotals) {
          Object.entries(employee.monthlyTotals).forEach(([monthYear, sales]) => {
            const [monthName, year] = monthYear.split(' ');
            const key = `${monthName} ${year}`;
            aggregatedMonthlyData[key] = (aggregatedMonthlyData[key] || 0) + sales;
          });
        }
      }
    });

    // Convert to sorted array and get last 6 months
    const sortedData = Object.entries(aggregatedMonthlyData)
      .map(([monthYear, sales]) => {
        const [monthName, year] = monthYear.split(' ');
        return {
          name: monthName,
          year: parseInt(year, 10),
          sales: Math.floor(sales),
          target: targetSale,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year;
        }
        return monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name);
      })
      .slice(-6); // Get last 6 months

    if (sortedData.length === 0) {
      return null;
    }

    const data = sortedData.map(item => item.sales);
    const labels = sortedData.map(item => item.name.substring(0, 3));

    return {
      labels,
      datasets: [
        {
          data,
          strokeWidth: 3,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        },
      ],
    };
  }, [bookingData, selectedEmployeeName, targetSale]);

  const trendAnalysis = useMemo(() => {
    if (!chartData || chartData.datasets[0].data.length < 2) {
      return {
        trend: 'stable',
        percentage: 0,
        message: 'Insufficient data for trend analysis',
      };
    }

    const data = chartData.datasets[0].data;
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    if (previous === 0) {
      return {
        trend: latest > 0 ? 'up' : 'stable',
        percentage: 0,
        message: latest > 0 ? 'Growth from zero' : 'No sales data',
      };
    }

    const change = ((latest - previous) / previous) * 100;
    const trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    
    let message = '';
    if (trend === 'up') {
      message = `Sales increased by ${Math.abs(change).toFixed(1)}%`;
    } else if (trend === 'down') {
      message = `Sales decreased by ${Math.abs(change).toFixed(1)}%`;
    } else {
      message = 'Sales remained stable';
    }

    return {
      trend,
      percentage: Math.abs(change),
      message,
    };
  }, [chartData]);

  const getTrendColor = () => {
    switch (trendAnalysis.trend) {
      case 'up': return '#10B981';
      case 'down': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getTrendIcon = () => {
    switch (trendAnalysis.trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  if (!selectedEmployeeName) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="analytics" size={20} color="#007AFF" />
            <Text style={styles.title}>Sales Trend</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Please select an employee to view trend</Text>
        </View>
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="analytics" size={20} color="#007AFF" />
            <Text style={styles.title}>Sales Trend</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No trend data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="analytics" size={20} color="#007AFF" />
          <Text style={styles.title}>Sales Trend</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.trendSummary}>
          <View style={styles.trendIndicator}>
            <Ionicons 
              name={getTrendIcon()} 
              size={20} 
              color={getTrendColor()} 
            />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {trendAnalysis.percentage > 0 && `${trendAnalysis.percentage.toFixed(1)}%`}
            </Text>
          </View>
          <Text style={styles.trendMessage}>
            {trendAnalysis.message}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={Math.max(screenWidth - 80, 300)}
              height={180}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#3B82F6',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#E2E8F0',
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={false}
            />
          </View>
        </ScrollView>

        <View style={styles.statsContainer}>
  <View style={styles.statItem}>
    <Text style={styles.statValue}>
      ₹{Math.max(...chartData.datasets[0].data).toLocaleString('en-IN')}
    </Text>
    <Text style={styles.statLabel}>Peak Sales</Text>
  </View>
  <View style={styles.statDivider} />
  <View style={styles.statItem}>
    <Text style={styles.statValue}>
      ₹{Math.min(...chartData.datasets[0].data).toLocaleString('en-IN')}
    </Text>
    <Text style={styles.statLabel}>Lowest Sales</Text>
  </View>
  <View style={styles.statDivider} />
  <View style={styles.statItem}>
    <Text style={styles.statValue}>
      ₹{(
        chartData.datasets[0].data.reduce((a, b) => a + b, 0) /
        chartData.datasets[0].data.length
      ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </Text>
    <Text style={styles.statLabel}>Average</Text>
  </View>
</View>

      </View>
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
  content: {
    flex: 1,
  },
  trendSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  trendMessage: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
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

export default TrendChartCard;
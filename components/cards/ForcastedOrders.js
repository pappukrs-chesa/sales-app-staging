import React, { useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { Card, DataTable } from 'react-native-paper';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import moment from 'moment';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const ForecastedOrders = ({
  leads,
  selectedEmployeeName,
  rewardCardForecast,
  setRewardCardForecast,
}) => {
  const [isFiltered, setIsFiltered] = useState(false);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const currentMonthName = moment().format('MMMM');
  const today = moment();
  const isFirstFiveDays = today.date() <= 5;
  const storedRole = sessionStorage.getItem('role');
  const fadeAnim = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const filterLeadsByCurrentMonth = (lead) => {
    const closingDate = moment(lead.expect_date);
    const startOfMonth = today.clone().startOf('month');
    const endOfMonth = today.clone().endOf('month');
    return closingDate.isBetween(startOfMonth, endOfMonth, null, '[]');
  };

  const filteredLeads = useMemo(() => {
    try {
      if (!Array.isArray(leads)) {
        console.error('Error: `leads` is not an array. Defaulting to an empty array.');
        return [];
      }

      const employees = Array.isArray(selectedEmployeeName)
        ? selectedEmployeeName
        : selectedEmployeeName.split(',').map(name => name.trim());

      const lowerCaseSelectedEmployeeNames = employees.map(name => {
        if (name.toLowerCase() === 'nitish ray') {
          return 'nithish';
        }
        return name.toLowerCase();
      });

      let filtered = leads.filter(lead => {
        const leadEmployeeName = lead.SalesEmployee.toLowerCase();
        return lowerCaseSelectedEmployeeNames.includes(leadEmployeeName);
      });

      if (isFiltered) {
        filtered = filtered.filter(filterLeadsByCurrentMonth);
      }

      return filtered;
    } catch (error) {
      console.error('Error filtering leads:', error);
      return [];
    }
  }, [leads, selectedEmployeeName, isFiltered]);

  const totalLeadsForMonth = useMemo(
    () => filteredLeads.length,
    [filteredLeads]
  );

  const totalValue = useMemo(() => {
    return filteredLeads.reduce(
      (acc, lead) => acc + (lead.value ? parseFloat(lead.value) : 0),
      0
    );
  }, [filteredLeads]);

  const handleForecastOrdersClick = async () => {
    const employeeID = Number(sessionStorage.getItem('employeeID'));
    const storedUser = JSON.parse(sessionStorage.getItem('user'));
    const employeeTarget = Number(storedUser?.target);
    setIsForecastLoading(true);
    
    Toast.show({
      type: 'info',
      text1: 'Checking forecast details...',
      position: 'bottom',
    });

    const forecastData = {
      employeeid: employeeID,
      activity_type: 2,
      target: employeeTarget,
    };

    try {
      const forecastResponse = await axios.post(
        `https://api.chesadentalcare.com/add_order_forecast_points`,
        forecastData
      );
      
      Toast.show({
        type: 'success',
        text1: 'Forecast checked successfully',
        position: 'bottom',
      });

      if (forecastResponse.status === 200 && forecastResponse.data && forecastResponse.data.data) {
        const pointsData = forecastResponse.data.data.data;
        const forecastPoints = pointsData.points;
        setRewardCardForecast(true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setRewardCardForecast(false);
        Toast.show({
          type: 'info',
          text1: 'Forecast checked - no points added',
          position: 'bottom',
        });
      } else {
        console.error('Error during forecast leads:', error.message);
        Toast.show({
          type: 'error',
          text1: 'Error checking forecast',
          text2: error.message,
          position: 'bottom',
        });
      }
    } finally {
      setIsForecastLoading(false);
    }
  };

  const renderRow = (item) => (
    <DataTable.Row key={item.orderid} style={styles.tableRow}>
      <DataTable.Cell style={styles.tableCell}>{item.orderid}</DataTable.Cell>
      <DataTable.Cell style={styles.tableCell}>{item.ordernumber}</DataTable.Cell>
      <DataTable.Cell style={styles.tableCell}>{item.name}</DataTable.Cell>
      <DataTable.Cell style={styles.tableCell}>
        {moment(item.expect_date).format('YYYY-MM-DD')}
      </DataTable.Cell>
      <DataTable.Cell style={styles.tableCell}>₹{item.value}</DataTable.Cell>
      <DataTable.Cell style={styles.tableCell}>{item.SalesEmployee}</DataTable.Cell>
    </DataTable.Row>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setIsFiltered(!isFiltered)}
              >
                <Text style={styles.buttonText}>
                  {isFiltered ? 'Show All Orders' : `Filter ${currentMonthName}'s Orders`}
                </Text>
                <AntDesign name="setting" size={18} color="white" />
              </TouchableOpacity>

              {isFirstFiveDays && (
                <TouchableOpacity
                  style={[styles.filterButton, styles.forecastButton]}
                  onPress={handleForecastOrdersClick}
                  disabled={isForecastLoading}
                >
                  {isForecastLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Check Forecasting</Text>
                      <FontAwesome name="plus" size={18} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {isFiltered
                  ? `Forecasted Orders for ${currentMonthName} (${totalLeadsForMonth} Orders)`
                  : `Forecasted Orders in pipeline Till ${currentMonthName} (${filteredLeads.length})`}
              </Text>
              <Text style={styles.subtitle}>
                Total value of orders:{' '}
                <Text style={styles.valueText}>
                  ₹{totalValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </Text>
            </View>

            {leads.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a6da7" />
              </View>
            ) : (
              <ScrollView horizontal>
                <DataTable style={styles.table}>
                  <DataTable.Header style={styles.tableHeader}>
                    <DataTable.Title style={styles.headerCell}>Order ID</DataTable.Title>
                    <DataTable.Title style={styles.headerCell}>Order Number</DataTable.Title>
                    <DataTable.Title style={styles.headerCell}>Customer Name</DataTable.Title>
                    <DataTable.Title style={styles.headerCell}>Closing Date</DataTable.Title>
                    <DataTable.Title style={styles.headerCell}>Value</DataTable.Title>
                    <DataTable.Title style={styles.headerCell}>Sales Employee</DataTable.Title>
                  </DataTable.Header>

                  <ScrollView style={styles.tableBody}>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map(renderRow)
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No data available</Text>
                      </View>
                    )}
                  </ScrollView>
                </DataTable>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
      </LinearGradient>
      <Toast />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    borderRadius: 12,
    padding: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#917bff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  forecastButton: {
    backgroundColor: '#4a6da7',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 14,
  },
  titleContainer: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  valueText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    width: width * 1.5,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  tableHeader: {
    backgroundColor: '#f57c00',
  },
  headerCell: {
    justifyContent: 'center',
    minWidth: 120,
  },
  tableBody: {
    maxHeight: 300,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    justifyContent: 'center',
    minWidth: 120,
    paddingVertical: 12,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
});

export default ForecastedOrders;
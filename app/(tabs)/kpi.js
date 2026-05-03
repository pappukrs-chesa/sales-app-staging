import React, { useState, useEffect, useCallback , useRef} from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from '../../ContextAPI/AuthContext';

// Import KPI components
import EmployeeSalesCard from '../../components/kpi/EmployeeSalesCard';
import SalesEmployeeCard from '../../components/kpi/SalesEmployeeCard';
import PaymentReceivedCard from '../../components/kpi/PaymentReceivedCard';
import LeadsCard from '../../components/kpi/LeadsCard';
import ForecastedOrdersCard from '../../components/kpi/ForecastedOrdersCard';
import ProgressCard from '../../components/kpi/ProgressCard';
import TrendChartCard from '../../components/kpi/TrendChartCard';
import LeaderBoardCard from '../../components/kpi/LeaderBoardCard';
import AchievementsCard from '../../components/kpi/AchievementsCard';
import { BASE_URL } from '@/config/apiConfig';

const { width, height } = Dimensions.get('window');

// Enhanced Card Wrapper Component with better animations
const AnimatedCard = ({ children, delay = 0, style }) => {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.animatedCard,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <View style={styles.cardInner}>
        {children}
      </View>
    </Animated.View>
  );
};

// Simple Floating Action Button
const FloatingRefreshButton = ({ onPress, refreshing }) => {
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.floatingButton,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity onPress={handlePress} style={styles.floatingButtonInner}>
        {refreshing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.floatingButtonIcon}>↻</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const KPIScreen = () => {
  const { user, token } = useAuth();
  
  // State variables matching the web app
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [salesEmployees, setSalesEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [forecastedData, setForecastedData] = useState([]);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [employeeData, setEmployeeData] = useState({
    total: 0,
    month: 0,
    week: 0,
  });

  // Animation states
  const headerAnim = useState(new Animated.Value(-60))[0];
  
    const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate header entrance
    Animated.timing(headerAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Calculate target sale from selected employees
  const selectedNames = selectedEmployeeName
    .split(',')
    .map((name) => name.trim().toLowerCase());

  const targetSale = salesEmployees.reduce((sum, employee) => {
    const employeeName = employee.username?.trim().toLowerCase() || '';
    if (selectedNames.includes(employeeName)) {
      const targetValue = Number(employee.target);
      if (!isNaN(targetValue)) {
        return sum + targetValue;
      }
    }
    return sum;
  }, 0);

  // Calculate progress percentage
  const progress = Math.min((currentMonthTotal / targetSale) * 100, 100) || 0;

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update current month total when employee selection changes
  useEffect(() => {
    updateCurrentMonthTotal();
  }, [selectedEmployeeName]);

  // Auto-select employees based on user role - matching web implementation
  useEffect(() => {
    const autoSelectBasedOnRole = async () => {
      const role = await AsyncStorage.getItem('role');
      const salesPerson = await AsyncStorage.getItem('sales_person');
      const coordinator = await AsyncStorage.getItem('coordinator');
      
      if (salesEmployees.length > 0 && salesPerson) {
        if (role === 'sale_staff') {
          // For sales staff, auto-select their own name
          const currentUserEmployee = salesEmployees.find(emp => 
            emp.username.toLowerCase() === salesPerson.toLowerCase()
          );
          if (currentUserEmployee) {
            handleEmployeeChange([currentUserEmployee]);
          }
        } else if (role === 'coordinator') {
          // For coordinators, auto-select their own employee object
          const currentUserEmployee = salesEmployees.find(emp => 
            emp.username.toLowerCase() === salesPerson.toLowerCase()
          );
          if (currentUserEmployee) {
            if (coordinator === '0') {
              // If coordinator is 0, select their own name
              handleEmployeeChange([currentUserEmployee]);
            } else if (coordinator > 0) {
              // If coordinator has a team, still select their own name first
              handleEmployeeChange([currentUserEmployee]);
            }
          }
        }
        // For sale_head, don't auto-select anyone - let them choose
      }
    };

    autoSelectBasedOnRole();
  }, [salesEmployees]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load cached leads data immediately, then fetch other data
      await fetchLeadsData(); // This will load from cache first
      
      await Promise.all([
        fetchSalesEmployees(),
        fetchInvoiceData(),
        fetchForecastedData(),
        fetchBookingData(),
        fetchCreditOrderData(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesEmployees = async () => {
    try {
      const response = await fetch(`${BASE_URL}/all_sales_employees_info`);
      const data = await response.json();
      
      const salesPerson = await AsyncStorage.getItem('sales_person');
      const role = await AsyncStorage.getItem('role');
      let filteredData = [];
      const salesPersonLower = salesPerson ? salesPerson.toLowerCase() : "";
      
      if (role === "sale_staff") {
        filteredData = data.filter((staff) => {
          const staffUsernameLower = staff.username
            ? staff.username.toLowerCase()
            : "";
          return staffUsernameLower === salesPersonLower;
        });
      } else if (role === "coordinator") {
        const coordinatorId = {
          "atoofa habib": 1,
          "sangeetha k": 2,
          samrin: 3,
        }[salesPersonLower];
        
        filteredData = data.filter((staff) => {
          const staffCoordinator = Number(staff.coordinator);
          const staffUsernameLower = staff.username ? staff.username.toLowerCase() : "";
          
          // Include if they are part of the coordinator's team OR if they are the coordinator themselves
          return staffCoordinator === coordinatorId || staffUsernameLower === salesPersonLower;
        });
      } else if (role === "sale_head") {
        filteredData = data;
      }
      
      setSalesEmployees(filteredData);
    } catch (error) {
      console.error('Error fetching sales employees:', error);
    }
  };

  const fetchInvoiceData = async () => {
    try {
      let storedData = await AsyncStorage.getItem('InvoiceCard');
      if (!storedData) {
        const response = await fetch(`${BASE_URL}/invoice_in_pipeline`);
        const data = await response.json();
        await AsyncStorage.setItem('InvoiceCard', JSON.stringify(data.data));
        setInvoiceData(data.data);
      } else {
        setInvoiceData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    }
  };

  const fetchLeadsData = async (forceRefresh = false) => {
    try {
      // Always load cached data first for immediate display - NEVER EXPIRES
      const storedLeads = await AsyncStorage.getItem('leadsData');
      if (storedLeads) {
        setLeads(JSON.parse(storedLeads));
        console.log('Loaded leads from cache (never expires)');
        
        // If not forcing refresh, ALWAYS return cached data (never expires)
        if (!forceRefresh) {
          return;
        }
      }
      
      // Only fetch from API if cache is empty OR explicitly refreshing
      if (!storedLeads || forceRefresh) {
        console.log('Fetching leads from API...');
        
        const response = await fetch(`${BASE_URL}/open_leads`);
        if (!response.ok) {
          throw new Error('Failed to fetch leads data');
        }
        
        const salesEmpResponse = await fetch(`${BASE_URL}/sales_emp_names`);
        if (!salesEmpResponse.ok) {
          throw new Error('Failed to fetch sales employee names');
        }
        
        const salesEmpData = await salesEmpResponse.json();
        const salesEmpMap = salesEmpData.reduce((acc, emp) => {
          if (emp.SalesPersonCode !== null) {
            acc[emp.SalesPersonCode] = emp.SalesEmpName;
          }
          return acc;
        }, {});
        
        const data = await response.json();
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const extractedLeads = data.value
          .map((lead) => ({
            SequentialNo: lead.SalesOpportunities.SequentialNo,
            CardName: lead.BusinessPartners.CardName,
            Phone: lead.BusinessPartners.Cellular,
            SalesEmpName: salesEmpMap[lead.SalesOpportunities.SalesPerson],
            StartDate: lead.SalesOpportunities.StartDate,
            PredictedClosingDate: lead.SalesOpportunities.PredictedClosingDate,
            MaxLocalTotal: lead.SalesOpportunities.MaxLocalTotal,         
            Source: lead.SalesOpportunities.Source,
            InterestLevel: lead.SalesOpportunities.InterestLevel,
            State: lead.BusinessPartners.BillToState,
            ProductInterested: lead.SalesOpportunities.SalesOpportunitiesInterests?.map(
              (interest) => interest.InterestDescription
            ).join(", "),
            City: lead.BusinessPartners.City,
            DataOwnershipfield: lead.SalesOpportunities.DataOwnershipfield,
            Remarks: lead.SalesOpportunities.Remarks || "",
            salesOpportunityDetails: lead.SalesOpportunities.SalesOpportunitiesLines,
            OpportunityName: lead.SalesOpportunities.OpportunityName,
          }))
          .filter((lead) => {
            const closingDate = new Date(lead.PredictedClosingDate);
            return (
              closingDate.setHours(0, 0, 0, 0) <= endOfMonth.setHours(0, 0, 0, 0)
            );
          });
        
        await AsyncStorage.setItem('leadsData', JSON.stringify(extractedLeads));
        setLeads(extractedLeads);
        console.log('Fetched and cached new leads data');
      }
    } catch (error) {
      console.error('Error fetching leads data:', error);
      // If API fails but we have cached data, show message but keep cached data
      if (forceRefresh && leads.length > 0) {
        Alert.alert('Network Error', 'Could not refresh data. Showing cached results.');
      }
    }
  };

  const fetchForecastedData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/forecasted_orders`);
      const data = await response.json();
      const currentDate = new Date();
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );
      const filteredData = data.data.filter((order) => {
        const expectDate = new Date(order.expect_date);
        return expectDate <= endOfMonth;
      });
      setForecastedData(filteredData);
    } catch (error) {
      console.error('Error fetching forecasted data:', error);
    }
  };

  const fetchBookingData = async () => {
    try {
      let bookingData = await AsyncStorage.getItem('BookingCard');
      if (!bookingData) {
        const response = await fetch(`${BASE_URL}/booking_in_pipeline`);
        const data = await response.json();
        await AsyncStorage.setItem('BookingCard', JSON.stringify(data));
        bookingData = JSON.stringify(data);
      }
      return JSON.parse(bookingData);
    } catch (error) {
      console.error('Error fetching booking data:', error);
      return null;
    }
  };

  const updateCurrentMonthTotal = async () => {
    try {
      const parsedData = await fetchBookingData();
      if (parsedData) {
        const employeeKeys = Object.keys(parsedData.data || {});
        let totalCurrentMonth = 0;

        selectedEmployeeName.split(', ').forEach((name) => {
          const employeeKey = employeeKeys.find(
            (key) => key.toLowerCase() === name.toLowerCase()
          );
          if (employeeKey) {
            const percentageData = parsedData.data[employeeKey];
            totalCurrentMonth += percentageData.currentMonthTotal || 0;
          }
        });

        setCurrentMonthTotal(totalCurrentMonth);
      }
    } catch (error) {
      console.error('Error updating current month total:', error);
    }
  };

  const fetchCreditOrderData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/credit-order-details`);
      const data = await response.json();
      const { creditOrderDetailsEmployee } = data;
      setEmployeeData(creditOrderDetailsEmployee);
    } catch (error) {
      console.error('Error fetching credit order data:', error);
    }
  };

  const handleEmployeeChange = (employees) => {
    setSelectedEmployee(employees);
    const names = employees.map(emp => emp.username).join(', ');
    setSelectedEmployeeName(names);
  };

  const handleForceRefresh = () => {
    console.log('Force refreshing leads data...');
    fetchLeadsData(true);
  };

  const onRefresh = useCallback(async () => {
    console.log('Refreshing all data...');
    setRefreshing(true);
    // Clear cache for all data to force refresh
    await AsyncStorage.multiRemove(['leadsData', 'InvoiceCard', 'BookingCard']);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  // Calculate total forecasted value for selected employees
  const calculateForecastedTotal = () => {
    if (!selectedEmployeeName || !forecastedData) return 0;

    const selectedNames = selectedEmployeeName
      .split(',')
      .map((name) => name.trim().toLowerCase());

    return forecastedData.reduce((total, order) => {
      const orderSalesPerson = order.sales_person?.trim().toLowerCase() || '';
      if (selectedNames.includes(orderSalesPerson)) {
        const orderValue = Number(order.total_amount) || 0;
        return total + orderValue;
      }
      return total;
    }, 0);
  };

  const forecastedTotal = calculateForecastedTotal();

  const renderKPICards = () => {
    return (
      <View style={styles.cardsContainer}>
        {/* Modern Card Layout with Staggered Animations */}
        <AnimatedCard delay={250}>
          <ProgressCard
            progress={progress}
            title="This Month Sales Progress"
            orderBooked={currentMonthTotal}
            forecast={forecastedTotal}
            target={targetSale}
          />
        </AnimatedCard>
        
        <AnimatedCard delay={100}>
          <SalesEmployeeCard
            salesEmployees={salesEmployees}
            selectedEmployee={selectedEmployee}
            onEmployeeChange={handleEmployeeChange}
            employeeSales={currentMonthTotal}
            targetSale={targetSale}
          />
        </AnimatedCard>

        <AnimatedCard delay={150}>
          <EmployeeSalesCard
            selectedEmployeeName={selectedEmployeeName}
            employeeData={employeeData}
            targetSale={targetSale}
          />
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <PaymentReceivedCard
            selectedEmployeeName={selectedEmployeeName}
            targetSale={targetSale}
            employeeData={invoiceData}
          />
        </AnimatedCard>


        <AnimatedCard delay={300}>
          <TrendChartCard
            selectedEmployeeName={selectedEmployeeName}
            employeeData={employeeData}
            targetSale={targetSale}
          />
        </AnimatedCard>

        <AnimatedCard delay={350}>
          <LeadsCard
            leads={leads}
            selectedEmployeeName={selectedEmployeeName}
            refreshLeads={handleForceRefresh}
          />
        </AnimatedCard>

        <AnimatedCard delay={400}>
          <ForecastedOrdersCard
            leads={forecastedData}
            selectedEmployeeName={selectedEmployeeName}
          />
        </AnimatedCard>

        <AnimatedCard delay={450}>
          <LeaderBoardCard 
            salesEmployees={salesEmployees}
            selectedEmployeeName={selectedEmployeeName}
          />
        </AnimatedCard>

        <AnimatedCard delay={500}>
          <AchievementsCard />
        </AnimatedCard>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we prepare your data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
            progressBackgroundColor="#ffffff"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderKPICards()}
      </ScrollView>
      {/* Simple Floating Action Button */}
      <FloatingRefreshButton onPress={onRefresh} refreshing={refreshing} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    paddingTop: Platform.OS === 'android' ? 50 : 50,
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  versionText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.5,
  }, versionContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingBottom: 30,
    gap: 6,
  },
  
  companyText: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },
  headerSafeArea: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 90,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginHorizontal: 40,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  animatedCard: {
    marginBottom: 20,
  },
  cardInner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 1000,
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingButtonIcon: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default KPIScreen;
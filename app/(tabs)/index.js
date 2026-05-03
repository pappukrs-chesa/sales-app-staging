import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions,
  FlatList,
  Linking,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import moment from "moment";
import SalesOpportunityLines from "@/components/leads/SalesOppLines";
import { router } from "expo-router";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from 'react-native-calendars';
import Constants from "expo-constants";
import OrderForecast from "@/components/points/OrderForecast";
import { usePoints } from "../../ContextAPI/PointsContext";
import { BASE_URL } from '@/config/apiConfig';

const { width, height } = Dimensions.get("window");
const isAndroid = Platform.OS === "android";

// Cache configuration - Cache never expires automatically
const CACHE_KEYS = {
  LEADS_DATA: "cachedLeadsData",
  EMPLOYEE_DETAILS: "EmpDetails",
  STAGE_KEYS: "stageKeys",
  LEADS_WITH_DETAILS: "leadsWithDetails",
};

const OpenLeads = () => {
  // State management
  const { addPointsToTable } = usePoints();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [sortBy, setSortBy] = useState("SequentialNo");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);
  const [salesOpportunity, setSalesOpportunity] = useState({});
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpAction, setNewFollowUpAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [stageKeys, setStageKeys] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [currentFollowUpLead, setCurrentFollowUpLead] = useState(null);
  const [showSortModal, setShowSortModal] = useState(false);
  const [loadingSalesOpportunities, setLoadingSalesOpportunities] =
    useState(false);
  const [role, setRole] = useState("");
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const [storedEmpCode, setStoredEmpCode] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [forecastingLead, setForecastingLead] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastPredictedDate, setForecastPredictedDate] = useState("");
  const [forecastValue, setForecastValue] = useState("");
  const [showForecastDatePicker, setShowForecastDatePicker] = useState(false);
  const [tempFollowUpDate, setTempFollowUpDate] = useState(null);
  const [tempForecastDate, setTempForecastDate] = useState(null);

  // Press and hold timer refs
  const pressTimer = useRef(null);

  const navigation = useNavigation();

  const checkMorningFollowUps = async () => {
    try {
      // Check if we've already checked today
      const lastCheck = await AsyncStorage.getItem('lastFollowUpCheck');
      const today = moment().format('YYYY-MM-DD');

      if (lastCheck === today) {
        console.log('Already checked for follow-ups today');
        return;
      }

      // Get user's employee code
      const userData = await AsyncStorage.getItem('user');

      if (!userData) {
        console.log('No user data found, skipping follow-up check');
        return;
      }

      const user = JSON.parse(userData);
      // IMPORTANT: Use employeeCode from login response (maps to EmployeeCode in sale_staff table)
      // This is NOT the user.id, but the EmployeeCode field (e.g., 6 for Sudhir Pujar)
      const employeeCode = user.employeeCode;

      if (!employeeCode) {
        console.log('No employeeCode found in user data, skipping follow-up check');
        console.log('Available user fields:', Object.keys(user));
        return;
      }

      console.log(`Checking follow-ups for EmployeeCode: ${employeeCode}`);

      // Fetch today's follow-up leads using EmployeeCode
      try {
        const response = await fetch(
          `${BASE_URL}/notifications/leads/today/${employeeCode}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.count > 0) {
            // Show local notification
            Alert.alert(
              '📋 Follow-Up Reminder',
              `You have ${data.count} lead${data.count > 1 ? 's' : ''} due for follow-up today!`,
              [
                { text: 'Later', style: 'cancel' },
                { text: 'View Leads', onPress: () => console.log('Navigate to leads') }
              ]
            );

            // Store notification locally
            const newNotification = {
              id: `followup-${Date.now()}`,
              title: '📋 Follow-Up Reminder',
              body: `You have ${data.count} lead${data.count > 1 ? 's' : ''} due for follow-up today`,
              data: {
                type: 'lead_followup',
                count: data.count,
                date: today,
                leads: data.data
              },
              timestamp: new Date().toISOString(),
              read: false
            };

            const stored = await AsyncStorage.getItem('notifications');
            const notifications = stored ? JSON.parse(stored) : [];
            notifications.unshift(newNotification);
            await AsyncStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
          }

          // Mark today as checked
          await AsyncStorage.setItem('lastFollowUpCheck', today);
        }
      } catch (apiError) {
        console.error('Error fetching follow-up leads:', apiError);
        // Don't block the app if this fails
      }
    } catch (error) {
      console.error('Error in checkMorningFollowUps:', error);
    }
  };

  useEffect(() => {
    checkUserInStorage();
    checkMorningFollowUps();
  }, []);

  const checkUserInStorage = async () => {
    try {
      setIsCheckingStorage(true);
      const userData = await AsyncStorage.getItem("user");

      if (userData) {
        router.navigate("/(tabs)");
      } else {
        router.navigate("/auth");
      }
    } catch (error) {
      console.error("Error checking user in storage:", error);
    } finally {
      setIsCheckingStorage(false);
    }
  };

  // Get role and empCode
  useEffect(() => {
    const getRoleAndEmpCode = async () => {
      try {
        const userRole = await AsyncStorage.getItem("role");
        const empCode = await AsyncStorage.getItem("sales_person");
        setRole(userRole || "");
        setStoredEmpCode(empCode || "");
      } catch (error) {
        console.error("Error getting role/empCode:", error);
      }
    };

    getRoleAndEmpCode();
  }, []);

  // Cache never expires - always use cached data unless manually refreshed
  const isCacheValid = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.LEADS_DATA);
      // Cache is valid if data exists - never expires automatically
      return !!cachedData;
    } catch (error) {
      console.error("Error checking cache validity:", error);
      return false;
    }
  };

  // Get employee details with caching
  const getEmployeeDetailsMobile = async () => {
    try {
      const storedEmployees = await AsyncStorage.getItem(
        CACHE_KEYS.EMPLOYEE_DETAILS
      );

      if (!storedEmployees) {
        // console.log("No employee details found in AsyncStorage, fetching...");

        const empResponse = await fetch(
          `${BASE_URL}/sales_emp_names`
        );

        if (!empResponse.ok) {
          throw new Error(`Failed to fetch emp details: ${empResponse.status}`);
        }

        const empData = await empResponse.json();
        await AsyncStorage.setItem(
          CACHE_KEYS.EMPLOYEE_DETAILS,
          JSON.stringify(empData)
        );

        // console.log("Employee details fetched and stored in AsyncStorage");
        return empData;
      } else {
        // console.log("Employee details found in AsyncStorage");
        return JSON.parse(storedEmployees);
      }
    } catch (error) {
      console.error("Error getting employee details (Mobile):", error);
      throw error;
    }
  };

  // Fetch leads data from API
  const fetchLeadsFromAPI = async () => {
    try {
      // console.log("Fetching fresh leads data from API...");

      const [currentSalesPerson, role, storedUser] = await Promise.all([
        AsyncStorage.getItem("sales_person"),
        AsyncStorage.getItem("role"),
        AsyncStorage.getItem("user"),
      ]);

      console.log("🔍 Mobile Leads Debug - User Data:");
      console.log("  - currentSalesPerson:", currentSalesPerson);
      console.log("  - role:", role);
      console.log("  - storedUser:", storedUser);

      if (!currentSalesPerson || !role) {
        throw new Error("Salesperson or role not found");
      }

      const [leadsResponse, teamMembersResponse] = await Promise.all([
        fetch(`${BASE_URL}/open_leads`),
        role === "coordinator"
          ? fetch(`${BASE_URL}/all_sales_employees_info`)
          : Promise.resolve(null),
      ]);

      if (!leadsResponse.ok) throw new Error("Failed to fetch leads data");

      const data = await leadsResponse.json();
      const extractedLeads = data.value.filter(
        (item) =>
          item.SalesOpportunities && item.SalesOpportunities.InterestLevel !== 5
      );

      // Get employee details
      const salesEmpDetails = await getEmployeeDetailsMobile();
      const salesEmpMap = new Map(
        Object.entries(salesEmpDetails).map(([key, value]) => [
          value.SalesPersonCode,
          value.SalesEmpName,
        ])
      );

      const ordersWithSalesEmpNames = extractedLeads.map((lead) => ({
        ...lead,
        salesEmployeeName:
          salesEmpMap.get(lead.SalesOpportunities?.SalesPerson) || "Unknown",
      }));

      let teamMemberNames = null;
      if (role === "coordinator" && teamMembersResponse) {
        const allEmployees = await teamMembersResponse.json();
        const cleanSP = currentSalesPerson.trim().toLowerCase();
        const coordinatorId = {
          "atoofa habib": 1,
          "sangeetha k": 2,
          "samrin": 3,
        }[cleanSP];

        console.log("👥 Team Resolution Debug:");
        console.log("  - Coordinator name:", cleanSP);
        console.log("  - Coordinator ID:", coordinatorId);
        console.log("  - Total employees from API:", allEmployees.length);
        console.log("  - Sample employee coordinator values:", allEmployees.slice(0, 5).map(e => ({ name: e.username, coordinator: e.coordinator })));

        const teamMembers = allEmployees.filter((staff) => {
          const staffCoordinator = Number(staff.coordinator);
          const staffUsernameLower = staff.username
            ? staff.username.toLowerCase()
            : "";
          return (
            staffCoordinator === coordinatorId ||
            staffUsernameLower === cleanSP
          );
        });

        teamMemberNames = teamMembers.map((m) =>
          m.username.trim().toLowerCase()
        );
        console.log("  - Team members found:", teamMemberNames.length);
        console.log("  - Team member names:", teamMemberNames);
      }

      const filteredLeads = filterLeadsByRole(
        ordersWithSalesEmpNames,
        role,
        currentSalesPerson,
        teamMemberNames
      );

      // Cache the filtered leads data (never expires)
      await Promise.all([
        AsyncStorage.setItem(
          CACHE_KEYS.LEADS_DATA,
          JSON.stringify(filteredLeads)
        ),
        AsyncStorage.setItem(
          CACHE_KEYS.LEADS_WITH_DETAILS,
          JSON.stringify(filteredLeads)
        ),
      ]);

      // console.log("Leads data cached successfully");
      return filteredLeads;
    } catch (error) {
      console.error("Error fetching leads from API:", error);
      throw error;
    }
  };

  // Get leads data (from cache or API) - Cache never expires automatically
  const getLeadsData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        // Always use cached data if available - NEVER EXPIRES
        const cachedData = await AsyncStorage.getItem(CACHE_KEYS.LEADS_DATA);
        if (cachedData) {
          console.log("Using cached leads data (never expires)");
          return JSON.parse(cachedData);
        }
      }

      // Fetch fresh data only if no cache exists OR force refresh
      console.log("Fetching fresh leads data from API");
      return await fetchLeadsFromAPI();
    } catch (error) {
      // Fallback to cached data if API fails
      console.log("API failed, trying to use cached data as fallback...");
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.LEADS_DATA);
      if (cachedData) {
        console.log("Using cached data as fallback");
        return JSON.parse(cachedData);
      }
      throw error;
    }
  };

  // Main fetch leads function
  const fetchLeads = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const leadsData = await getLeadsData(showRefresh);
      setLeads(leadsData);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setError("Failed to fetch leads. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Clear cache function (useful for debugging or manual refresh)
  const clearCache = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEYS.LEADS_DATA),
        AsyncStorage.removeItem(CACHE_KEYS.LEADS_WITH_DETAILS),
      ]);
      console.log("Leads cache cleared successfully");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  };

  // Force refresh function
  const forceRefresh = async () => {
    try {
      await clearCache();
      await fetchLeads(true);
    } catch (error) {
      console.error("Error in force refresh:", error);
    }
  };

  const toggleFollowUp = async (seqNo) => {
    if (expandedRows.includes(seqNo)) {
      setExpandedRows(expandedRows.filter((row) => row !== seqNo));
      setSalesOpportunity({});
    } else {
      setExpandedRows([seqNo]);
      setLoadingSalesOpportunities(true);

      try {
        // Try to get from current leads data first
        let leadsWithDetails = leads;

        // If not found, check AsyncStorage
        if (!leadsWithDetails || leadsWithDetails.length === 0) {
          const storedLeads = await AsyncStorage.getItem(
            CACHE_KEYS.LEADS_WITH_DETAILS
          );
          if (storedLeads) {
            leadsWithDetails = JSON.parse(storedLeads);
          } else {
            throw new Error("No leads data found");
          }
        }

        const data = leadsWithDetails.find(
          (lead) => lead.SalesOpportunities?.SequentialNo === seqNo
        );

        if (!data) throw new Error("Lead not found");

        setSalesOpportunity(data.SalesOpportunities || {});
        setCurrentFollowUpLead(data);

        if (
          data.SalesOpportunities?.SalesOpportunitiesLines &&
          data.SalesOpportunities.SalesOpportunitiesLines.length > 0
        ) {
          const lastEntry =
            data.SalesOpportunities.SalesOpportunitiesLines[
              data.SalesOpportunities.SalesOpportunitiesLines.length - 1
            ];
          setNewFollowUpAction(
            lastEntry.StageKey ? lastEntry.StageKey.toString() : ""
          );
          setNewFollowUpDate(
            lastEntry.ClosingDate ? lastEntry.ClosingDate.split("T")[0] : ""
          );
        }
      } catch (error) {
        console.error("Error fetching sales opportunity:", error);
        Alert.alert("Error", "Failed to load follow-up details");
      } finally {
        setLoadingSalesOpportunities(false);
      }
    }
  };

  const handleForecastLead = async () => {
    if (!forecastingLead) return;

    setIsForecastLoading(true);

    try {
      const userData = await AsyncStorage.getItem("user");
      const empCode = await AsyncStorage.getItem("sales_person");
      const parsedUser = userData ? JSON.parse(userData) : {};
      const target = parsedUser.target || 0;
      const employeeId = parsedUser.id || empCode;

      const sequentialNo = forecastingLead.SalesOpportunities?.SequentialNo;
      const existingOpportunityName =
        forecastingLead.SalesOpportunities?.OpportunityName;
      const currentDate = new Date().toISOString();
      const forecastInfo = existingOpportunityName
        ? `old ${currentDate}`
        : `new ${currentDate}`;

      // Validate predicted closing date is selected
      if (!forecastPredictedDate) {
        Alert.alert("Error", "Please select a predicted closing date");
        return;
      }

      // Use selected predicted closing date
      const predictedClosingDate = new Date(
        forecastPredictedDate
      ).toISOString();

      const data = {
        SequentialNo: sequentialNo,
        PredictedClosingDate: predictedClosingDate,
        forecastInfo: forecastInfo,
        customerName: forecastingLead.BusinessPartners?.CardName,
        value:
          parseFloat(forecastValue) ||
          forecastingLead.SalesOpportunities?.MaxLocalTotal ||
          0,
        salesEmployee: forecastingLead.salesEmployeeName,
        stage: forecastingLead.SalesOpportunities?.InterestLevel,
        target: target,
        employeeId: employeeId,
      };

      // API call using the web implementation pattern
      const response = await axios.patch(
        `${BASE_URL}/patch_LeadDueDate`,
        data
      );

      if (response.status === 200) {
        Alert.alert("Success", "Lead forecasted successfully!");
        setShowForecastModal(false);
        setForecastingLead(null);
        setForecastPredictedDate("");
        setForecastValue("");

        // Clear cache and refresh leads
        await clearCache();
        await forceRefresh();
      }
    } catch (error) {
      console.error("Error forecasting lead:", error);
      Alert.alert(
        "Error",
        `Failed to forecast lead: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsForecastLoading(false);
    }
  };

  const handleForecastConfirmation = (lead) => {
    setForecastingLead(lead);
    // Initialize with current values
    setForecastPredictedDate(new Date().toISOString().split("T")[0]);
    setForecastValue((lead.SalesOpportunities?.MaxLocalTotal || 0).toString());
    setShowForecastModal(true);
  };

  const handleFollowUpSubmit = async () => {
    if (!newFollowUpDate || !newFollowUpAction) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const selectedCloseDate = new Date(newFollowUpDate);
      const today = new Date();

      if (selectedCloseDate < today) {
        Alert.alert("Error", "The follow-up date must be a future date");
        return;
      }

      const lastLineIndex =
        salesOpportunity.SalesOpportunitiesLines?.length || 0;
      const lastLine =
        salesOpportunity.SalesOpportunitiesLines?.[lastLineIndex - 1];
      const isoDate = new Date(newFollowUpDate).toISOString();
      const newDate = `${isoDate.split("T")[0]}T00:00:00Z`;

      const arr = [
        {
          sequenceId: currentFollowUpLead?.SalesOpportunities?.SequentialNo,
          LineNumber: lastLineIndex,
          startDate: lastLine?.ClosingDate,
          closeDate: newDate,
          stageKey: newFollowUpAction,
          totalPrice:
            currentFollowUpLead?.SalesOpportunities?.MaxLocalTotal || 0,
          remarks: remarks,
        },
      ];

      const response = await axios.patch(
        `${BASE_URL}/patch_followup`,
        arr
      );

      if (response.status === 200) {
        // Clear cache to force refresh on next load

        const points = 25;
        const activityType = 4; // Lead Activity
        await addPointsToTable(points, activityType);
        await clearCache();
        Alert.alert("Success", "Follow-up updated successfully");
        setExpandedRows([]);
        setRemarks("");
        setNewFollowUpDate("");
        setNewFollowUpAction("");
        // Force refresh to get updated data
        await forceRefresh();
      }
    } catch (error) {
      console.error("Error updating follow-up:", error);
      Alert.alert("Error", "Failed to update follow-up");
    }
  };

  // Constants and other functions remain the same...
  const stateCodeMap = {
    AN: { name: "Andaman and Nicobar Islands", zone: 2 },
    AP: { name: "Andhra Pradesh", zone: 2 },
    AR: { name: "Arunachal Pradesh", zone: 4 },
    AS: { name: "Assam", zone: 4 },
    BR: { name: "Bihar", zone: 4 },
    CG: { name: "Chhattisgarh", zone: 5 },
    CH: { name: "Chandigarh", zone: 3 },
    DN: { name: "Dadra and Nagar Haveli", zone: 1 },
    DD: { name: "Daman and Diu", zone: 1 },
    DL: { name: "Delhi", zone: 3 },
    GA: { name: "Goa", zone: 1 },
    GJ: { name: "Gujarat", zone: 1 },
    HR: { name: "Haryana", zone: 3 },
    HP: { name: "Himachal Pradesh", zone: 3 },
    JK: { name: "Jammu and Kashmir", zone: 3 },
    JH: { name: "Jharkhand", zone: 4 },
    KT: { name: "Karnataka", zone: 2 },
    KL: { name: "Kerala", zone: 2 },
    LD: { name: "Lakshadweep", zone: 2 },
    MP: { name: "Madhya Pradesh", zone: 5 },
    MH: { name: "Maharashtra", zone: 1 },
    MN: { name: "Manipur", zone: 4 },
    ML: { name: "Meghalaya", zone: 4 },
    MZ: { name: "Mizoram", zone: 4 },
    NL: { name: "Nagaland", zone: 4 },
    NP: { name: "Nepal", zone: 4 },
    OD: { name: "Odisha", zone: 4 },
    PN: { name: "Punjab", zone: 3 },
    PY: { name: "Puducherry", zone: 2 },
    RJ: { name: "Rajasthan", zone: 3 },
    SK: { name: "Sikkim", zone: 4 },
    TN: { name: "Tamil Nadu", zone: 2 },
    TS: { name: "Telangana", zone: 2 },
    TR: { name: "Tripura", zone: 4 },
    UK: { name: "Uttarakhand", zone: 3 },
    UP: { name: "Uttar Pradesh", zone: 3 },
    WB: { name: "West Bengal", zone: 4 },
  };

  const getInterestLevelColor = (level) => {
    switch (level) {
      case "Hot":
        return "#ff6b6b";
      case "Very Hot":
        return "red";
      case "Warm":
        return "#ffa500";
      case "Cold":
        return "#4ecdc4";
      case "Follow Up":
        return "#45b7d1";
      default:
        return "#95a5a6";
    }
  };

  const getInterestLevelText = (level) => {
    switch (level) {
      case "Hot":
        return "Hot";
      case "Very Hot":
        return "Very Hot";
      case "Warm":
        return "Warm";
      case "Cold":
        return "Cold";
      case "Follow Up":
        return "Follow Up";
      default:
        return "Unknown";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fetchStageKeys = async () => {
    try {
      const storedStageKeys = await AsyncStorage.getItem(CACHE_KEYS.STAGE_KEYS);
      if (storedStageKeys) {
        setStageKeys(JSON.parse(storedStageKeys));
      } else {
        const response = await fetch(
          `${BASE_URL}/getStageKey`
        );
        if (!response.ok)
          throw new Error("Failed to fetch stage key definitions");
        const data = await response.json();
        const keys = data.stageKeys.value;
        await AsyncStorage.setItem(CACHE_KEYS.STAGE_KEYS, JSON.stringify(keys));
        setStageKeys(keys);
      }
    } catch (error) {
      console.error("Error fetching stage keys:", error);
    }
  };

  const filterLeadsByRole = (leads, role, currentSalesPerson, teamMemberNames = null) => {
    console.log("🔍 Mobile Leads Filtering Debug:");
    console.log("  - Total leads before filtering:", leads.length);
    console.log("  - Role:", role);
    console.log("  - Current Sales Person (raw):", `"${currentSalesPerson}"`);
    console.log("  - Team Member Names:", teamMemberNames);

    // Clean the sales person name - remove trailing/leading spaces and normalize
    const cleanSalesPerson = currentSalesPerson
      ? currentSalesPerson.trim().toLowerCase()
      : "";
    console.log("  - Current Sales Person (cleaned):", `"${cleanSalesPerson}"`);

    let filteredLeads;
    switch (role) {
      case "sale_staff":
        filteredLeads = leads.filter(
          (lead) =>
            lead.salesEmployeeName &&
            lead.salesEmployeeName.trim().toLowerCase() === cleanSalesPerson
        );
        break;
      case "coordinator":
        if (teamMemberNames && teamMemberNames.length > 0) {
          filteredLeads = leads.filter(
            (lead) =>
              lead.salesEmployeeName &&
              teamMemberNames.includes(
                lead.salesEmployeeName.trim().toLowerCase()
              )
          );
        } else {
          filteredLeads = leads.filter(
            (lead) =>
              lead.salesEmployeeName &&
              lead.salesEmployeeName.trim().toLowerCase() === cleanSalesPerson
          );
        }
        break;
      case "telecaller":
        filteredLeads = leads;
        break;
      case "sale_head":
      default:
        filteredLeads = leads;
        break;
    }

    console.log("  - Filtered leads count:", filteredLeads.length);

    // Log sample sales employee names for debugging
    if (leads.length > 0 && role === "sale_staff") {
      console.log(
        "  - Sample sales employee names in leads:",
        leads
          .slice(0, 5)
          .map((lead) => `"${lead.salesEmployeeName}"`)
          .join(", ")
      );
      console.log(
        "  - Looking for exact match with cleaned name:",
        `"${cleanSalesPerson}"`
      );

      // Check if any leads match with the cleaned name
      const matchingLeads = leads.filter(
        (lead) =>
          lead.salesEmployeeName &&
          lead.salesEmployeeName.trim().toLowerCase() === cleanSalesPerson
      );
      console.log("  - Matching leads found:", matchingLeads.length);
      if (matchingLeads.length > 0) {
        console.log(
          "  - First matching lead sales person:",
          `"${matchingLeads[0].salesEmployeeName}"`
        );
      }

      // Also log what would happen with old logic for comparison
      const oldLogicMatches = leads.filter(
        (lead) =>
          lead.salesEmployeeName &&
          lead.salesEmployeeName.toLowerCase() ===
            currentSalesPerson.toLowerCase()
      );
      console.log(
        "  - Old logic would find:",
        oldLogicMatches.length,
        "matches"
      );
    }

    return filteredLeads;
  };

  const applyFilters = useCallback(() => {
    let filtered = [...leads];

    // Apply search filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter((lead) => {
        const sequentialNo = lead.SalesOpportunities?.SequentialNo;
        const salesEmployeeName = lead.salesEmployeeName;
        const cardName = lead.BusinessPartners?.CardName;
        const cellular = lead.BusinessPartners?.Cellular;
        const stateName =
          stateCodeMap[lead.BusinessPartners?.BillToState]?.name;

        return (
          (sequentialNo &&
            sequentialNo.toString().toLowerCase().includes(searchTermLower)) ||
          (salesEmployeeName &&
            salesEmployeeName.toLowerCase().includes(searchTermLower)) ||
          (cardName && cardName.toLowerCase().includes(searchTermLower)) ||
          (cellular && cellular.toLowerCase().includes(searchTermLower)) ||
          (stateName && stateName.toLowerCase().includes(searchTermLower))
        );
      });
    }

    // Apply type filter
    const nowDate = new Date();
    const formattedDate = moment().format("YYYY-MM-DD");
    const currentMonth = nowDate.getMonth();
    const currentYear = nowDate.getFullYear();

    if (filterType === "old") {
      filtered = filtered.filter((lead) => {
        if (
          lead.SalesOpportunities &&
          Array.isArray(lead.SalesOpportunities.SalesOpportunitiesLines) &&
          lead.SalesOpportunities.SalesOpportunitiesLines.length > 0
        ) {
          const lastLine =
            lead.SalesOpportunities.SalesOpportunitiesLines[
              lead.SalesOpportunities.SalesOpportunitiesLines.length - 1
            ];
          return (
            lastLine.ClosingDate &&
            moment(lastLine.ClosingDate).isBefore(formattedDate)
          );
        }
        return false;
      });
    } else if (filterType === "forecasted") {
      filtered = filtered.filter((lead) => {
        const opportunity = lead.SalesOpportunities;
        if (opportunity?.OpportunityName && opportunity?.PredictedClosingDate) {
          const closingDate = new Date(opportunity.PredictedClosingDate);
          return (
            closingDate.getMonth() === currentMonth &&
            closingDate.getFullYear() === currentYear
          );
        }
        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;

      if (["CardName", "Cellular", "BillToState", "City"].includes(sortBy)) {
        valueA = (a.BusinessPartners?.[sortBy] || "").toString().toLowerCase();
        valueB = (b.BusinessPartners?.[sortBy] || "").toString().toLowerCase();
      } else if (["SequentialNo", "MaxLocalTotal"].includes(sortBy)) {
        valueA = a.SalesOpportunities?.[sortBy] || 0;
        valueB = b.SalesOpportunities?.[sortBy] || 0;
      } else {
        valueA = (a.SalesOpportunities?.[sortBy] || "")
          .toString()
          .toLowerCase();
        valueB = (b.SalesOpportunities?.[sortBy] || "")
          .toString()
          .toLowerCase();
      }

      if (sortOrder === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredLeads(filtered);
  }, [leads, searchTerm, filterType, sortBy, sortOrder]);

  const handleViewClick = (lead) => {
    const sequentialNo = lead.SalesOpportunities?.SequentialNo;
    if (sequentialNo) {
      router.push({
        pathname: "/leads/[leadId]",
        params: {
          leadId: sequentialNo.toString(),
          CardName: lead.BusinessPartners?.CardName,
          Cellular: lead.BusinessPartners?.Cellular || "",
          Source: lead.SalesOpportunities?.Source || "",
          InterestLevel: lead.SalesOpportunities?.InterestLevel || "",
          SalesPerson: lead.salesEmployeeName || "",
          MaxLocalTotal: lead.SalesOpportunities?.MaxLocalTotal || 0,
        },
      });
    }
  };

  const onRefresh = useCallback(() => {
    forceRefresh();
  }, []);

  useEffect(() => {
    fetchStageKeys();
    fetchLeads();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Rest of your render functions remain the same...
  // (renderLeadCard, renderFilterModal, renderSortModal, renderFollowUpModal)

  const renderLeadCard = ({ item: lead }) => {
    const sequentialNo = lead.SalesOpportunities?.SequentialNo;
    const isExpanded = sequentialNo && expandedRows.includes(sequentialNo);
    const interestLevel = lead.SalesOpportunities?.InterestLevel;
    const stateName =
      stateCodeMap[lead.BusinessPartners?.BillToState]?.name || "Unknown";

    if (!sequentialNo) {
      return null;
    }

    return (
      <View style={styles.leadCard}>
        <View style={styles.leadHeader}>
          <TouchableOpacity
            style={styles.leadHeaderLeft}
            onPress={() => toggleFollowUp(sequentialNo)}
            onLongPress={() => handleForecastConfirmation(lead)}
            delayLongPress={2000}
            activeOpacity={0.7}
          >
            <View style={styles.leadIdContainer}>
              <Text style={styles.leadId}>Sequence No: {sequentialNo}</Text>
              {lead?.SalesOpportunities?.SalesOpportunitiesLines?.length > 0 &&
                new Date(
                  lead.SalesOpportunities.SalesOpportunitiesLines[
                    lead.SalesOpportunities.SalesOpportunitiesLines.length - 1
                  ].ClosingDate
                ) < new Date() && (
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color="#FF4444"
                    style={styles.dueIcon}
                  />
                )}
              <Text style={styles.holdToForecastText}>Hold 2s to forecast</Text>
            </View>
            <View
              style={[
                styles.interestBadge,
                { backgroundColor: getInterestLevelColor(interestLevel) },
              ]}
            >
              <Text style={styles.interestText}>
                {getInterestLevelText(interestLevel)}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleFollowUp(sequentialNo)}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.leadContent}>
          <View style={styles.leadContentRow}>
            <View style={styles.leadContentLeft}>
              <View style={styles.leadRowCompact}>
                <Ionicons
                  name="person"
                  size={14}
                  color="#555"
                  style={styles.leadIcon}
                />
                <Text
                  style={styles.leadTextCompact}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lead.BusinessPartners?.CardName || "N/A"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (lead.BusinessPartners?.Cellular) {
                    Linking.openURL(`tel:${lead.BusinessPartners?.Cellular}`);
                  } else {
                    Alert.alert("No Number", "Mobile number is not available.");
                  }
                }}
                style={{ flex: 1 }}
              >
                <View style={styles.leadRowCompact}>
                  <Ionicons
                    name="call"
                    size={14}
                    color="#555"
                    style={styles.leadIcon}
                  />
                  <Text style={styles.leadTextCompact}>
                    {lead.BusinessPartners?.Cellular || "N/A"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.leadRowCompact}>
                <Ionicons
                  name="location"
                  size={14}
                  color="#555"
                  style={styles.leadIcon}
                />
                <Text style={styles.leadTextCompact} numberOfLines={1}>
                  {lead.BusinessPartners?.City || "N/A"}
                  {stateName && `, ${stateName}`}
                </Text>
              </View>
            </View>

            <View style={styles.leadContentRight}>
              <View style={styles.leadRowCompact}>
                <Ionicons
                  name="cash"
                  size={14}
                  color="#555"
                  style={styles.leadIcon}
                />
                <Text style={[styles.leadTextCompact, styles.amountText]}>
                  {formatCurrency(lead.SalesOpportunities?.MaxLocalTotal || 0)}
                </Text>
              </View>

              <View style={styles.leadRowCompact}>
                <Ionicons
                  name="person-circle"
                  size={14}
                  color="#555"
                  style={styles.leadIcon}
                />
                <Text
                  style={styles.leadTextCompact}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lead.salesEmployeeName || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isExpanded && (
          <SalesOpportunityLines
            isExpanded={expandedRows.includes(
              lead.SalesOpportunities?.SequentialNo
            )}
            salesOpportunity={salesOpportunity}
            loadingSalesOpportunities={loadingSalesOpportunities}
            stageKeys={stageKeys}
            role={role}
            storedEmpCode={storedEmpCode}
            lead={lead}
            newFollowUpDate={newFollowUpDate}
            setNewFollowUpDate={setNewFollowUpDate}
            newFollowUpAction={newFollowUpAction}
            setNewFollowUpAction={setNewFollowUpAction}
            remarks={remarks}
            setRemarks={setRemarks}
            handleFollowUpSubmit={handleFollowUpSubmit}
            handleViewClick={handleViewClick}
            setShowFollowUpModal={setShowFollowUpModal}
          />
        )}
      </View>
    );
  };

  // Add your existing modal render functions here...
  // renderFilterModal, renderSortModal, renderFollowUpModal

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
          translucent={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#fff"
          translucent={true}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchLeads()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Leads</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterOptions}>
            {[
              { key: "all", label: "All Leads" },
              { key: "old", label: "Overdue" },
              { key: "forecasted", label: "Forecasted" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  filterType === option.key && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterType(option.key);
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterType === option.key && styles.filterOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort Leads</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.sortOptions}>
            {[
              { key: "SequentialNo", label: "Lead ID" },
              { key: "CardName", label: "Customer Name" },
              { key: "MaxLocalTotal", label: "Amount" },
              { key: "InterestLevel", label: "Interest Level" },
              { key: "PredictedClosingDate", label: "Predicted Closing Date" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  sortBy === option.key && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy(option.key);
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.key && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Ionicons
                    name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                    size={16}
                    color="#007AFF"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderForecastModal = () => (
    <Modal
      visible={showForecastModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowForecastModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forecast Lead</Text>
              <TouchableOpacity onPress={() => setShowForecastModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {forecastingLead && (
                <View style={styles.leadDetailsContainer}>
                  <Text style={styles.leadDetailText}>
                    Lead ID: {forecastingLead.SalesOpportunities?.SequentialNo}
                  </Text>
                  <Text style={styles.leadDetailText}>
                    Customer: {forecastingLead.BusinessPartners?.CardName}
                  </Text>
                  <Text style={styles.leadDetailText}>
                    Sales Person: {forecastingLead.salesEmployeeName}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Predicted Closing Date *</Text>
                <TouchableOpacity
                  onPress={() => {
                    const initialDate = forecastPredictedDate ? new Date(forecastPredictedDate) : new Date();
                    setTempForecastDate(initialDate);
                    setShowForecastDatePicker(true);
                  }}
                  style={styles.datePickerButton}
                >
                  <Text style={styles.datePickerText}>
                    {forecastPredictedDate
                      ? moment(forecastPredictedDate).format("DD-MM-YYYY")
                      : "Select date"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Value (₹)</Text>
                <TextInput
                  style={styles.formInput}
                  value={forecastValue}
                  onChangeText={setForecastValue}
                  placeholder="Enter forecast value"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.forecastButtonContainer}>
                <TouchableOpacity
                  style={[styles.forecastButton, styles.cancelButton]}
                  onPress={() => setShowForecastModal(false)}
                  disabled={isForecastLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.forecastButton, styles.confirmButton]}
                  onPress={handleForecastLead}
                  disabled={isForecastLoading}
                >
                  {isForecastLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Forecast</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderFollowUpModal = () => {
    const usedStages =
      salesOpportunity?.SalesOpportunitiesLines?.map((l) => l.StageKey) || [];

    return (
      <Modal
        visible={showFollowUpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFollowUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Follow-up</Text>
                <TouchableOpacity onPress={() => setShowFollowUpModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Follow-up Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      // Always start with today or later for new follow-ups
                      let initialDate;
                      if (newFollowUpDate) {
                        const existingDate = new Date(newFollowUpDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        existingDate.setHours(0, 0, 0, 0);

                        // If existing date is in the past, use today
                        initialDate = existingDate < today ? new Date() : existingDate;
                      } else {
                        initialDate = new Date();
                      }
                      console.log('Opening date picker with initial date:', initialDate);
                      setTempFollowUpDate(initialDate);
                      setShowDatePicker(true);
                    }}
                    style={styles.datePickerButton}
                  >
                    <Text style={styles.datePickerText}>
                      {newFollowUpDate
                        ? moment(newFollowUpDate).format("DD-MM-YYYY")
                        : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Stage</Text>
                  <View style={styles.pickerContainer}>
                    <RNPickerSelect
                      onValueChange={(value) => setNewFollowUpAction(value)}
                      items={stageKeys
                        .filter(
                          (stage) =>
                            !usedStages.includes(stage.SequenceNo) &&
                            ![1, 2, 3, 4, 15].includes(stage.SequenceNo)
                        )
                        .map((stage) => ({
                          label: stage.Name || "Unknown Stage",
                          value: stage.SequenceNo?.toString(),
                          disabled: [1, 2, 3, 4, 15].includes(stage.SequenceNo),
                        }))}
                      placeholder={{
                        label: "Select a stage",
                        value: "",
                        color: "#9CA3AF",
                      }}
                      value={newFollowUpAction}
                      style={{
                        inputIOS: styles.pickerInput,
                        inputAndroid: styles.pickerInput,
                        placeholder: {
                          color: "#9CA3AF",
                        },
                      }}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Remarks</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Add your remarks here..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleFollowUpSubmit}
                >
                  <Text style={styles.submitButtonText}>Submit Follow-up</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={true}
      />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Open Leads</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="swap-vertical" size={20} color="#666" />
          </TouchableOpacity>
          {/* Add cache clear button for debugging */}
          <TouchableOpacity style={styles.headerButton} onPress={forceRefresh}>
            <Ionicons name="refresh" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          returnKeyType="search"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{leads.length}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredLeads.length}</Text>
          <Text style={styles.statLabel}>Filtered</Text>
        </View>
        {/* Add cache status indicator */}
        {/* <View style={styles.statCard}>
          <Text style={styles.statNumber}>📦</Text>
          <Text style={styles.statLabel}>Cached</Text>
        </View> */}
      </ScrollView>

      {/* Points Forecast Section */}
      <View style={styles.forecastContainer}>
        <OrderForecast />
      </View>

      {/* Leads List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={filteredLeads}
          renderItem={renderLeadCard}
          keyExtractor={(item, index) =>
            item?.SalesOpportunities?.SequentialNo?.toString() ||
            `lead-${index}`
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No leads found</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderFilterModal()}
      {renderSortModal()}
      {renderFollowUpModal()}
      {renderForecastModal()}

      {/* Date Picker Modal for Follow-up */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDatePicker(false);
          setTempFollowUpDate(null);
        }}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Select Follow-up Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(false);
                  setTempFollowUpDate(null);
                }}
                style={styles.calendarCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={tempFollowUpDate ? moment(tempFollowUpDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')}
              minDate={moment().format('YYYY-MM-DD')}
              onDayPress={(day) => {
                console.log('Selected date:', day.dateString);
                setTempFollowUpDate(new Date(day.dateString));
              }}
              markedDates={{
                [tempFollowUpDate ? moment(tempFollowUpDate).format('YYYY-MM-DD') : '']: {
                  selected: true,
                  selectedColor: '#2563EB'
                }
              }}
              theme={{
                selectedDayBackgroundColor: '#2563EB',
                todayTextColor: '#2563EB',
                arrowColor: '#2563EB',
              }}
            />

            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarCancelButton]}
                onPress={() => {
                  setShowDatePicker(false);
                  setTempFollowUpDate(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarConfirmButton]}
                onPress={() => {
                  if (tempFollowUpDate) {
                    setNewFollowUpDate(moment(tempFollowUpDate).format("YYYY-MM-DD"));
                  }
                  setShowDatePicker(false);
                  setTempFollowUpDate(null);
                }}
              >
                <Text style={styles.calendarConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal for Forecast */}
      <Modal
        visible={showForecastDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowForecastDatePicker(false);
          setTempForecastDate(null);
        }}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Select Predicted Closing Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowForecastDatePicker(false);
                  setTempForecastDate(null);
                }}
                style={styles.calendarCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={tempForecastDate ? moment(tempForecastDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')}
              minDate={moment().format('YYYY-MM-DD')}
              onDayPress={(day) => {
                console.log('Selected forecast date:', day.dateString);
                setTempForecastDate(new Date(day.dateString));
              }}
              markedDates={{
                [tempForecastDate ? moment(tempForecastDate).format('YYYY-MM-DD') : '']: {
                  selected: true,
                  selectedColor: '#059669'
                }
              }}
              theme={{
                selectedDayBackgroundColor: '#059669',
                todayTextColor: '#059669',
                arrowColor: '#059669',
              }}
            />

            <View style={styles.calendarButtonContainer}>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarCancelButton]}
                onPress={() => {
                  setShowForecastDatePicker(false);
                  setTempForecastDate(null);
                }}
              >
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarButton, styles.calendarConfirmButton]}
                onPress={() => {
                  if (tempForecastDate) {
                    setForecastPredictedDate(moment(tempForecastDate).format("YYYY-MM-DD"));
                  }
                  setShowForecastDatePicker(false);
                  setTempForecastDate(null);
                }}
              >
                <Text style={styles.calendarConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OpenLeads;

const styles = StyleSheet.create({
  // =========================
  // Root Container
  // =========================
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: Constants.statusBarHeight,
  },

  // =========================
  // Header
  // =========================
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: isAndroid ? 2 : 0,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  pickerInput: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    color: "#111827",
    backgroundColor: "#fff",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },

  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },

  // =========================
  // Search Bar
  // =========================
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: isAndroid ? 1 : 0,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
  },

  // =========================
  // Stats Cards
  // =========================
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 70,
  },

  statCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 80,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: isAndroid ? 1 : 0,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: -6,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },

  // =========================
  // Forecast Container
  // =========================
  forecastContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // =========================
  // Lead Card
  // =========================
  leadCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: isAndroid ? 2 : 0,
  },

  leadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  leadHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  leadId: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginRight: 8,
  },

  interestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },

  interestText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },

  expandButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },

  leadContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  leadContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leadIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  dueIcon: {
    marginLeft: 8,
  },

  holdToForecastText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "500",
    marginLeft: 8,
    fontStyle: "italic",
  },

  leadContentLeft: {
    flex: 1.4,
    marginRight: 12,
  },

  leadContentRight: {
    flex: 1,
  },

  leadRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    minHeight: 20,
  },

  leadIcon: {
    marginRight: 6,
    width: 14,
  },

  leadTextCompact: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
    lineHeight: 16,
  },

  amountText: {
    fontWeight: "700",
    color: "#059669",
  },

  // =========================
  // List / Empty / Loading
  // =========================
  listContainer: {
    paddingVertical: 8,
    paddingBottom: 20,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9ca3af",
    marginTop: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#f8fafc",
  },

  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#dc2626",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },

  // =========================
  // Modal Styles
  // =========================
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  keyboardAvoidingView: {
    width: "100%",
    maxHeight: "95%",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  modalBody: {
    flexGrow: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#F9FAFB",
    color: "#111827",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
  },
  datePickerText: {
    fontSize: 14,
    color: "#111827",
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  calendarCloseButton: {
    padding: 4,
  },
  calendarButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  calendarButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  calendarCancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  calendarCancelText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  calendarConfirmButton: {
    backgroundColor: "#2563EB",
  },
  calendarConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  datePickerActionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  datePickerCancelButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  datePickerCancelText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  datePickerDoneButton: {
    backgroundColor: "#2563EB",
  },
  datePickerDoneText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  pickerInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // =========================
  // Forecast Modal Styles
  // =========================
  forecastModalBody: {
    padding: 20,
    alignItems: "center",
  },

  forecastQuestion: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 20,
  },

  leadDetailsContainer: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
  },

  leadDetailText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
    fontWeight: "500",
  },

  forecastButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
  },

  forecastButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },

  confirmButton: {
    backgroundColor: "#059669",
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },

  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },

  // =========================
  // Filter & Sort Options
  // =========================
  filterOptions: {
    padding: 20,
  },

  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  filterOptionActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },

  filterOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },

  filterOptionTextActive: {
    color: "#ffffff",
  },

  sortOptions: {
    padding: 20,
  },

  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  sortOptionActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },

  sortOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },

  sortOptionTextActive: {
    color: "#3b82f6",
  },

  // =========================
  // Follow-Up Form
  // =========================
  followUpForm: {
    padding: 20,
  },

  formGroup: {
    marginBottom: 16,
  },

  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  formInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#374151",
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  pickerContainer: {
    maxHeight: 120,
  },

  stageOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  stageOptionActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },

  stageOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },

  stageOptionTextActive: {
    color: "#ffffff",
  },

  submitButton: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});

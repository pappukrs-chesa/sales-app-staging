import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { usePoints } from '../../ContextAPI/PointsContext';
import RewardCard from '../points/RewardCard';
import PointsContainer from '../points/PointsContainer';
import { BASE_URL } from '@/config/apiConfig';

const { width, height } = Dimensions.get('window');

const ViewPage = () => {
  const { lead, leadId } = useLocalSearchParams();

  const SequentialNo = leadId;
  
    const navigation = useNavigation();
  
  // State variables
  const [salesOpportunity, setSalesOpportunity] = useState(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpAction, setFollowUpAction] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isLossDialogOpen, setIsLossDialogOpen] = useState(false);
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false);
  const [isEnquiryModalVisible, setIsEnquiryModalVisible] = useState(false);
  const [lossRemarks, setLossRemarks] = useState('');
  const [lossType, setLossType] = useState('');
  const [salesOrderNumber, setSalesOrderNumber] = useState('');
  const [docEntry, setDocEntry] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [customer, setCustomer] = useState('');
  const [dealer, setDealer] = useState('');
  const [interestProducts, setInterestProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stageKeys, setStageKeys] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [storedEmpCode, setStoredEmpCode] = useState(null);
  const [role, setRole] = useState('');
  
  // Points functionality
  const { addPointsToTable } = usePoints();
  const [showRewardCard, setShowRewardCard] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Mapping objects
  const interestMapping = {
    '-1': 'Cold',
    1: 'Warm',
    2: 'Hot',
    3: 'Very Hot',
    4: 'Very HOT',
    5: 'Enquiry',
  };

  const sourceMapping = {
    1: 'Phone',
    2: 'Direct',
    3: 'Social Media',
    4: 'Employee Lead',
    5: 'Organic Lead',
    6: 'House Of Alt',
    7: 'Service Team Lead',
    8: 'CRM Lead',
    9: 'Expo',
    10: 'May 24 Forecast',
    12: 'Dealer Lead',
  };

  const lossTypeOptions = [
    { label: 'Choose One', value: '' },
    { label: 'Confident', value: '3' },
    { label: 'Unicorn', value: '4' },
    { label: 'Bestodent', value: '5' },
    { label: 'Suzident', value: '6' },
    { label: 'Local Chair', value: '7' },
  ];



  // Initialize user data
  useEffect(() => {
    const initializeUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const userRole = await AsyncStorage.getItem('role');
        
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setStoredEmpCode(Number(parsedUser?.employeeCode));
        }
        
        if (userRole) {
          setRole(userRole);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    initializeUserData();
  }, []);

  // Fetch stage keys
  useEffect(() => {
    const fetchStageKeys = async () => {
      try {
        const storedStageKeys = await AsyncStorage.getItem('stageKeys');
        
        if (storedStageKeys) {
          setStageKeys(JSON.parse(storedStageKeys));
        } else {
          const response = await fetch(`${BASE_URL}/getStageKey`);
          const data = await response.json();
          const stageKeys = data.stageKeys.value;
          setStageKeys(stageKeys);
          await AsyncStorage.setItem('stageKeys', JSON.stringify(stageKeys));
        }
      } catch (error) {
        console.error('Error fetching stage keys:', error);
        Alert.alert('Error', 'Failed to load stage keys');
      }
    };

    fetchStageKeys();
  }, []);

  // Fetch sales opportunity data
  useEffect(() => {
    fetchSalesOpportunity();
  }, [SequentialNo]);

  const fetchSalesOpportunity = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sales opportunity
      const salesResponse = await fetch(
        `${BASE_URL}/sales_opportunity/${SequentialNo}`
      );
      const salesData = await salesResponse.json();
      setSalesOpportunity(salesData);

      // Fetch products
      const productResponse = await fetch(`${BASE_URL}/crmpro`);
      const productList = await productResponse.json();

      // Map interest products
      const interestProducts = salesData.SalesOpportunitiesInterests.map((interest) => {
        const matchingProduct = productList.find(
          (product) => product.id === interest.InterestId
        );
        return matchingProduct ? matchingProduct.pname : 'Unknown Product';
      });

      setInterestProducts(interestProducts);

      // Set initial form data
      if (salesData.SalesOpportunitiesLines.length > 0) {
        const initialRemarks = salesData.SalesOpportunitiesLines.map(
          (line) => line.Remarks || ''
        );
        setRemarks(initialRemarks);
        
        const lastEntry = salesData.SalesOpportunitiesLines[
          salesData.SalesOpportunitiesLines.length - 1
        ];

        setFollowUpDate(lastEntry.ClosingDate ? lastEntry.ClosingDate.split('T')[0] : '');
        setStartDate(lastEntry.ClosingDate ? lastEntry.ClosingDate.split('T')[0] : '');
        setFollowUpAction(lastEntry.StageKey);
      }
    } catch (error) {
      console.error('Error fetching sales opportunity:', error);
      Alert.alert('Error', 'Failed to load sales opportunity data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalesOpportunity();
    setRefreshing(false);
  };

  const showToast = (message, type = 'success') => {
    Alert.alert(type === 'success' ? 'Success' : 'Error', message);
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpAction || !remarks) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const lastLineIndex = salesOpportunity.SalesOpportunitiesLines.length;
    const lastLine = salesOpportunity.SalesOpportunitiesLines[
      salesOpportunity.SalesOpportunitiesLines.length - 1
    ];

    const selectedCloseDate = new Date(followUpDate);
    const today = new Date();
    
    if (selectedCloseDate < today) {
      Alert.alert('Error', 'The follow-up date must be today or a future date.');
      return;
    }

    const newDate = new Date(followUpDate).toISOString().split('T')[0] + 'T00:00:00Z';

    const arr = [{
      sequenceId: SequentialNo,
      LineNumber: lastLineIndex,
      startDate: lastLine.ClosingDate,
      closeDate: newDate,
      stageKey: followUpAction,
      totalPrice: lastLine.MaxLocalTotal,
      remarks: remarks,
    }];

    try {
      const response = await axios.patch(
        `${BASE_URL}/patch_followup`,
        arr
      );

      if (response.status === 200) {
        await AsyncStorage.removeItem('leadsWithDetails');
        showToast('Follow-up details updated successfully');
        
        // Add points for follow-up activity
        const points = 25;
        const activityType = 4;
        const pointsAdded = await addPointsToTable(points, activityType);
        if (pointsAdded) {
          setEarnedPoints(points);
          setShowRewardCard(true);
        }
        
        setTimeout(() => {
          fetchSalesOpportunity();
        }, 1000);
      }
    } catch (error) {
      showToast('Error updating follow-up details', 'error');
    }
  };

  const handleLossSubmit = async () => {
    if (!lossRemarks.trim() || !lossType) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        sapid: SequentialNo,
        lossType: parseInt(lossType),
        remarks: lossRemarks,
      };

      const response = await axios.patch(
        `${BASE_URL}/patchloss`,
        payload
      );

      showToast('Loss details submitted successfully');
      setIsLossDialogOpen(false);
      
      // Add points for loss activity
      const points = 25;
      const activityType = 4;
      const pointsAdded = await addPointsToTable(points, activityType);
      if (pointsAdded) {
        setEarnedPoints(points);
        setShowRewardCard(true);
      }
      
      await AsyncStorage.removeItem('leadsWithDetails');
      navigation.goBack();
    } catch (error) {
      showToast('Error submitting loss details', 'error');
    }
  };

  const handleWonSubmit = async () => {
    if (!docEntry) {
      Alert.alert('Error', 'Please fetch a valid sales order first');
      return;
    }

    try {
      const salesEmpCode = salesOpportunity.SalesOpportunitiesLines[0].DataOwnershipfield;

      const response = await axios.patch(
        `${BASE_URL}/patchwon`,
        {
          sapid: SequentialNo,
          start: startDate,
          close: followUpDate,
          docentry: docEntry,
          price: salesOpportunity.SalesOpportunitiesLines[0].MaxLocalTotal,
          ownerid: salesEmpCode,
        }
      );

      showToast('Lead updated successfully');
      setIsWonDialogOpen(false);
      
      // Add points for won activity
      const points = 25;
      const activityType = 4;
      const pointsAdded = await addPointsToTable(points, activityType);
      if (pointsAdded) {
        setEarnedPoints(points);
        setShowRewardCard(true);
      }
      
      await AsyncStorage.removeItem('leadsWithDetails');
      navigation.goBack();
    } catch (error) {
      showToast('Error updating lead', 'error');
    }
  };

  const handleEnquirySubmit = async () => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/patch_interest_level`,
        {
          sequenceId: SequentialNo,
          InterestLevel: 5,
        }
      );

      if (response.status === 200) {
        showToast('Lead successfully posted as an enquiry');
        setIsEnquiryModalVisible(false);
        
        // Add points for enquiry activity
        const points = 25;
        const activityType = 4;
        const pointsAdded = await addPointsToTable(points, activityType);
        if (pointsAdded) {
          setEarnedPoints(points);
          setShowRewardCard(true);
        }
        
        await AsyncStorage.removeItem('leadsWithDetails');
        navigation.goBack();
      }
    } catch (error) {
      showToast('Error posting lead as enquiry', 'error');
    }
  };

  const handleFetch = async () => {
    if (!salesOrderNumber.trim()) {
      Alert.alert('Error', 'Please enter a sales order number');
      return;
    }

    setIsFetching(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/DocEntry?id=${salesOrderNumber}`
      );

      const salesOrders = response.data.value;
      if (salesOrders.length > 0) {
        const firstOrder = salesOrders[0];
        const { DocEntry, CardName, ShipToCode } = firstOrder;
        
        if (firstOrder.DocumentStatus === 'bost_Open') {
          setDocEntry(DocEntry);
          setCustomer(ShipToCode);
          setDealer(CardName);
          showToast('Order fetched successfully');
        } else {
          Alert.alert('Error', 'This order is closed');
          setDocEntry(null);
          setCustomer(null);
        }
      } else {
        Alert.alert('Error', 'No sales orders found for the given Sales Order Number');
      }
    } catch (error) {
      Alert.alert('Error', 'Error fetching data');
    } finally {
      setIsFetching(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  const canUpdateLead = () => {
    if (!salesOpportunity || !salesOpportunity.SalesOpportunitiesLines.length) return false;
    
    const lastLine = salesOpportunity.SalesOpportunitiesLines[salesOpportunity.SalesOpportunitiesLines.length - 1];
    const isDateValid = new Date(lastLine.ClosingDate) <= new Date();
    const hasPermission = role === 'sale_head' || role === 'telecaller' || 
                         storedEmpCode === Number(lead.SalesOpportunities.SalesPerson);
    
    return isDateValid && hasPermission;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={styles.headerRight}>
          <PointsContainer
            style={styles.pointsHeaderDisplay}
            onPress={() => router.push('/points')}
            showLabel={false}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.lossButton]}
            onPress={() => setIsLossDialogOpen(true)}
          >
            <Text style={styles.actionButtonText}>Loss</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.wonButton]}
            onPress={() => setIsWonDialogOpen(true)}
          >
            <Text style={styles.actionButtonText}>Won</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.enquiryButton]}
            onPress={() => setIsEnquiryModalVisible(true)}
          >
            <Text style={styles.actionButtonText}>Enquiry</Text>
          </TouchableOpacity>
        </View>

        {/* Lead Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Lead #{lead.SalesOpportunities.SequentialNo}
            </Text>
            <Text style={styles.cardSubtitle}>
              Created: {formatDate(lead.SalesOpportunities.StartDate)}
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer:</Text>
              <Text style={styles.infoValue}>{lead.BusinessPartners.CardName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{lead.BusinessPartners.Cellular}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Value:</Text>
              <Text style={styles.infoValue}>₹{lead.SalesOpportunities.MaxLocalTotal}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Source:</Text>
              <Text style={styles.infoValue}>
                {sourceMapping[lead.SalesOpportunities.Source] || lead.SalesOpportunities.Source}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Interest Level:</Text>
              <Text style={[styles.infoValue, styles.interestLevel]}>
                {interestMapping[lead.SalesOpportunities.InterestLevel] || lead.SalesOpportunities.InterestLevel}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sales Person:</Text>
              <Text style={styles.infoValue}>{lead.salesEmployeeName}</Text>
            </View>
          </View>
        </View>

        {/* Products Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Products</Text>
          <View style={styles.productsList}>
            {interestProducts.length > 0 ? (
              interestProducts.map((product, index) => (
                <View key={index} style={styles.productItem}>
                  <Text style={styles.productName}>{product}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noProducts}>No products available</Text>
            )}
          </View>
        </View>

        {/* Follow-up Section */}
        {salesOpportunity && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Follow-up History</Text>
            
            {salesOpportunity.SalesOpportunitiesLines.map((line, index) => (
              <View key={index} style={styles.followUpItem}>
                <View style={styles.followUpHeader}>
                  <Text style={styles.followUpNumber}>#{line.LineNum}</Text>
                  <Text style={styles.followUpDate}>
                    {formatDate(line.StartDate)} → {formatDate(line.ClosingDate)}
                  </Text>
                </View>
                
                <View style={styles.followUpDetails}>
                  <Text style={styles.followUpStage}>
                    {stageKeys.find(stage => stage.Stageno === line.StageKey)?.Name || 'Stage Closed'}
                  </Text>
                  <Text style={styles.followUpValue}>₹{line.MaxLocalTotal}</Text>
                </View>
                
                <Text style={styles.followUpRemarks}>
                  {line.Remarks || 'No remarks'}
                </Text>
              </View>
            ))}

            {/* New Follow-up Form */}
            {canUpdateLead() && (
              <View style={styles.followUpForm}>
                <Text style={styles.formTitle}>Add Follow-up</Text>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Follow-up Date:</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={followUpDate}
                    onChangeText={setFollowUpDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Stage:</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={followUpAction}
                      onValueChange={(value) => setFollowUpAction(value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Stage" value="" />
                      {stageKeys
                        .filter(stage => ![1, 2, 3, 4, 15].includes(stage.Stageno))
                        .map(stage => (
                          <Picker.Item
                            key={stage.Stageno}
                            label={stage.Name}
                            value={stage.Stageno}
                          />
                        ))}
                    </Picker>
                  </View>
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Remarks:</Text>
                  <TextInput
                    style={styles.textArea}
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Enter remarks..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleFollowUpSubmit}
                >
                  <Text style={styles.submitButtonText}>Update Follow-up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Loss Modal */}
      <Modal
        visible={isLossDialogOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLossDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Loss</Text>
              <TouchableOpacity onPress={() => setIsLossDialogOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Loss Type:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={lossType}
                  onValueChange={(value) => setLossType(value)}
                  style={styles.picker}
                >
                  {lossTypeOptions.map(option => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
              
              <Text style={styles.modalLabel}>Remarks:</Text>
              <TextInput
                style={styles.textArea}
                value={lossRemarks}
                onChangeText={setLossRemarks}
                placeholder="Enter remarks..."
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsLossDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLossSubmit}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Won Modal */}
      <Modal
        visible={isWonDialogOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsWonDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark as Won</Text>
              <TouchableOpacity onPress={() => setIsWonDialogOpen(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Sales Order Number:</Text>
              <View style={styles.fetchRow}>
                <TextInput
                  style={[styles.textInput, styles.orderInput]}
                  value={salesOrderNumber}
                  onChangeText={setSalesOrderNumber}
                  placeholder="Enter sales order number"
                />
                <TouchableOpacity
                  style={styles.fetchButton}
                  onPress={handleFetch}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.fetchButtonText}>Fetch</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {docEntry && (
                <View style={styles.fetchedInfo}>
                  <Text style={styles.fetchedLabel}>Customer: {customer}</Text>
                  <Text style={styles.fetchedLabel}>Dealer: {dealer}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsWonDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !docEntry && styles.disabledButton]}
                onPress={handleWonSubmit}
                disabled={!docEntry}
              >
                <Text style={styles.confirmButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enquiry Modal */}
      <Modal
        visible={isEnquiryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEnquiryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Text style={styles.alertTitle}>Confirm Enquiry</Text>
            <Text style={styles.alertMessage}>
              Are you sure you want to post this lead as an enquiry?
            </Text>
            
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertCancelButton]}
                onPress={() => setIsEnquiryModalVisible(false)}
              >
                <Text style={styles.alertCancelText}>No</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.alertButton, styles.alertConfirmButton]}
                onPress={handleEnquirySubmit}
              >
                <Text style={styles.alertConfirmText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reward Card */}
      <RewardCard
        visible={showRewardCard}
        points={earnedPoints}
        onClose={() => setShowRewardCard(false)}
      />
    </SafeAreaView>
  );
};

export default ViewPage;

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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  pointsHeaderDisplay: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  scrollView: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  lossButton: {
    backgroundColor: '#dc3545',
  },
  wonButton: {
    backgroundColor: '#28a745',
  },
  enquiryButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  interestLevel: {
    fontWeight: '600',
    color: '#007AFF',
  },
  productsList: {
    gap: 8,
  },
  productItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  productName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  noProducts: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  followUpItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
    followUpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    followUpNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    followUpDate: {
        fontSize: 12,
        color: '#666',
    },
    followUpDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    followUpStage: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
    },
    followUpValue: {
        fontSize: 14,
        color: '#28a745',
        fontWeight: '500',
    },
    followUpRemarks: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    followUpForm: {
    marginTop: 16,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    formLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        width: 120,
    },
    dateInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e1e5e9',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        color: '#1a1a1a',
    },
    textArea: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e1e5e9',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        color: '#1a1a1a',
        minHeight: 60,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    modalBody: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e1e5e9',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e1e5e9',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        color: '#1a1a1a',
    },
    fetchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderInput: {
        flex: 1,
        marginRight: 8,
    },
    fetchButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    fetchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    fetchedInfo: {
        marginTop: 12,
    },
    fetchedLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#e1e5e9',
        marginRight: 8,
    },
    confirmButton: {
        backgroundColor: '#28a745',
    },
    cancelButtonText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
            backgroundColor: '#ccc',
        },
    alertModal: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    alertMessage: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    alertButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    alertCancelButton: {
        backgroundColor: '#e1e5e9',
        marginRight: 8,
    },
    alertConfirmButton: {
        backgroundColor: '#007AFF',
    },
    alertCancelText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '600',
    },
    alertConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
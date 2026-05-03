import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import moment from 'moment';
import Constants from 'expo-constants';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { BASE_URL as API_BASE_URL } from '../../config/apiConfig';

const ServiceScreen = () => {
  const [serviceCalls, setServiceCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [empId, setEmpId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    loadEmployeeData();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('Loading timeout - forcing stop');
        setIsLoading(false);
        setError('Loading took too long. Please try again.');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (empId) {
      loadServiceCalls();
      loadTechnicians();
    }
  }, [empId]);

  const loadEmployeeData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      
      if (userData) {
        const user = JSON.parse(userData);
        const employeeCode = user.employeeCode || await AsyncStorage.getItem('sales_person');
        
        if (employeeCode) {
          setEmpId(employeeCode);
          console.log('Loaded employee code:', employeeCode);
        } else {
          setError('Employee code not found. Please login again.');
          setIsLoading(false);
        }
      } else {
        setError('User data not found. Please login again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
      setError('Failed to load employee information');
      setIsLoading(false);
    }
  };

  const loadServiceCalls = async (silent = false) => {
    if (!empId) {
      console.log('No employee code, skipping load');
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      console.log(`Loading service calls for employee code: ${empId}`);

      const response = await axios.get(
        `${API_BASE_URL}/get_service_calls_by_state?employeeCode=${empId}`
      );

      const sapData = response.data.serviceCalls || [];

      const merged = sapData.map(sap => ({
        ServiceID: sap.ServiceCallID,
        ServiceCallID: sap.ServiceCallID,
        source: sap.source || 'cdcsl',
        Subject: sap.Subject,
        Name: sap.source === 'chesa_inc' ? sap.Description : sap.U_SBSEEML,
        Phone: sap.BPCellular,
        CardCode: sap.CustomerCode,
        Dealer: sap.CustomerName,
        ItemCode: sap.ItemCode,
        Item: sap.ItemDescription,
        SerialNo: sap.InternalSerialNum,
        Technician: sap.SupplementaryCode || '',
        Date: sap.CreationDate,
        ShipState: sap.ServiceCallBPAddressComponents?.[0]?.ShipToState,
        Address: sap.BPShipToAddress,
        Room: sap.Room,
        callOrderStatus: sap.callOrderStatus,
        spareName: sap.spareName,
        Priority: sap.Priority,
      }));

      setServiceCalls(merged);
      setError('');
      console.log(`Loaded ${merged.length} service calls`);
    } catch (error) {
      console.error('Error loading service calls:', error);
      setError('Failed to load service calls');
      setServiceCalls([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get_technicians`);

      if (response?.data?.value) {
        const filtered = response.data.value.filter(t => t.source === 'cdcsl');
        setTechnicians(filtered);
        await AsyncStorage.setItem('technicians', JSON.stringify(filtered));
      }
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadServiceCalls(true);
  }, [empId]);

  const handleAllocate = (record) => {
    setSelectedRecord(record);
    setSelectedEngineer(null);
    setAllocateModalOpen(true);
  };

  const handleAllocateEngineer = async () => {
    if (!selectedEngineer) {
      Alert.alert('Error', 'Please select an engineer');
      return;
    }

    setAllocating(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/allocate_engineer`,
        {
          engineerNameFromSAP: selectedEngineer,
          serviceCallId: selectedRecord.ServiceCallID,
          selectedDB: selectedRecord.source,
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Engineer allocated successfully!');
        setAllocateModalOpen(false);
        loadServiceCalls(true);
      } else {
        Alert.alert('Error', 'Failed to allocate engineer');
      }
    } catch (error) {
      console.error('Error allocating engineer:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to allocate engineer');
    } finally {
      setAllocating(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'scp_High':
        return '#ff4757';
      case 'scp_Medium':
        return '#ffa502';
      default:
        return '#2ed573';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'scp_High':
        return 'High';
      case 'scp_Medium':
        return 'Medium';
      default:
        return 'Low';
    }
  };

  const calculateDays = (date) => {
    if (!date) return '--';
    const date1 = new Date(date);
    const date2 = new Date();
    const diff = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? `${diff} days` : '--';
  };

  const filteredCalls = serviceCalls.filter(call => {
    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (
        (call.ServiceID?.toString() || '').toLowerCase().includes(term) ||
        (call.Subject || '').toLowerCase().includes(term) ||
        (call.Name || '').toLowerCase().includes(term) ||
        (call.Dealer || '').toLowerCase().includes(term) ||
        (call.Phone || '').toLowerCase().includes(term) ||
        (call.ShipState || '').toLowerCase().includes(term) ||
        (call.Technician || '').toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (selectedFilter === 'assigned') {
      return call.Technician && call.Technician.trim() !== '';
    } else if (selectedFilter === 'unassigned') {
      return !call.Technician || call.Technician.trim() === '';
    }

    return true;
  });

  const renderServiceCall = ({ item }) => (
    <View style={styles.card}>
      {/* Priority Badge */}
      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.Priority) }]}>
        <Text style={styles.priorityText}>{getPriorityText(item.Priority)}</Text>
      </View>

      {/* Service ID */}
      <Text style={styles.serviceId}>Service ID: {item.ServiceID}</Text>

      {/* Main Info */}
      <View style={styles.infoRow}>
        <Text style={styles.label}>Subject:</Text>
        <Text style={styles.value}>{item.Subject || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{item.Name || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Phone:</Text>
        <Text style={styles.value}>{item.Phone || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Dealer:</Text>
        <Text style={styles.value} numberOfLines={2}>{item.Dealer || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Item:</Text>
        <Text style={styles.value} numberOfLines={2}>{item.Item || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Serial No:</Text>
        <Text style={styles.value}>{item.SerialNo || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Technician:</Text>
        <Text style={styles.value}>{item.Technician || '--'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>No. of Days:</Text>
        <Text style={styles.value}>{calculateDays(item.Date)}</Text>
      </View>

      {/* Allocate Button */}
      <TouchableOpacity
        style={styles.allocateButton}
        onPress={() => handleAllocate(item)}
      >
        <MaterialIcons name="person-add" size={18} color="#fff" />
        <Text style={styles.allocateButtonText}>Allocate Engineer</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f7931e" />
        <Text style={styles.loadingText}>Loading service calls...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadServiceCalls}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Service Calls</Text>
        <Text style={styles.count}>{filteredCalls.length} calls</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, state, technician..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalOpen(true)}
        >
          <MaterialIcons name="filter-list" size={24} color="#f7931e" />
          {selectedFilter !== 'all' && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Service Calls List */}
      <FlatList
        data={filteredCalls}
        renderItem={renderServiceCall}
        keyExtractor={(item) => item.ServiceID.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#f7931e']}
            tintColor="#f7931e"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No service calls found</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Calls</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedFilter === 'all' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setSelectedFilter('all');
                  setFilterModalOpen(false);
                }}
              >
                <MaterialIcons
                  name="list"
                  size={24}
                  color={selectedFilter === 'all' ? '#f7931e' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === 'all' && styles.filterOptionTextActive,
                  ]}
                >
                  All Calls
                </Text>
                {selectedFilter === 'all' && (
                  <Ionicons name="checkmark" size={24} color="#f7931e" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedFilter === 'assigned' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setSelectedFilter('assigned');
                  setFilterModalOpen(false);
                }}
              >
                <MaterialIcons
                  name="person"
                  size={24}
                  color={selectedFilter === 'assigned' ? '#f7931e' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === 'assigned' && styles.filterOptionTextActive,
                  ]}
                >
                  Assigned to Technician
                </Text>
                {selectedFilter === 'assigned' && (
                  <Ionicons name="checkmark" size={24} color="#f7931e" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedFilter === 'unassigned' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setSelectedFilter('unassigned');
                  setFilterModalOpen(false);
                }}
              >
                <MaterialIcons
                  name="person-outline"
                  size={24}
                  color={selectedFilter === 'unassigned' ? '#f7931e' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedFilter === 'unassigned' && styles.filterOptionTextActive,
                  ]}
                >
                  Unassigned
                </Text>
                {selectedFilter === 'unassigned' && (
                  <Ionicons name="checkmark" size={24} color="#f7931e" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Allocate Engineer Modal */}
      <Modal
        visible={allocateModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAllocateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allocate Engineer</Text>
              <TouchableOpacity onPress={() => setAllocateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRecord && (
                <>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Service Call ID:</Text>
                    <Text style={styles.modalValue}>{selectedRecord.ServiceID}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Customer:</Text>
                    <Text style={styles.modalValue}>{selectedRecord.Name}</Text>
                  </View>
                </>
              )}

              <Text style={styles.pickerLabel}>Select Engineer:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedEngineer}
                  onValueChange={(itemValue) => setSelectedEngineer(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select Engineer --" value={null} />
                  {technicians.map((tech) => (
                    <Picker.Item
                      key={tech.EmployeeID}
                      label={`${tech.FirstName} ${tech.LastName} (${tech.MobilePhone})`}
                      value={`${tech.FirstName} ${tech.LastName}`}
                    />
                  ))}
                </Picker>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAllocateModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.allocateModalButton]}
                onPress={handleAllocateEngineer}
                disabled={allocating}
              >
                {allocating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.allocateModalButtonText}>Allocate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  count: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#f7931e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  serviceId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    width: 100,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  allocateButton: {
    backgroundColor: '#f7931e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  allocateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fef3e2ff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: '#fef3e2ff',
    borderWidth: 1,
    borderColor: '#f7931e',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#f7931e',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalInfoRow: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  allocateModalButton: {
    backgroundColor: '#f7931e',
  },
  allocateModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceScreen;

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SalesEmployeeCard = ({
  salesEmployees = [],
  selectedEmployee = [],
  onEmployeeChange,
  employeeSales = 0,
  targetSale = 0,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedEmployees, setTempSelectedEmployees] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  useEffect(() => {
    setTempSelectedEmployees(selectedEmployee);
    
    // Check if all employees are selected
    const allSelected = salesEmployees.length > 0 && 
      salesEmployees.every(emp => selectedEmployee.some(sel => sel.username === emp.username));
    setIsAllSelected(allSelected);
  }, [selectedEmployee, salesEmployees]);

  const handleEmployeeToggle = (employee) => {
    const isSelected = tempSelectedEmployees.some(emp => emp.username === employee.username);
    
    if (isSelected) {
      setTempSelectedEmployees(prev => 
        prev.filter(emp => emp.username !== employee.username)
      );
    } else {
      setTempSelectedEmployees(prev => [...prev, employee]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setTempSelectedEmployees([]);
      setIsAllSelected(false);
    } else {
      setTempSelectedEmployees([...salesEmployees]);
      setIsAllSelected(true);
    }
  };

  const handleApply = () => {
    onEmployeeChange(tempSelectedEmployees);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedEmployees(selectedEmployee);
    setIsModalOpen(false);
  };

  const getSalesStatus = () => {
    if (employeeSales >= targetSale) {
      return {
        status: 'success',
        color: '#10B981',
        icon: 'checkmark-circle',
        text: 'Target Reached',
        difference: 0,
      };
    } else if (employeeSales >= targetSale * 0.8) {
      return {
        status: 'warning',
        color: '#F59E0B',
        icon: 'warning',
        text: 'Nearly There',
        difference: targetSale - employeeSales,
      };
    } else {
      return {
        status: 'error',
        color: '#EF4444',
        icon: 'close-circle',
        text: 'Target Not Reached',
        difference: targetSale - employeeSales,
      };
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

  const salesStatus = getSalesStatus();

  const renderEmployeeItem = ({ item }) => {
    const isSelected = tempSelectedEmployees.some(emp => emp.username === item.username);
    
    return (
      <TouchableOpacity
        style={[styles.employeeItem, isSelected && styles.selectedEmployeeItem]}
        onPress={() => handleEmployeeToggle(item)}
      >
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.username}</Text>
          <Text style={styles.employeeTarget}>
            Target: {formatCurrency(item.target || 0)}
          </Text>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#CBD5E1" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="people" size={20} color="#007AFF" />
          <Text style={styles.title}>Sales Employee Selection</Text>
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setIsModalOpen(true)}
        >
          <Text style={styles.selectButtonText}>
            {selectedEmployee.length === 0
              ? 'Select Employees'
              : `${selectedEmployee.length} Employee${selectedEmployee.length > 1 ? 's' : ''} Selected`
            }
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {selectedEmployee.length > 0 && (
          <View style={styles.selectedEmployeesContainer}>
            <Text style={styles.selectedTitle}>Selected Employees:</Text>
            <ScrollView style={styles.selectedList} showsVerticalScrollIndicator={false}>
              {selectedEmployee.map((employee, index) => (
                <View key={index} style={styles.selectedEmployeeChip}>
                  <Text style={styles.selectedEmployeeName} numberOfLines={1}>
                    {employee.username}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedEmployee.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Monthly Sales Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>This Month Sales:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(employeeSales)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Target Sales:</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(targetSale)}
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <Ionicons 
                name={salesStatus.icon} 
                size={20} 
                color={salesStatus.color} 
              />
              <Text style={[styles.statusText, { color: salesStatus.color }]}>
                {salesStatus.text}
              </Text>
            </View>

            {salesStatus.difference > 0 && (
              <Text style={styles.differenceText}>
                {formatCurrency(salesStatus.difference)} more needed
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Employee Selection Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Employees</Text>
            <TouchableOpacity onPress={handleApply}>
              <Text style={styles.applyButton}>Apply</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Ionicons 
                name={isAllSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={20} 
                color="#007AFF" 
              />
              <Text style={styles.selectAllText}>
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            <FlatList
              data={salesEmployees}
              keyExtractor={(item, index) => `${item.username}-${index}`}
              renderItem={renderEmployeeItem}
              style={styles.employeesList}
              showsVerticalScrollIndicator={false}
            />
          </View>
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
  content: {
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  selectedEmployeesContainer: {
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  selectedList: {
    maxHeight: 60,
  },
  selectedEmployeeChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  selectedEmployeeName: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  differenceText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
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
  applyButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  employeesList: {
    flex: 1,
  },
  employeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedEmployeeItem: {
    backgroundColor: '#F0F9FF',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  employeeTarget: {
    fontSize: 13,
    color: '#64748B',
  },
  checkboxContainer: {
    marginLeft: 12,
  },
});

export default SalesEmployeeCard;
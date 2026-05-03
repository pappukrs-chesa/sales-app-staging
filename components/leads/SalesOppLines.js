import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment';

const SalesOpportunityLines = ({ 
  isExpanded, 
  salesOpportunity, 
  loadingSalesOpportunities, 
  stageKeys, 
  role, 
  storedEmpCode, 
  lead,
  newFollowUpDate,
  setNewFollowUpDate,
  newFollowUpAction,
  setNewFollowUpAction,
  remarks,
  setRemarks,
  handleFollowUpSubmit,
  handleViewClick,
  setShowFollowUpModal
}) => {
  const handleRemarksChange = (value) => {
    setRemarks(value);
  };

  const handleFollowUpDateChange = (date) => {
    setNewFollowUpDate(date);
  };

  const handleFollowUpActionChange = (action) => {
    setNewFollowUpAction(action);
  };

  const handleUpdateFollowUp = () => {
    if (!remarks.trim()) {
      Alert.alert('Error', 'Please fill in the remarks before submitting.');
      return;
    }
    handleFollowUpSubmit();
  };

  const isLastLine = (index) => {
    return index === salesOpportunity.SalesOpportunitiesLines.length - 1;
  };

  const isButtonDisabled = (line) => {
    return new Date(line.ClosingDate) > new Date() ||
           (role !== "sale_head" && 
            role !== "telecaller" && 
            storedEmpCode !== Number(lead.SalesOpportunities.SalesPerson));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#28a745';
      case 'pending': return '#ffc107';
      case 'closed': return '#6c757d';
      default: return '#17a2b8';
    }
  };

  if (!isExpanded) return null;

  return (
    <View style={styles.expandedContent}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Ionicons name="list" size={16} color="#2c3e50" />
          <Text style={styles.sectionTitle}>Sales Opportunity Lines</Text>
        </View>
        <Text style={styles.itemCount}>
          {salesOpportunity.SalesOpportunitiesLines?.length || 0} items
        </Text>
      </View>
      
      {loadingSalesOpportunities ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={20} color="#6c757d" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.linesContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {salesOpportunity.SalesOpportunitiesLines?.map((line, index) => (
            <View key={line.LineNum || index} style={[
              styles.lineItem,
              isLastLine(index) && styles.activeLineItem
            ]}>
              {/* Header with Line Number and Amount */}
              <View style={styles.lineHeader}>
                <View style={styles.lineNumberContainer}>
                  <Text style={styles.lineNumber}>#{line.LineNum}</Text>
                  {isLastLine(index) && <View style={styles.activeDot} />}
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.currency}>₹</Text>
                  <Text style={styles.amount}>{line.MaxLocalTotal}</Text>
                </View>
              </View>

              {/* Details Section */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.label}>Start Date</Text>
                    <Text style={styles.value}>{moment(line.StartDate).format('DD MMM')}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.label}>Follow-Up</Text>
                    {
                      <Text style={styles.value}>
                        {line.ClosingDate ? moment(line.ClosingDate).format('DD MMM') : 'N/A'}
                      </Text>
                    }
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.label}>Stage</Text>
                    {
                      <Text style={styles.value}>
                        {line.StageKey 
                          ? stageKeys?.find(stage => stage.SequenceNo === line.StageKey)?.Name || "Closed"
                          : "Closed"
                        }
                      </Text>
                    }
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.label}>Status</Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(line.Status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(line.Status) }]}>
                        {line.Status ? line.Status.replace("so_", "").toUpperCase() : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                
                {
                  line.Remarks && (
                    <View style={styles.remarksContainer}>
                      <Text style={styles.remarksLabel}>Remarks</Text>
                      <Text style={styles.remarksText} numberOfLines={2}>
                        {line.Remarks}
                      </Text>
                    </View>
                  )
                }

                {/* Action Section */}
                {isLastLine(index) ? (
                  <View style={styles.closedContainer}>
                    <Ionicons name="checkmark-circle" size={14} color="#16a511ff" />
                    <Text style={styles.closedText}>Stage Open</Text>
                  </View>
                ) : (
                  <View style={styles.closedContainer}>
                    <Ionicons name="checkmark-circle" size={14} color="#95a5a6" />
                    <Text style={styles.closedText}>Stage Closed</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
  style={[styles.actionButton, styles.viewButton]}
  onPress={() => handleViewClick(lead)}
>
  <Ionicons name="eye" size={16} color="#fff" />
  <Text style={styles.actionButtonText}>View Details</Text>
</TouchableOpacity>


        <TouchableOpacity
          style={[styles.actionButton, styles.followUpButton]}
          onPress={() => setShowFollowUpModal(true)}
        >
          <Ionicons name="calendar" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Follow Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = {
  expandedContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  itemCount: {
    fontSize: 12,
    color: '#6c757d',
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    color: '#6c757d',
    fontSize: 12,
  },
  linesContainer: {
    maxHeight: 280,
    backgroundColor: '#f8f9fa',
  },
  lineItem: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  activeLineItem: {
    borderColor: '#28a745',
    borderWidth: 2,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  lineNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#28a745',
  },
  detailsContainer: {
    padding: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: '#fff',
    height: 32,
  },
  picker: {
    fontSize: 12,
    color: '#2c3e50',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  remarksContainer: {
    marginTop: 8,
  },
  remarksLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    fontSize: 12,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 50,
    color: '#2c3e50',
  },
  remarksText: {
    fontSize: 12,
    color: '#495057',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  closedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  closedText: {
    fontSize: 11,
    color: '#95a5a6',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    padding: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#17a2b8',
  },
  followUpButton: {
    backgroundColor: '#28a745',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
};

export default SalesOpportunityLines;
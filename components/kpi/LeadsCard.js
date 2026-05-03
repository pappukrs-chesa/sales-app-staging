import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LeadsCard = ({ 
  leads = [], 
  selectedEmployeeName 
}) => {
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // all, currentMonth, starred
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const stages = {
    1: "Cold",
    2: "Warm", 
    3: "Hot",
    4: "Closed",
    5: "First Call",
    6: "First Meeting",
    7: "Quotation",
    8: "Negotiation",
    9: "Payment Confirmation",
    10: "Order Confirmed",
    11: "Second Meeting",
    12: "Revision Of Products",
    13: "Second Call",
    14: "Third Call",
    15: "Lost",
  };

  const getStageColor = (interestLevel) => {
    const colors = {
      "Cold": "#64748B",
      "Warm": "#F59E0B", 
      "Hot": "#EF4444",
      "Closed": "#10B981",
      "First Call": "#3B82F6",
      "First Meeting": "#8B5CF6",
      "Quotation": "#F97316",
      "Negotiation": "#EC4899",
      "Payment Confirmation": "#06B6D4",
      "Order Confirmed": "#10B981",
      "Second Meeting": "#8B5CF6",
      "Revision Of Products": "#F59E0B",
      "Second Call": "#3B82F6",
      "Third Call": "#6366F1",
      "Lost": "#64748B",
    };
    return colors[stages[interestLevel]] || '#64748B';
  };

  const filteredLeads = useMemo(() => {
    if (!selectedEmployeeName || leads.length === 0) {
      return [];
    }

    const employees = selectedEmployeeName.split(',').map(name => name.trim().toLowerCase());
    
    let filtered = leads.filter(lead => {
      const leadEmployeeName = lead.SalesEmpName 
        ? lead.SalesEmpName.toLowerCase().trim()
        : '';
      return employees.includes(leadEmployeeName);
    });

    if (filterMode === 'currentMonth') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      filtered = filtered.filter(lead => {
        if (!lead.PredictedClosingDate) return false;
        const closingDate = new Date(lead.PredictedClosingDate);
        return closingDate.getMonth() === currentMonth && 
               closingDate.getFullYear() === currentYear;
      });
    } else if (filterMode === 'starred') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      filtered = filtered.filter(lead => {
        const hasOpportunityName = !!lead.OpportunityName;
        const predictedDate = lead.PredictedClosingDate;
        
        if (!hasOpportunityName || !predictedDate) return false;
        
        const closingDate = new Date(predictedDate);
        return closingDate.getMonth() === currentMonth && 
               closingDate.getFullYear() === currentYear;
      });
    }

    return filtered;
  }, [leads, selectedEmployeeName, filterMode]);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const toggleFilterMode = () => {
    setFilterMode(prevMode => {
      if (prevMode === 'all') return 'currentMonth';
      if (prevMode === 'currentMonth') return 'starred';
      return 'all';
    });
  };

  const getFilterModeText = () => {
    switch (filterMode) {
      case 'currentMonth':
        return 'This Month';
      case 'starred':
        return 'Starred';
      default:
        return 'All Leads';
    }
  };

  const renderLeadItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.leadItem}
      onPress={() => {
        setSelectedLead(item);
        setIsDetailModalOpen(true);
      }}
    >
      <View style={styles.leadHeader}>
        <View style={styles.leadTitleContainer}>
          <Text style={styles.leadTitle} numberOfLines={1}>
            {item.CardName || 'Unknown'}
          </Text>
          <Text style={styles.leadSubtitle}>
            Seq: {item.SequentialNo}
          </Text>
        </View>
        <View style={[styles.stageChip, { backgroundColor: getStageColor(item.InterestLevel) }]}>
          <Text style={styles.stageText}>
            {stages[item.InterestLevel] || 'Unknown'}
          </Text>
        </View>
      </View>

      <View style={styles.leadDetails}>
        <View style={styles.leadDetailRow}>
          <Ionicons name="person" size={14} color="#64748B" />
          <Text style={styles.leadDetailText}>
            {item.SalesEmpName || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.leadDetailRow}>
          <Ionicons name="calendar" size={14} color="#64748B" />
          <Text style={styles.leadDetailText}>
            {formatDate(item.PredictedClosingDate)}
          </Text>
        </View>

        <View style={styles.leadDetailRow}>
          <Ionicons name="cash" size={14} color="#64748B" />
          <Text style={styles.leadDetailText}>
            {formatCurrency(item.MaxLocalTotal)}
          </Text>
        </View>
      </View>

      {item.ProductInterested && (
        <Text style={styles.productText} numberOfLines={2}>
          {item.ProductInterested}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderLeadDetail = () => (
    <Modal
      visible={isDetailModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsDetailModalOpen(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Lead Details</Text>
          <View style={styles.placeholder} />
        </View>

        {selectedLead && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Basic Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Company:</Text>
                <Text style={styles.detailValue}>{selectedLead.CardName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedLead.Phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>City:</Text>
                <Text style={styles.detailValue}>{selectedLead.City || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>State:</Text>
                <Text style={styles.detailValue}>{selectedLead.State || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Lead Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stage:</Text>
                <View style={[styles.stageChip, { backgroundColor: getStageColor(selectedLead.InterestLevel) }]}>
                  <Text style={styles.stageText}>
                    {stages[selectedLead.InterestLevel] || 'Unknown'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedLead.MaxLocalTotal)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expected Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedLead.PredictedClosingDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sales Person:</Text>
                <Text style={styles.detailValue}>{selectedLead.SalesEmpName || 'N/A'}</Text>
              </View>
            </View>

            {selectedLead.ProductInterested && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Products Interested</Text>
                <Text style={styles.detailValue}>{selectedLead.ProductInterested}</Text>
              </View>
            )}

            {selectedLead.Remarks && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>Remarks</Text>
                <Text style={styles.detailValue}>{selectedLead.Remarks}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="business" size={20} color="#007AFF" />
          <Text style={styles.title}>Leads</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={toggleFilterMode}>
          <Text style={styles.filterButtonText}>{getFilterModeText()}</Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{filteredLeads.length}</Text>
          <Text style={styles.statLabel}>Total Leads</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(filteredLeads.reduce((sum, lead) => sum + (lead.MaxLocalTotal || 0), 0))}
          </Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
      </View>

      {!selectedEmployeeName ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Please select an employee to view leads</Text>
        </View>
      ) : filteredLeads.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No leads found for selected criteria</Text>
        </View>
      ) : (
        <View style={styles.leadsContainer}>
          <FlatList
            data={filteredLeads}
            keyExtractor={(item, index) => `${item.SequentialNo}-${index}`}
            renderItem={renderLeadItem}
            style={styles.leadsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.leadsListContent}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {renderLeadDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: 500, // Increased max height
    minHeight: 420, // Increased minimum height to show 3-4 items
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginRight: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  leadsContainer: {
    flex: 1,
    height: 280, // Increased height to show 3-4 items properly
  },
  leadsList: {
    flex: 1,
  },
  leadsListContent: {
    paddingBottom: 16,
  },
  leadItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leadTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  leadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  leadSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  stageChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leadDetails: {
    marginBottom: 8,
  },
  leadDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  leadDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  productText: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  placeholder: {
    width: 50,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
});

export default LeadsCard;
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

const { width } = Dimensions.get('window');

const BANK_ACCOUNTS = [
  { code: '31207', name: 'ICICI Bank A/c 055105001187' },
  { code: '31212', name: 'Ashva Cantrol A/c' },
  { code: '31211', name: 'UBI A/C NO: 114011160000001' },
];

const PaymentUpdateModal = ({ visible, onClose, orderId, orderNumber }) => {
  const [formData, setFormData] = useState({
    amount: '',
    glnCode: '',
    payId: '',
    transferDate: '',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [bankAccounts, setBankAccounts] = useState(BANK_ACCOUNTS);

  useEffect(() => {
    if (visible) {
      fetchBankAccounts();
    }
  }, [visible]);

  const fetchBankAccounts = async () => {
    try {
      const response = await axios.get('https://api.chesadentalcare.com/bank-accounts');
      if (response.data?.success && response.data?.data?.length > 0) {
        setBankAccounts(response.data.data.map(acc => ({
          code: acc.code || acc.value,
          name: acc.name || acc.label,
        })));
      }
    } catch {
      // Use hardcoded fallback
    }
  };

  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.glnCode || !formData.payId || !formData.transferDate) {
      Alert.alert('Missing Fields', 'Please fill all required fields before submitting.');
      return;
    }

    if (!receiptFile) {
      Alert.alert('Missing Receipt', 'Please upload a receipt before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('orderId', orderId);
      formDataToSend.append('orderNumber', orderNumber);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('glnCode', formData.glnCode);
      formDataToSend.append('payId', formData.payId);
      formDataToSend.append('transferDate', formData.transferDate);

      if (receiptFile) {
        formDataToSend.append('receipt', {
          uri: receiptFile.uri,
          type: receiptFile.mimeType || 'application/octet-stream',
          name: receiptFile.name,
        });
      }

      await axios.post('https://api.chesadentalcare.com/payment-update', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Payment updated successfully!');
      resetForm();
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ amount: '', glnCode: '', payId: '', transferDate: '' });
    setReceiptFile(null);
    setShowDatePicker(false);
    setShowBankDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedBank = bankAccounts.find(b => b.code === formData.glnCode);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="card" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Update Payment</Text>
                <Text style={styles.headerSubtitle}>Order #{orderNumber}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Amount <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>INR</Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.amount}
                  onChangeText={(v) => handleChange('amount', v)}
                />
              </View>
            </View>

            {/* Bank Account */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Bank Account <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.selectBtn, showBankDropdown && styles.selectBtnActive]}
                onPress={() => setShowBankDropdown(!showBankDropdown)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={selectedBank ? '#1E293B' : '#94A3B8'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.selectText, !selectedBank && styles.selectPlaceholder]} numberOfLines={1}>
                  {selectedBank ? selectedBank.name : 'Select bank account'}
                </Text>
                <Ionicons
                  name={showBankDropdown ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {showBankDropdown && (
                <View style={styles.dropdown}>
                  {bankAccounts.map((bank) => {
                    const isSelected = formData.glnCode === bank.code;
                    return (
                      <TouchableOpacity
                        key={bank.code}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                        onPress={() => {
                          handleChange('glnCode', bank.code);
                          setShowBankDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.dropdownTextWrap}>
                          <Text style={[styles.dropdownName, isSelected && styles.dropdownNameSelected]}>
                            {bank.name}
                          </Text>
                          <Text style={styles.dropdownCode}>Code: {bank.code}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Pay ID */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Pay ID / UTR <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="receipt-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter transaction reference"
                  placeholderTextColor="#94A3B8"
                  value={formData.payId}
                  onChangeText={(v) => handleChange('payId', v)}
                  maxLength={12}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Transfer Date */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Transfer Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.inputWrap}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                <Text style={formData.transferDate ? styles.dateValue : styles.datePlaceholder}>
                  {formData.transferDate ? formatDisplayDate(formData.transferDate) : 'Select transfer date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.transferDate ? new Date(formData.transferDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');
                      handleChange('transferDate', `${year}-${month}-${day}`);
                    }
                  }}
                />
              )}
            </View>

            {/* Receipt Upload */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Receipt <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.uploadArea, receiptFile && styles.uploadAreaSelected]}
                onPress={handleFileSelect}
                activeOpacity={0.7}
              >
                {receiptFile ? (
                  <View style={styles.uploadedRow}>
                    <View style={styles.fileIconWrap}>
                      <Ionicons name="document-attach" size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{receiptFile.name}</Text>
                      <Text style={styles.fileHint}>Tap to change file</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); setReceiptFile(null); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <View style={styles.uploadIconCircle}>
                      <Ionicons name="cloud-upload-outline" size={24} color="#3B82F6" />
                    </View>
                    <Text style={styles.uploadText}>Upload receipt</Text>
                    <Text style={styles.uploadSubtext}>Image or PDF</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Submit Payment</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  field: {
    marginTop: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  required: {
    color: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  currencyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    padding: 0,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  selectBtnActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  selectPlaceholder: {
    color: '#94A3B8',
  },
  dropdown: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  dropdownNameSelected: {
    fontWeight: '600',
    color: '#1D4ED8',
  },
  dropdownCode: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  dateValue: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  datePlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  uploadAreaSelected: {
    borderStyle: 'solid',
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  fileHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PaymentUpdateModal;

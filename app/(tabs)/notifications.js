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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import moment from 'moment';
import Constants from 'expo-constants';
import axios from 'axios';
import { BASE_URL as API_BASE_URL } from '../../config/apiConfig';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [empId, setEmpId] = useState(null);

  useEffect(() => {
    loadEmployeeId();

    // Safety timeout - if still loading after 10 seconds, stop
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
      loadNotifications();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadNotifications(true); // Silent refresh
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [empId]);

  const loadEmployeeId = async () => {
    try {
      const storedEmpId = await AsyncStorage.getItem('employeeID');
      console.log('Loaded employee ID:', storedEmpId);
      if (storedEmpId) {
        setEmpId(storedEmpId);
      } else {
        setError('Employee ID not found. Please login again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading employee ID:', error);
      setError('Failed to load employee information');
      setIsLoading(false);
    }
  };

  const loadNotifications = async (silent = false) => {
    if (!empId) {
      console.log('No employee ID, skipping notification load');
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      console.log(`Loading notifications for employee: ${empId}`);
      const response = await axios.get(
        `${API_BASE_URL}/notifications/employee/${empId}`
      );

      console.log('Notifications response:', response.data);

      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setError('');
      } else {
        setError('Failed to load notifications');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (!silent) {
        setError('Failed to load notifications. Please try again.');
      }
      setNotifications([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  }, [empId]);

  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read in backend
      if (!notification.is_read) {
        await axios.patch(
          `${API_BASE_URL}/notifications/${notification.id}/read`,
          { empId }
        );

        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n.id === notification.id
              ? { ...n, is_read: true, read_at: new Date() }
              : n
          )
        );
      }

      // Handle navigation based on notification type
      const data = notification.data || {};

      if (data.type === 'lead_followup' && data.leads) {
        // Navigate to leads page (Home tab)
        router.push('/(tabs)');
      } else if (data.entityType === 'Lead' && data.entityId) {
        // Navigate to specific lead
        router.push({
          pathname: '/leads/[leadId]',
          params: { leadId: data.entityId }
        });
      } else if (data.type === 'payment_rejected' && data.orderId) {
        // Navigate to the specific order details page for re-upload
        router.push(`/${data.orderId}`);
      } else if (data.type === 'payment_update_rejected' && data.orderId) {
        // Navigate to order details for payment update re-upload
        router.push(`/${data.orderId}`);
      } else if (data.entityType === 'Order' && data.orderId) {
        // Navigate to orders tab
        router.push('/(tabs)/Orders');
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'This will clear all read notifications. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await axios.post(
                `${API_BASE_URL}/notifications/clear-all`,
                { empId }
              );

              if (response.data.success) {
                // Remove read notifications from local state
                setNotifications(prevNotifications =>
                  prevNotifications.filter(n => !n.is_read)
                );

                Alert.alert(
                  'Success',
                  `${response.data.data.clearedCount} notification(s) cleared`
                );
              }
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const markAllAsRead = async () => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/notifications/mark-all-read`,
        { empId }
      );

      if (response.data.success) {
        // Update all notifications to read in local state
        setNotifications(prevNotifications =>
          prevNotifications.map(n => ({
            ...n,
            is_read: true,
            read_at: new Date()
          }))
        );

        Alert.alert('Success', 'All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const renderNotificationItem = ({ item }) => {
    const notifData = item.data || {};
    const isUnread = !item.is_read;

    // Determine icon based on notification type
    let iconName = 'notifications';
    let iconColor = '#F59E0B';

    if (item.notification_type === 'payment_rejected' || notifData.type === 'payment_rejected') {
      iconName = 'alert-circle';
      iconColor = '#EF4444';
    } else if (item.notification_type === 'payment_update_rejected' || notifData.type === 'payment_update_rejected') {
      iconName = 'alert-circle';
      iconColor = '#EF4444';
    } else if (item.notification_type === 'order_confirmed') {
      iconName = 'checkmark-circle';
      iconColor = '#10B981';
    } else if (item.notification_type === 'lead_assigned' || notifData.type === 'lead_followup') {
      iconName = 'calendar';
      iconColor = '#3B82F6';
    } else if (notifData.entityType === 'Order') {
      iconName = 'cart';
      iconColor = '#10B981';
    }

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationBody}>{item.body}</Text>
            <Text style={styles.notificationTime}>
              {moment(item.created_at).fromNow()}
            </Text>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={true} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={true} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {notifications.some(n => !n.is_read) && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
              <Ionicons name="checkmark-done" size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={clearAllNotifications} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You'll receive notifications for orders, leads, and updates here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : Constants.statusBarHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  unreadCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderLeftWidth: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NotificationsScreen;

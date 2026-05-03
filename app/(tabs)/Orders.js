import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AllOrdersTab from '../components/orders/AllOrdersTab.js';
import WaitingOrdersTab from '../components/orders/WaitingOrdersTab.js';

const { width } = Dimensions.get('window');

const OrdersScreen = () => {
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting' or 'all'
  const [slideAnim] = useState(new Animated.Value(0));
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Initial fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Slide animation for tab indicator
    Animated.spring(slideAnim, {
      toValue: activeTab === 'waiting' ? 0 : 1,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [activeTab]);

  const handleTabPress = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'waiting':
        return <WaitingOrdersTab />;
      case 'all':
        return <AllOrdersTab />;
      default:
        return <WaitingOrdersTab />;
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#fff" 
        translucent={true}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSubtitle}>Manage sales orders</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'waiting' && styles.activeTab
            ]}
            onPress={() => handleTabPress('waiting')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'waiting' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'waiting' && styles.activeTabText
            ]}>
              Waiting Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'all' && styles.activeTab
            ]}
            onPress={() => handleTabPress('all')}
          >
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={activeTab === 'all' ? '#007AFF' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'all' && styles.activeTabText
            ]}>
              All Orders
            </Text>
          </TouchableOpacity>

          {/* Animated Tab Indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width / 2 - 19],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Constants.statusBarHeight,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '500',
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabWrapper: {
    flexDirection: 'row',
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 3,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    zIndex: 1,
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    zIndex: 2,
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    width: width / 2 - 22,
    height: '85%',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 0,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default OrdersScreen;
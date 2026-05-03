import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://api.chesadentalcare.com';

const allTabs = [
  { name: 'index', label: 'Leads', icon: 'home' },
  { name: 'Home', label: 'Shop', icon: 'shopping-cart' },
  { name: 'EnterLeads', label: 'Add', icon: 'add-circle' },
  { name: 'service', label: 'Service', icon: 'build' },
  { name: 'kpi', label: 'KPI', icon: 'analytics' },
  { name: 'notifications', label: 'Alerts', icon: 'notifications' },
  { name: 'two', label: 'Orders', icon: 'receipt' },
  { name: 'more', label: 'More', icon: 'menu' },
];

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const [unreadCount, setUnreadCount] = useState(0);
  const [employeeId, setEmployeeId] = useState(null);
  const [tabs, setTabs] = useState(allTabs);

  // Get current route name
  const currentRouteName = state.routes[state.index].name;

  // Find the index of current route in our tabs array
  const activeTabIndex = tabs.findIndex(tab => tab.name === currentRouteName);
  const displayIndex = activeTabIndex >= 0 ? activeTabIndex : 0;

  // Load employee ID and filter tabs
  useEffect(() => {
    loadEmployeeId();
  }, []);

  useEffect(() => {
    if (employeeId) {
      filterTabs();
    }
  }, [employeeId]);

  // Load unread notification count
  useEffect(() => {
    loadUnreadCount();

    // Update count when returning to the app or tab changes
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadEmployeeId = async () => {
    try {
      const storedEmpId = await AsyncStorage.getItem('employeeID');
      setEmployeeId(storedEmpId);
    } catch (error) {
      console.error('Error loading employee ID:', error);
    }
  };

  const filterTabs = () => {
    // Show all tabs to everyone
    setTabs(allTabs);
  };

  const loadUnreadCount = async () => {
    try {
      const empId = await AsyncStorage.getItem('employeeID');
      if (!empId) {
        setUnreadCount(0);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/notifications/employee/${empId}/unread-count`
      );

      if (response.data.success) {
        setUnreadCount(response.data.data.unreadCount);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      // Fallback: don't show count if API fails
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const newScale = 2.6;
    
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: (width / tabs.length) * displayIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scaleX, {
        toValue: newScale,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start();
  }, [displayIndex]);

  return (
    <View style={[styles.tabContainer, { paddingBottom: insets.bottom }]}>
      {/* Sliding Active Indicator */}
      {/* <Animated.View
        style={[
          styles.slidingIndicator,
          {
            transform: [{ 
              translateX: Animated.add(
                translateX,
                new Animated.Value((width / tabs.length) / 2.3 - 6)
              )
            }, {
              scaleX: scaleX
            }],
          },
        ]}
      /> */}
      
      {tabs.map((tab, index) => {
        const isFocused = currentRouteName === tab.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: tab.name,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };


        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={[styles.tabItem, isFocused && styles.activeTabItem]}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={tab.icon}
                size={22}
                color={isFocused ? '#f7931e' : '#6B7280'}
                style={[
                  styles.tabIcon,
                  {
                    transform: [{ scale: isFocused ? 1.15 : 1 }],
                  },
                ]}
              />

              {/* Badge for notifications */}
              {tab.name === 'notifications' && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 12,
    marginHorizontal: 1,
    minHeight: 58,
    justifyContent: 'center',
  },
  activeTabItem: {
    backgroundColor: '#fef3e2ff',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIcon: {
    marginBottom: 0,
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    height: 6,
    width: 12,
    backgroundColor: '#f7931e',
    borderRadius: 3,
  },
  tabLabel: {
    fontSize: 9.5,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 2,
  },
  activeTabLabel: {
    color: '#f7931e',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});

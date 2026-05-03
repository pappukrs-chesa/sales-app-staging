import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePoints } from '../../ContextAPI/PointsContext';

const OrderForecast = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { addPointsToTable, refreshPoints } = usePoints();

  // Check if it's first 5 days of the month (like web app)
  const isFirstFiveDays = () => {
    const today = new Date();
    return today.getDate() <= 5;
  };

  const handleForecastCheck = async () => {
    if (!isFirstFiveDays()) {
      Alert.alert('Info', 'Forecast checking is only available in the first 5 days of the month.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get employee data
      const employeeId = await AsyncStorage.getItem('employeeID');
      const userData = await AsyncStorage.getItem('user');
      
      if (!employeeId || !userData) {
        Alert.alert('Error', 'Employee data not found');
        return;
      }

      const user = JSON.parse(userData);
      const target = user.target || 0;

      // Simulate forecast API call (similar to web app)
      const forecastData = {
        employeeid: parseInt(employeeId),
        activity_type: 2, // Forecast activity
        target: target,
      };

      // For now, simulate the API response
      // In real implementation, this would call the actual API
      console.log('Forecast Data:', forecastData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success and award points
      const forecastPoints = Math.floor(Math.random() * 50) + 25; // Random points between 25-75
      await addPointsToTable(forecastPoints, 2);
      
      Alert.alert(
        'Forecast Complete!', 
        `You've earned ${forecastPoints} points for forecast checking!`,
        [{ text: 'Awesome!', onPress: () => refreshPoints() }]
      );
      
    } catch (error) {
      console.error('Error during forecast:', error);
      Alert.alert('Info', 'Forecast checked - no additional points awarded this time.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFirstFiveDays()) {
    return null; // Don't show the button if not in first 5 days
  }

  return (
    <TouchableOpacity
      style={[styles.forecastButton, isLoading && styles.disabledButton]}
      onPress={handleForecastCheck}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="trending-up" size={20} color="#fff" />
        )}
        <Text style={styles.buttonText}>
          {isLoading ? 'Checking...' : 'Check Forecast'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  forecastButton: {
    backgroundColor: '#917bff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default OrderForecast;
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePoints } from '../../ContextAPI/PointsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/config/apiConfig';

const AchievementsCard = () => {
  const [highestSalesData, setHighestSalesData] = useState('');
  const [highestActivityData, setHighestActivityData] = useState('');
  const [highestSalesPerson, setHighestSalesPerson] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch highest sales data (same as web)
      const salesResponse = await fetch(`${BASE_URL}/getHighestSalesData`);
      const salesData = await salesResponse.json();
      setHighestSalesData(salesData.highestSalesData.employeeName);
      setHighestSalesPerson(salesData.highestSalesPerson.employeeName);
      
      // Fetch highest activity points (same as web)
      const activityResponse = await fetch(`${BASE_URL}/get_highest_activity_points`);
      const activityData = await activityResponse.json();
      if (activityData && activityData.data) {
        setHighestActivityData(activityData.data.employee_name);
      }
    } catch (error) {
      console.error('Error fetching achievement data:', error);
    }
  };

  const achievements = useMemo(() => {
    // Company-wide achievements (same as web)
    const companyAchievements = [
      {
        id: 'ace_of_sales',
        title: 'Ace of Sales',
        description: 'Exceptional sales performance',
        icon: 'trophy',
        color: '#DC2626', // Red
        employeeName: highestSalesPerson || 'Loading...',
        category: 'Sales Excellence',
      },
      {
        id: 'revenue_ruler',
        title: 'Revenue Ruler',
        description: 'Top revenue generator',
        icon: 'cash',
        color: '#9333EA', // Purple
        employeeName: highestSalesData || 'Loading...',
        category: 'Revenue Champion',
      },
      {
        id: 'lead_dynamo',
        title: 'Lead Dynamo',
        description: 'Outstanding lead generation',
        icon: 'flash',
        color: '#F59E0B', // Orange
        employeeName: highestActivityData || 'Loading...',
        category: 'Activity Leader',
      },
    ];

    return companyAchievements;
  }, [highestSalesData, highestActivityData, highestSalesPerson]);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  const renderAchievement = (achievement) => (
    <View key={achievement.id} style={styles.achievementItem}>
      <View style={[styles.achievementIcon, { backgroundColor: achievement.color }]}>
        <Ionicons 
          name={achievement.icon} 
          size={24} 
          color="#FFFFFF"
        />
      </View>
      
      <View style={styles.achievementContent}>
        <Text style={styles.achievementTitle}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDescription}>
          {achievement.description}
        </Text>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{achievement.category}</Text>
        </View>
        <Text style={styles.employeeNameText}>
          🏆 {achievement.employeeName}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={20} color="#007AFF" />
          <Text style={styles.title}>Achievements</Text>
        </View>
      </View>

      <Text style={styles.monthTitle}>Achievements in {currentMonth}</Text>

      <View style={styles.achievementsContainer}>
        {achievements.map(renderAchievement)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    minHeight: 380,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryStats: {
    alignItems: 'center',
    marginRight: 16,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  achievementsList: {
    flex: 1,
  },
  achievementsListContent: {
    paddingBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  achievementsContainer: {
    flexDirection: 'column',
    gap: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 2,
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  employeeNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 6,
    textShadowColor: 'rgba(5, 150, 105, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  checkmark: {
    marginLeft: 8,
  },
  pointsContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },
});

export default AchievementsCard;
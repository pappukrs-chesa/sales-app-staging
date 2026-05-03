import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '@/config/apiConfig';

const LeaderBoardCard = () => {
  const [loading, setLoading] = useState(true);
  const [pointsData, setPointsData] = useState([]);

  useEffect(() => {
    fetchLeaderBoardData();
  }, []);

  const fetchLeaderBoardData = async () => {
    try {
      setLoading(true);
      
      // Fetch points data from API (same as web)
      const response = await fetch(`${BASE_URL}/get_points_all`);
      const data = await response.json();
      setPointsData(data);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const { topThree, remainingEmployees } = useMemo(() => {
    if (!pointsData || pointsData.length === 0) {
      return { topThree: [], remainingEmployees: [] };
    }

    // Sort by points (descending) - same as web implementation
    const sortedData = [...pointsData].sort((a, b) => b.points - a.points);
    
    return {
      topThree: sortedData.slice(0, 3),
      remainingEmployees: sortedData.slice(3),
    };
  }, [pointsData]);

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return 'trophy';
      case 1: return 'medal';
      case 2: return 'ribbon';
      default: return 'person';
    }
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0: return '#FFD700'; // Gold
      case 1: return '#C0C0C0'; // Silver
      case 2: return '#CD7F32'; // Bronze
      default: return '#64748B';
    }
  };

  const renderTopThree = () => (
    <View style={styles.topThreeContainer}>
      <Text style={styles.topThreeTitle}>🏆 Top 3</Text>
      <View style={styles.podiumContainer}>
        {/* 2nd Place */}
        {topThree[1] && (
          <View style={[styles.podiumItem, styles.secondPlace]}>
            <View style={[styles.avatar, styles.silverAvatar]}>
              <Text style={styles.avatarText}>{topThree[1].employee_name[0]}</Text>
            </View>
            <Text style={styles.positionText}>2nd</Text>
            <Text style={styles.employeeName} numberOfLines={1}>{topThree[1].employee_name}</Text>
            <Text style={styles.pointsText}>{topThree[1].points} pts</Text>
          </View>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <View style={[styles.podiumItem, styles.firstPlace]}>
            <View style={[styles.avatar, styles.goldAvatar]}>
              <Text style={styles.avatarText}>{topThree[0].employee_name[0]}</Text>
            </View>
            <Text style={styles.positionText}>1st</Text>
            <Text style={styles.employeeName} numberOfLines={1}>{topThree[0].employee_name}</Text>
            <Text style={styles.pointsText}>{topThree[0].points} pts</Text>
          </View>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <View style={[styles.podiumItem, styles.thirdPlace]}>
            <View style={[styles.avatar, styles.bronzeAvatar]}>
              <Text style={styles.avatarText}>{topThree[2].employee_name[0]}</Text>
            </View>
            <Text style={styles.positionText}>3rd</Text>
            <Text style={styles.employeeName} numberOfLines={1}>{topThree[2].employee_name}</Text>
            <Text style={styles.pointsText}>{topThree[2].points} pts</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderLeaderItem = ({ item, index }) => (
    <View style={styles.leaderItem}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{index + 4}</Text>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.employee_name[0]}</Text>
      </View>

      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName} numberOfLines={1}>
          {item.employee_name}
        </Text>
      </View>

      <View style={styles.leaderStats}>
        <Text style={styles.pointsText}>{item.points} pts</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="trophy" size={20} color="#007AFF" />
            <Text style={styles.title}>Leaderboard</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Leaderboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={20} color="#007AFF" />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <Text style={styles.subtitle}>This Month</Text>
      </View>

      {pointsData.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No leaderboard data available</Text>
        </View>
      ) : (
        <View>
          {renderTopThree()}
          
          {remainingEmployees.length > 0 && (
            <View style={styles.remainingContainer}>
              <Text style={styles.remainingTitle}>Leaderboard</Text>
              <View style={styles.leaderListContainer}>
                <FlatList
                  data={remainingEmployees.slice(0, 7)} // Show top 10 total (3 + 7)
                  keyExtractor={(item, index) => `${item.employeeid}-${index}`}
                  renderItem={renderLeaderItem}
                  style={styles.leaderList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.leaderListContent}
                  nestedScrollEnabled={true}
                />
              </View>
            </View>
          )}
        </View>
      )}
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
    maxHeight: 800,
    minHeight: 520,
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
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  topThreeContainer: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#667eea', // Fallback for React Native
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topThreeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingHorizontal: 10,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  firstPlace: {
    marginBottom: 0,
  },
  secondPlace: {
    marginBottom: 20,
  },
  thirdPlace: {
    marginBottom: 20,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#9C5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  goldAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F59E0B',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  silverAvatar: {
    backgroundColor: '#6B7280',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  bronzeAvatar: {
    backgroundColor: '#92400E',
    borderWidth: 3,
    borderColor: '#CD7F32',
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  employeeName: {
    fontSize: 12,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#683903ff',
  },
  remainingContainer: {
    marginTop: 16,
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  remainingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderListContainer: {
    height: 240, // Increased height for better visibility
  },
  leaderList: {
    flex: 1,
  },
  leaderListContent: {
    paddingBottom: 16,
  },
  leaderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rankContainer: {
    alignItems: 'center',
    minWidth: 30,
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  leaderStats: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default LeaderBoardCard;
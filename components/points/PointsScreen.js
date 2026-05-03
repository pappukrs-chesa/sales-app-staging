import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePoints } from '../../ContextAPI/PointsContext';

const PointsScreen = () => {
  const navigation = useNavigation();
  const { earnedPoints, loading, error, refreshPoints } = usePoints();
  const [pointsHistory, setPointsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Activity type mapping
  const activityTypeMapping = {
    1: 'Lead Entry',
    2: 'Sale Closed',
    3: 'Meeting',
    4: 'Follow-up',
    5: 'Other',
  };

  useEffect(() => {
    fetchPointsHistory();
  }, []);

  const fetchPointsHistory = async () => {
    try {
      setHistoryLoading(true);
      const employeeId = await AsyncStorage.getItem('employeeID');
      
      if (!employeeId) {
        Alert.alert('Error', 'Employee ID not found');
        return;
      }

      // Try to fetch points history - if API doesn't exist, show empty state
      const response = await fetch(
        `https://api.chesadentalcare.com/get_points_history?employeeid=${employeeId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setPointsHistory(data.reverse()); // Show newest first
        } else {
          console.warn('Points history API returned non-array data');
          setPointsHistory([]);
        }
      } else if (response.status === 404) {
        // API endpoint doesn't exist yet - show empty state
        console.log('Points history API not available yet');
        setPointsHistory([]);
      } else {
        console.warn('Points history API returned non-200 status:', response.status);
        setPointsHistory([]);
      }
    } catch (error) {
      console.error('Error fetching points history:', error);
      setPointsHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshPoints && refreshPoints(),
      fetchPointsHistory(),
    ]);
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getActivityIcon = (activityType) => {
    const icons = {
      1: 'person-add',      // Lead Entry
      2: 'trophy',          // Sale Closed
      3: 'people',          // Meeting
      4: 'call',            // Follow-up
      5: 'star',            // Other
    };
    return icons[activityType] || 'star';
  };

  const getActivityColor = (activityType) => {
    const colors = {
      1: '#007AFF',     // Lead Entry - Blue
      2: '#34C759',     // Sale Closed - Green
      3: '#FF9500',     // Meeting - Orange
      4: '#5856D6',     // Follow-up - Purple
      5: '#FF2D92',     // Other - Pink
    };
    return colors[activityType] || '#8E8E93';
  };

  const renderHistoryItem = ({ item, index }) => {
    const activityType = item.activity_type || 5;
    const activityName = activityTypeMapping[activityType] || 'Unknown Activity';
    const activityIcon = getActivityIcon(activityType);
    const activityColor = getActivityColor(activityType);

    return (
      <View style={styles.historyItem}>
        <View style={[styles.activityIcon, { backgroundColor: activityColor }]}>
          <Ionicons name={activityIcon} size={20} color="#fff" />
        </View>
        
        <View style={styles.historyContent}>
          <View style={styles.historyHeader}>
            <Text style={styles.activityName}>{activityName}</Text>
            <Text style={styles.pointsEarned}>+{item.points || 0}</Text>
          </View>
          
          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
          
          {item.description && (
            <Text style={styles.historyDescription}>{item.description}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>My Points</Text>
      <View style={styles.headerRight} />
    </View>
  );

  const renderPointsSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.pointsCard}>
        <View style={styles.coinDisplay}>
          <View style={styles.largeCoin}>
            <Text style={styles.largeCoinText}>C</Text>
          </View>
        </View>
        
        <View style={styles.pointsInfo}>
          <Text style={styles.totalPointsLabel}>Total Points</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.totalPoints}>
              {earnedPoints !== null ? earnedPoints : '0'}
            </Text>
          )}
          {error && (
            <Text style={styles.errorText}>Failed to load points</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={80} color="#ccc" />
      <Text style={styles.emptyText}>No Points History</Text>
      <Text style={styles.emptySubtext}>
        Start earning points by completing activities!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={pointsHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => `${item.id || index}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderPointsSummary}
        ListEmptyComponent={!historyLoading ? renderEmptyHistory : null}
        contentContainerStyle={[
          styles.scrollContent,
          pointsHistory.length === 0 && !historyLoading && styles.emptyScrollContent
        ]}
        showsVerticalScrollIndicator={false}
      />
      
      {historyLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading points history...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  summaryContainer: {
    padding: 16,
  },
  pointsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coinDisplay: {
    marginBottom: 16,
  },
  largeCoin: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  largeCoinText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  pointsInfo: {
    alignItems: 'center',
  },
  totalPointsLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  totalPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  pointsEarned: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default PointsScreen;
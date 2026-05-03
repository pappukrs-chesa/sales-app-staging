import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePoints } from '../../ContextAPI/PointsContext';

const PointsContainer = ({ style, onPress, showLabel = true }) => {
  const { earnedPoints, loading, error, refreshPoints } = usePoints();

  const handleRefresh = () => {
    if (refreshPoints) {
      refreshPoints();
    }
  };

  const formatPoints = (points) => {
    if (points === null || points === undefined) return '0';
    return points.toString();
  };

  if (loading && earnedPoints === null) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.pointsDisplay}>
          <ActivityIndicator size="small" color="#007AFF" />
          {showLabel && <Text style={styles.label}>Loading...</Text>}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.errorContainer, style]}
        onPress={handleRefresh}
        activeOpacity={0.7}
      >
        <View style={styles.pointsDisplay}>
          <Ionicons name="refresh-outline" size={20} color="#FF6B6B" />
          {showLabel && <Text style={[styles.label, styles.errorText]}>Error</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.pointsDisplay}>
        <View style={styles.coinContainer}>
          <View style={styles.coin}>
            <Text style={styles.coinText}>C</Text>
          </View>
          <Text style={styles.pointsText}>{formatPoints(earnedPoints)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  errorContainer: {
    opacity: 0.7,
  },
  errorText: {
    color: '#FF6B6B',
  },
});

export default PointsContainer;
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

const ProgressCard = ({
  progress = 0,
  title = "Sales Progress",
  subtitle = null,
  orderBooked = 0,
  forecast = 0,
  target = 100
}) => {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  // Calculate percentages for three segments
  const bookedPercentage = target > 0 ? Math.min((orderBooked / target) * 100, 100) : 0;
  const forecastPercentage = target > 0 ? Math.min((forecast / target) * 100, 100 - bookedPercentage) : 0;
  const remainingPercentage = Math.max(0, 100 - bookedPercentage - forecastPercentage);

  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  
  // Circle properties
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * normalizedProgress) / 100;

  const getProgressColor = () => {
    if (normalizedProgress >= 100) return '#10B981'; // Green
    if (normalizedProgress >= 80) return '#3B82F6';  // Blue
    if (normalizedProgress >= 60) return '#F59E0B';  // Yellow
    if (normalizedProgress >= 40) return '#F97316';  // Orange
    return '#EF4444'; // Red
  };

  const getProgressIcon = () => {
    if (normalizedProgress >= 100) return 'checkmark-circle';
    if (normalizedProgress >= 80) return 'trending-up';
    if (normalizedProgress >= 60) return 'analytics';
    if (normalizedProgress >= 40) return 'warning';
    return 'alert-circle';
  };

  const getProgressMessage = () => {
    if (normalizedProgress >= 100) return 'Target Achieved!';
    if (normalizedProgress >= 80) return 'Almost There';
    if (normalizedProgress >= 60) return 'Good Progress';
    if (normalizedProgress >= 40) return 'Making Progress';
    return 'Needs Improvement';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="bar-chart" size={20} color="#007AFF" />
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
            {/* Background circle */}
            <Circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke={getProgressColor()}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${radius + strokeWidth / 2} ${radius + strokeWidth / 2})`}
            />
          </Svg>
          
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressPercentage, { color: getProgressColor() }]}>
              {normalizedProgress.toFixed(0)}%
            </Text>
          </View>
        </View>

        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}

        <View style={styles.statusContainer}>
          <Ionicons 
            name={getProgressIcon()} 
            size={24} 
            color={getProgressColor()} 
          />
          <Text style={[styles.statusText, { color: getProgressColor() }]}>
            {getProgressMessage()}
          </Text>
        </View>

        {/* Three-segment progress bar */}
        <View style={styles.progressBar}>
          {/* Green segment - Order Booked */}
          <View
            style={[
              styles.progressSegment,
              {
                width: `${bookedPercentage}%`,
                backgroundColor: '#10B981',
              }
            ]}
          />
          {/* Blue segment - Forecast */}
          <View
            style={[
              styles.progressSegment,
              {
                width: `${forecastPercentage}%`,
                backgroundColor: '#3B82F6',
              }
            ]}
          />
          {/* Grey segment - Remaining */}
          <View
            style={[
              styles.progressSegment,
              {
                width: `${remainingPercentage}%`,
                backgroundColor: '#E2E8F0',
              }
            ]}
          />
        </View>

        {/* Legend for the three segments */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Booked ({bookedPercentage.toFixed(1)}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Forecast ({forecastPercentage.toFixed(1)}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
            <Text style={styles.legendText}>Remaining ({remainingPercentage.toFixed(1)}%)</Text>
          </View>
        </View>

        {normalizedProgress < 100 && (
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingText}>
              {(100 - normalizedProgress).toFixed(1)}% remaining to target
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  content: {
    flex: 1,
    alignItems: 'center',
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  progressSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  remainingContainer: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remainingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default ProgressCard;
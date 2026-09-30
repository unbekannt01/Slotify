import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SlotItem, SlotStatus } from '../api/shopApi';
import { colors } from '../theme/colors';

interface ExtrudedSlotCardProps {
  slot: SlotItem;
  index: number;
  isCurrentTimeSlot: boolean;
  isSelected?: boolean;
  onPress: (slot: SlotItem, nextStatus: SlotStatus) => void;
}

export const ExtrudedSlotCard: React.FC<ExtrudedSlotCardProps> = ({
  slot,
  index,
  isCurrentTimeSlot,
  isSelected = false,
  onPress,
}) => {
  // Track displayed status for split-flap transition
  const [displayedStatus, setDisplayedStatus] = useState<SlotStatus>(slot.status);
  const prevStatusRef = useRef<SlotStatus>(slot.status);

  // Animations
  const rotateX = useSharedValue(0); // 0 to 90deg and back
  const liftY = useSharedValue(0);

  // Split-flap flip on status change
  useEffect(() => {
    if (prevStatusRef.current !== slot.status) {
      prevStatusRef.current = slot.status;
      // Animate flip: 0 -> 90deg down, swap status, 90deg -> 0deg up
      rotateX.value = withSequence(
        withTiming(90, { duration: 160, easing: Easing.in(Easing.quad) }, () => {
          runOnJS(setDisplayedStatus)(slot.status);
        }),
        withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) })
      );
    }
  }, [slot.status]);

  // Handle lift for current-time slot and drag selection
  useEffect(() => {
    if (isSelected) {
      liftY.value = withSpring(-8, { damping: 14, stiffness: 220 });
    } else if (isCurrentTimeSlot) {
      liftY.value = withSpring(-4, { damping: 16, stiffness: 180 });
    } else {
      liftY.value = withSpring(0, { damping: 16, stiffness: 180 });
    }
  }, [isSelected, isCurrentTimeSlot]);

  const animatedFaceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: liftY.value },
      { perspective: 400 },
      { rotateX: `${rotateX.value}deg` },
    ],
  }));

  const getStatusVisuals = (st: SlotStatus) => {
    switch (st) {
      case 'available':
        return {
          label: 'AVAILABLE',
          gradient: ['#10B981', '#059669'] as const,
          bgColor: 'rgba(16, 185, 129, 0.16)',
          borderColor: colors.availableBorder,
          extrusionColor: '#064E3B',
          textColor: '#34D399',
        };
      case 'booked':
        return {
          label: 'BOOKED',
          gradient: ['#F59E0B', '#D97706'] as const,
          bgColor: 'rgba(245, 158, 11, 0.16)',
          borderColor: colors.busyBorder,
          extrusionColor: '#78350F',
          textColor: '#FBBF24',
        };
      case 'closed':
      default:
        return {
          label: 'CLOSED',
          gradient: ['#64748B', '#475569'] as const,
          bgColor: 'rgba(71, 85, 105, 0.18)',
          borderColor: colors.closedBorder,
          extrusionColor: '#1E293B',
          textColor: '#94A3B8',
        };
    }
  };

  const visuals = getStatusVisuals(displayedStatus);

  const handlePress = () => {
    // Cycle: available -> booked -> closed -> available
    let next: SlotStatus = 'available';
    if (slot.status === 'available') next = 'booked';
    else if (slot.status === 'booked') next = 'closed';
    else if (slot.status === 'closed') next = 'available';

    onPress(slot, next);
  };

  return (
    <Pressable onPress={handlePress} style={styles.cardContainer}>
      {/* 3D Extruded bottom layer (fake 3D thickness) */}
      <View
        style={[
          styles.extrusionLayer,
          {
            backgroundColor: visuals.extrusionColor,
            borderColor: 'rgba(0, 0, 0, 0.4)',
          },
        ]}
      />

      {/* Interactive Top Face Layer */}
      <Animated.View
        style={[
          styles.faceLayer,
          {
            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.28)' : visuals.bgColor,
            borderColor: isSelected
              ? colors.primaryGlow
              : isCurrentTimeSlot
              ? '#FBBF24'
              : visuals.borderColor,
          },
          animatedFaceStyle,
        ]}
      >
        {/* Top edge split-flap highlight */}
        <View style={styles.topFlapHighlight} />

        {/* Current Time Indicator badge */}
        {isCurrentTimeSlot && (
          <View style={styles.currentBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.currentBadgeText}>NOW</Text>
          </View>
        )}

        {/* Time Interval */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{slot.start}</Text>
          <Text style={styles.timeDash}>–</Text>
          <Text style={styles.timeText}>{slot.end}</Text>
        </View>

        {/* Status Pill */}
        <View style={[styles.statusPill, { borderColor: visuals.borderColor }]}>
          <LinearGradient
            colors={visuals.gradient}
            style={styles.statusDot}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={[styles.statusText, { color: visuals.textColor }]}>
            {visuals.label}
          </Text>
        </View>

        {/* Subtle horizontal flap fold crease */}
        <View style={styles.flapCrease} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: 76,
    marginVertical: 6,
    marginHorizontal: 4,
    position: 'relative',
  },
  extrusionLayer: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  faceLayer: {
    height: 68,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  topFlapHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  flapCrease: {
    position: 'absolute',
    top: 33,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  currentBadge: {
    position: 'absolute',
    top: 6,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FBBF24',
    marginRight: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  timeDash: {
    fontSize: 14,
    color: colors.textMuted,
    marginHorizontal: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

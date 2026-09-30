import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ExtrudedSlotCard } from './ExtrudedSlotCard';
import { SlotItem, SlotStatus } from '../api/shopApi';
import { colors } from '../theme/colors';

interface ExtrudedTimelineProps {
  slots: SlotItem[];
  onSlotUpdate: (slot: SlotItem, nextStatus: SlotStatus) => void;
  onBulkUpdate: (indices: number[], status: SlotStatus) => void;
}

export const ExtrudedTimeline: React.FC<ExtrudedTimelineProps> = ({
  slots,
  onSlotUpdate,
  onBulkUpdate,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Selection beam position animations
  const beamY = useSharedValue(-100);
  const beamOpacity = useSharedValue(0);

  const containerRef = useRef<View>(null);
  const slotHeight = 88; // 76 height + 12 vertical margin

  // Determine current-time slot based on now
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isCurrentSlot = (slot: SlotItem): boolean => {
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    return currentMinutes >= sMin && currentMinutes < eMin;
  };

  // Pan Responder for drag-selection beam
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only activate if vertical drag is significant and user drags
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        beamOpacity.value = withTiming(0.8, { duration: 150 });
        updateSelectionAtTouch(evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        updateSelectionAtTouch(evt.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        beamOpacity.value = withTiming(0, { duration: 300 });
        setIsDragging(false);
      },
    })
  ).current;

  const updateSelectionAtTouch = (touchY: number) => {
    beamY.value = withSpring(touchY, { damping: 20, stiffness: 200 });

    const index = Math.floor(touchY / slotHeight);
    if (index >= 0 && index < slots.length) {
      setSelectedIndices((prev) => {
        if (!prev.includes(index)) {
          return [...prev, index].sort((a, b) => a - b);
        }
        return prev;
      });
    }
  };

  const animatedBeamStyle = useAnimatedStyle(() => ({
    top: beamY.value - 12,
    opacity: beamOpacity.value,
  }));

  const handleBulkAction = (status: SlotStatus) => {
    if (selectedIndices.length === 0) return;
    onBulkUpdate(selectedIndices, status);
    setSelectedIndices([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>TODAY'S TIMELINE</Text>
          <Text style={styles.headerSubtitle}>
            Tap slot to cycle • Drag down to beam-select
          </Text>
        </View>

        {selectedIndices.length > 0 && (
          <View style={styles.bulkActionBar}>
            <Text style={styles.selectionCount}>
              {selectedIndices.length} Selected:
            </Text>
            <View style={styles.bulkButtons}>
              <Text
                style={[styles.bulkBtn, { color: colors.availableGlow }]}
                onPress={() => handleBulkAction('available')}
              >
                Open
              </Text>
              <Text
                style={[styles.bulkBtn, { color: colors.busyGlow }]}
                onPress={() => handleBulkAction('booked')}
              >
                Book
              </Text>
              <Text
                style={[styles.bulkBtn, { color: colors.danger }]}
                onPress={() => handleBulkAction('closed')}
              >
                Close
              </Text>
              <Text
                style={[styles.bulkBtnCancel]}
                onPress={() => setSelectedIndices([])}
              >
                ✕
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Slots List with Gesture Area */}
      <View ref={containerRef} style={styles.timelineArea} {...panResponder.panHandlers}>
        {/* Glowing Selection Beam that follows drag touchpoint */}
        <Animated.View style={[styles.selectionBeam, animatedBeamStyle]} pointerEvents="none" />

        {slots.map((slot, index) => (
          <ExtrudedSlotCard
            key={slot.id || `slot-${index}`}
            slot={slot}
            index={index}
            isCurrentTimeSlot={isCurrentSlot(slot)}
            isSelected={selectedIndices.includes(index)}
            onPress={(s, nextSt) => onSlotUpdate(s, nextSt)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  bulkActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  selectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 8,
  },
  bulkButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkBtn: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bulkBtnCancel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: 4,
  },
  timelineArea: {
    position: 'relative',
  },
  selectionBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.35)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.8)',
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    zIndex: 10,
  },
});

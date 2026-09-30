import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SlotItem, SlotStatus } from '../api/shopApi';
import { colors } from '../theme/colors';

interface PeriodSegmentedTimelineProps {
  slots: SlotItem[];
  onSlotUpdate: (slot: SlotItem, nextStatus: SlotStatus) => void;
  onSelectSlotForInspect?: (slot: SlotItem) => void;
}

export const PeriodSegmentedTimeline: React.FC<PeriodSegmentedTimelineProps> = ({
  slots,
  onSlotUpdate,
  onSelectSlotForInspect,
}) => {
  // Current time marker
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const isCurrentSlot = (slot: SlotItem): boolean => {
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;
    return currentMinutes >= sMin && currentMinutes < eMin;
  };

  // Group slots by Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (>= 17:00)
  const morningSlots: SlotItem[] = [];
  const afternoonSlots: SlotItem[] = [];
  const eveningSlots: SlotItem[] = [];

  slots.forEach((s) => {
    const hour = parseInt(s.start.split(':')[0], 10);
    if (hour < 12) {
      morningSlots.push(s);
    } else if (hour < 17) {
      afternoonSlots.push(s);
    } else {
      eveningSlots.push(s);
    }
  });

  const getSlotDurationMin = (slot: SlotItem): number => {
    const [sH, sM] = slot.start.split(':').map(Number);
    const [eH, eM] = slot.end.split(':').map(Number);
    return (eH * 60 + eM) - (sH * 60 + sM);
  };

  const handleSlotPress = (slot: SlotItem) => {
    // Cycle: available -> booked -> closed -> available
    let next: SlotStatus = 'available';
    if (slot.status === 'available') next = 'booked';
    else if (slot.status === 'booked') next = 'closed';
    else if (slot.status === 'closed') next = 'available';

    onSlotUpdate(slot, next);
  };

  const renderSlotCard = (slot: SlotItem, idx: number) => {
    const isNow = isCurrentSlot(slot);
    const duration = getSlotDurationMin(slot);

    // Color bar configs (from Image 6 left vertical color bar)
    const isAvail = slot.status === 'available';
    const isBooked = slot.status === 'booked';

    const barColor = isAvail
      ? colors.availableGlow
      : isBooked
      ? colors.busyGlow
      : colors.closedGlow;

    const bgCard = isAvail
      ? 'rgba(16, 185, 129, 0.08)'
      : isBooked
      ? 'rgba(245, 158, 11, 0.08)'
      : 'rgba(71, 85, 105, 0.12)';

    const borderColor = isNow
      ? '#FBBF24'
      : isAvail
      ? 'rgba(16, 185, 129, 0.25)'
      : isBooked
      ? 'rgba(245, 158, 11, 0.25)'
      : 'rgba(255, 255, 255, 0.06)';

    return (
      <View key={slot.id || `slot-${idx}`} style={styles.slotRowWrapper}>
        {/* Left Time Axis (from Image 6) */}
        <View style={styles.timeAxisCol}>
          <Text style={styles.timeAxisStart}>{slot.start}</Text>
          <View style={styles.axisDotLine} />
        </View>

        {/* Slot Card */}
        <Pressable
          style={[
            styles.slotCard,
            { backgroundColor: bgCard, borderColor },
            isNow && styles.currentSlotCard,
          ]}
          onPress={() => handleSlotPress(slot)}
          onLongPress={() => onSelectSlotForInspect && onSelectSlotForInspect(slot)}
        >
          {/* Vertical Color Strip (Image 6 feature) */}
          <View style={[styles.verticalAccentBar, { backgroundColor: barColor }]} />

          <View style={styles.slotMainContent}>
            {/* Top row: Time range & duration badge */}
            <View style={styles.slotTopRow}>
              <View style={styles.timeBadgeContainer}>
                <Text style={styles.slotTimeText}>
                  {slot.start} – {slot.end}
                </Text>
                {isNow && (
                  <View style={styles.nowBadge}>
                    <Text style={styles.nowText}>NOW</Text>
                  </View>
                )}
              </View>

              <View style={styles.durationPill}>
                <Text style={styles.durationText}>{duration}m</Text>
              </View>
            </View>

            {/* Bottom row: Status badge & hint */}
            <View style={styles.slotBottomRow}>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor: isAvail
                      ? 'rgba(16, 185, 129, 0.16)'
                      : isBooked
                      ? 'rgba(245, 158, 11, 0.16)'
                      : 'rgba(100, 116, 139, 0.16)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusTagDot,
                    {
                      backgroundColor: isAvail
                        ? colors.availableGlow
                        : isBooked
                        ? colors.busyGlow
                        : colors.closedGlow,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusTagText,
                    {
                      color: isAvail
                        ? colors.availableGlow
                        : isBooked
                        ? colors.busyGlow
                        : colors.textMuted,
                    },
                  ]}
                >
                  {slot.status.toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onSelectSlotForInspect && onSelectSlotForInspect(slot)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.optionsIcon}>•••</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderSection = (
    title: string,
    icon: string,
    periodSlots: SlotItem[],
    accentColor: string
  ) => {
    if (periodSlots.length === 0) return null;
    const availCount = periodSlots.filter((s) => s.status === 'available').length;

    return (
      <View style={styles.sectionContainer}>
        {/* Section Header (Image 5 feature) */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>{title}</Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>
              {availCount} open / {periodSlots.length}
            </Text>
          </View>
        </View>

        {/* Slot Cards List */}
        <View style={styles.sectionBody}>
          {periodSlots.map((slot, idx) => renderSlotCard(slot, idx))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainHeader}>
        <View>
          <Text style={styles.mainTitle}>LIVE AVAILABILITY TIMELINE</Text>
          <Text style={styles.mainSubtitle}>
            Tap any slot to toggle • Long press for details
          </Text>
        </View>
      </View>

      {/* Render 3 Smart Periods (Image 5 & 6) */}
      {renderSection('Morning Slots', '🌅', morningSlots, colors.morningAccent)}
      {renderSection('Afternoon Slots', '☀️', afternoonSlots, colors.afternoonAccent)}
      {renderSection('Evening Slots', '🌙', eveningSlots, colors.eveningAccent)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  mainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  mainSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(18, 24, 38, 0.5)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionBody: {
    gap: 8,
  },
  slotRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAxisCol: {
    width: 44,
    alignItems: 'flex-start',
    marginRight: 6,
  },
  timeAxisStart: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  axisDotLine: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 4,
    marginLeft: 6,
  },
  slotCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 62,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  currentSlotCard: {
    borderWidth: 1.5,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  verticalAccentBar: {
    width: 6,
    height: '100%',
  },
  slotMainContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  slotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  nowBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  nowText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  slotBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 5,
  },
  statusTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  optionsIcon: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '900',
  },
});

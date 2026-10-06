import React from 'react';
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

    const isAvail = slot.status === 'available';
    const isBooked = slot.status === 'booked';

    const barColor = isAvail
      ? colors.availableGlow
      : isBooked
      ? colors.busyGlow
      : colors.closedGlow;

    const bgCard = isAvail
      ? 'rgba(16, 185, 129, 0.1)'
      : isBooked
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(71, 85, 105, 0.14)';

    const borderColor = isNow
      ? '#FBBF24'
      : isAvail
      ? 'rgba(16, 185, 129, 0.3)'
      : isBooked
      ? 'rgba(245, 158, 11, 0.3)'
      : 'rgba(255, 255, 255, 0.08)';

    return (
      <View key={slot.id || `slot-${idx}`} style={styles.slotRowWrapper}>
        {/* Left Time Axis */}
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
          {/* Vertical Color Strip */}
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

            {/* Middle row: Customer name if assigned */}
            {slot.customerName && (
              <View style={styles.clientRow}>
                <Text style={styles.clientText} numberOfLines={1}>
                  👤 {slot.customerName}
                </Text>
              </View>
            )}

            {/* Bottom row: Status badge & options */}
            <View style={styles.slotBottomRow}>
              <View
                style={[
                  styles.statusTag,
                  {
                    backgroundColor: isAvail
                      ? 'rgba(16, 185, 129, 0.18)'
                      : isBooked
                      ? 'rgba(245, 158, 11, 0.18)'
                      : 'rgba(100, 116, 139, 0.18)',
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
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {slot.status.toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onSelectSlotForInspect && onSelectSlotForInspect(slot)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.optionsBtn}
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
        {/* Section Header */}
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
          <Text style={styles.mainTitle}>LIVE AVAILABILITY SCHEDULE</Text>
          <Text style={styles.mainSubtitle}>
            Tap any slot to toggle • Tap ••• or long press for client details
          </Text>
        </View>
      </View>

      {/* Render 3 Smart Periods */}
      {renderSection('Morning Slots', '🌅', morningSlots, colors.morningAccent)}
      {renderSection('Afternoon Slots', '☀️', afternoonSlots, colors.afternoonAccent)}
      {renderSection('Evening Slots', '🌙', eveningSlots, colors.eveningAccent)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  mainSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(18, 24, 38, 0.65)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionBody: {
    gap: 10,
  },
  slotRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAxisCol: {
    width: 52,
    alignItems: 'flex-start',
    marginRight: 6,
  },
  timeAxisStart: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  axisDotLine: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 5,
    marginLeft: 6,
  },
  slotCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 74,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  currentSlotCard: {
    borderWidth: 1.8,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  verticalAccentBar: {
    width: 6,
    height: '100%',
  },
  slotMainContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    gap: 8,
  },
  slotTimeText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  nowBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nowText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  clientRow: {
    marginTop: 4,
    marginBottom: 2,
  },
  clientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  slotBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionsBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionsIcon: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '900',
  },
});

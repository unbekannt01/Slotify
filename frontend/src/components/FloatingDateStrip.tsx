import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

interface FloatingDateStripProps {
  availableCount: number;
  onSelectDate?: (dateStr: string) => void;
}

export const FloatingDateStrip: React.FC<FloatingDateStripProps> = ({
  availableCount,
  onSelectDate,
}) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 is Sunday

  // Generate 7 days around today
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + (i - currentDayIndex));
    return {
      dayName: daysOfWeek[d.getDay()],
      dayNum: d.getDate(),
      fullDate: d.toISOString().split('T')[0],
      isToday: d.toDateString() === today.toDateString(),
      slotCount: d.toDateString() === today.toDateString() ? availableCount : (i % 2 === 0 ? 4 : 2),
    };
  });

  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  const handleSelect = (fullDate: string) => {
    setSelectedDate(fullDate);
    if (onSelectDate) onSelectDate(fullDate);
  };

  const currentMonthYear = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.monthBadge}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={styles.monthText}>{currentMonthYear}</Text>
        </View>
        <Text style={styles.todayHint}>Tap date to preview schedule</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripContent}
      >
        {weekDays.map((item, idx) => {
          const isSelected = item.fullDate === selectedDate;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.datePill,
                isSelected ? styles.selectedPill : styles.unselectedPill,
                item.isToday && !isSelected && styles.todayIndicatorBorder,
              ]}
              onPress={() => handleSelect(item.fullDate)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected ? styles.selectedText : styles.unselectedText,
                ]}
              >
                {item.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  isSelected ? styles.selectedNum : styles.unselectedNum,
                ]}
              >
                {item.dayNum}
              </Text>

              {/* Slot count tag */}
              <View
                style={[
                  styles.slotBadge,
                  isSelected ? styles.selectedSlotBadge : styles.unselectedSlotBadge,
                ]}
              >
                <Text
                  style={[
                    styles.slotBadgeText,
                    isSelected ? styles.selectedSlotText : styles.unselectedSlotText,
                  ]}
                >
                  {item.slotCount} open
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    backgroundColor: 'rgba(18, 24, 38, 0.75)',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIcon: {
    fontSize: 16,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  todayHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stripContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  datePill: {
    width: 74,
    height: 94,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderWidth: 1.2,
  },
  unselectedPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  todayIndicatorBorder: {
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unselectedText: {
    color: colors.textMuted,
  },
  selectedText: {
    color: '#E0E7FF',
  },
  dayNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  unselectedNum: {
    color: colors.textPrimary,
  },
  selectedNum: {
    color: '#FFFFFF',
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unselectedSlotBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  selectedSlotBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  unselectedSlotText: {
    color: colors.textSecondary,
  },
  selectedSlotText: {
    color: '#FFFFFF',
  },
});

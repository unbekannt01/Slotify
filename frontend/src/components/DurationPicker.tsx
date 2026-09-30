import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface DurationPickerProps {
  currentDuration: number;
  onSelect: (duration: number) => void;
  disabled?: boolean;
}

const DURATIONS = [15, 30, 45, 60];

export const DurationPicker: React.FC<DurationPickerProps> = ({
  currentDuration,
  onSelect,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.title}>SLOT DURATION</Text>
        <Text style={styles.hint}>Regenerates grid & preserves bookings</Text>
      </View>

      <View style={styles.optionsRow}>
        {DURATIONS.map((dur) => {
          const isSelected = currentDuration === dur;
          return (
            <TouchableOpacity
              key={dur}
              style={[
                styles.optionBtn,
                isSelected && styles.optionBtnSelected,
                disabled && styles.disabled,
              ]}
              onPress={() => !disabled && onSelect(dur)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {dur}m
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 24, 38, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.6,
  },
  hint: {
    fontSize: 10,
    color: colors.textMuted,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionBtnSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderColor: colors.primaryGlow,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.5,
  },
});

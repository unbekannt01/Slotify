import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedButton } from './AnimatedButton';
import { colors } from '../theme/colors';

interface QuickActionsBarProps {
  onCloseForBreak: () => void;
  onCloseRestOfToday: () => void;
  onOpenAll: () => void;
  disabled?: boolean;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onCloseForBreak,
  onCloseRestOfToday,
  onOpenAll,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QUICK AVAILABILITY CONTROLS</Text>

      <View style={styles.buttonRow}>
        {/* Quick Break */}
        <AnimatedButton
          onPress={onCloseForBreak}
          disabled={disabled}
          style={[styles.actionBtn, styles.breakBtn]}
        >
          <Text style={styles.btnIcon}>☕</Text>
          <Text style={styles.btnLabel}>Take Break</Text>
          <Text style={styles.btnDesc}>Close 60m</Text>
        </AnimatedButton>

        {/* Close Rest of Day */}
        <AnimatedButton
          onPress={onCloseRestOfToday}
          disabled={disabled}
          style={[styles.actionBtn, styles.closeDayBtn]}
        >
          <Text style={styles.btnIcon}>🌙</Text>
          <Text style={styles.btnLabel}>Close Today</Text>
          <Text style={styles.btnDesc}>Rest of day</Text>
        </AnimatedButton>

        {/* Open All Slots */}
        <AnimatedButton
          onPress={onOpenAll}
          disabled={disabled}
          style={[styles.actionBtn, styles.openAllBtn]}
        >
          <Text style={styles.btnIcon}>⚡</Text>
          <Text style={styles.btnLabel}>Open All</Text>
          <Text style={styles.btnDesc}>Restore slots</Text>
        </AnimatedButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 24, 38, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    minHeight: 74,
  },
  breakBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  closeDayBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  openAllBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  btnIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  btnDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
});

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
          <Text style={styles.btnLabel}>Take a Break</Text>
          <Text style={styles.btnDesc}>Close next 60m</Text>
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
    marginVertical: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 24, 38, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  breakBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  closeDayBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  openAllBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  btnIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  btnDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

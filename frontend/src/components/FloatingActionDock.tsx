import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface FloatingActionDockProps {
  onQuickBreak: () => void;
  onOpenAll: () => void;
  onEditHours: () => void;
  onLogout: () => void;
  onOpenVoice?: () => void;
  onShowQuickMenu?: () => void;
}

export const FloatingActionDock: React.FC<FloatingActionDockProps> = ({
  onQuickBreak,
  onOpenAll,
  onEditHours,
  onLogout,
  onOpenVoice,
  onShowQuickMenu,
}) => {
  return (
    <View style={styles.dockWrapper}>
      <View style={styles.dockContainer}>
        {/* Quick Break Button */}
        <TouchableOpacity style={styles.dockItem} onPress={onQuickBreak} activeOpacity={0.7}>
          <Text style={styles.dockIcon}>☕</Text>
          <Text style={styles.dockLabel}>Break</Text>
        </TouchableOpacity>

        {/* Voice Assistant Button */}
        <TouchableOpacity style={styles.dockItem} onPress={onOpenVoice || onShowQuickMenu} activeOpacity={0.7}>
          <Text style={styles.dockIcon}>🎙️</Text>
          <Text style={[styles.dockLabel, { color: '#818CF8' }]}>Voice</Text>
        </TouchableOpacity>

        {/* Center Prominent Glowing Action Button (Image 1, 2) */}
        <TouchableOpacity
          style={styles.centerFab}
          onPress={onOpenAll}
          activeOpacity={0.85}
        >
          <View style={styles.centerFabGlow} />
          <Text style={styles.centerFabIcon}>⚡</Text>
          <Text style={styles.centerFabText}>OPEN ALL</Text>
        </TouchableOpacity>

        {/* Edit Operating Hours */}
        <TouchableOpacity style={styles.dockItem} onPress={onEditHours} activeOpacity={0.7}>
          <Text style={styles.dockIcon}>🕒</Text>
          <Text style={styles.dockLabel}>Hours</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.dockItem} onPress={onLogout} activeOpacity={0.7}>
          <Text style={styles.dockIcon}>🚪</Text>
          <Text style={[styles.dockLabel, { color: '#F87171' }]}>Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 66,
    backgroundColor: 'rgba(18, 24, 38, 0.92)',
    borderRadius: 33,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dockIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  centerFab: {
    width: 68,
    height: 52,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  centerFabGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  centerFabIcon: {
    fontSize: 14,
    color: '#064E3B',
    fontWeight: '900',
  },
  centerFabText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});

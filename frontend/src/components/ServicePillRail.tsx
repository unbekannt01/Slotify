import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface ServiceItem {
  id: string;
  name: string;
  icon: string;
  duration: string;
}

const SERVICES: ServiceItem[] = [
  { id: 'all', name: 'All Services', icon: '⚡', duration: 'Full Day' },
  { id: 'haircut', name: 'Hair & Styling', icon: '✂️', duration: '30m' },
  { id: 'beard', name: 'Beard Trim', icon: '🧔', duration: '20m' },
  { id: 'facial', name: 'Skin & Facial', icon: '✨', duration: '45m' },
  { id: 'spa', name: 'Spa & Scalp', icon: '🧖', duration: '60m' },
  { id: 'vip', name: 'VIP Executive', icon: '👑', duration: '90m' },
];

interface ServicePillRailProps {
  onSelectService?: (id: string) => void;
}

export const ServicePillRail: React.FC<ServicePillRailProps> = ({ onSelectService }) => {
  const [selectedId, setSelectedId] = useState<string>('all');

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (onSelectService) onSelectService(id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SERVICES & CATEGORIES</Text>
        <Text style={styles.sub}>Quick category filtering</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRail}
      >
        {SERVICES.map((s) => {
          const isSelected = s.id === selectedId;
          return (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.serviceCard,
                isSelected ? styles.serviceCardSelected : styles.serviceCardUnselected,
              ]}
              onPress={() => handleSelect(s.id)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  isSelected ? styles.iconCircleSelected : styles.iconCircleUnselected,
                ]}
              >
                <Text style={styles.iconText}>{s.icon}</Text>
              </View>

              <Text
                style={[
                  styles.serviceName,
                  isSelected ? styles.serviceNameSelected : styles.serviceNameUnselected,
                ]}
                numberOfLines={1}
              >
                {s.name}
              </Text>

              <Text style={styles.durationTag}>{s.duration}</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  sub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  scrollRail: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  serviceCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.2,
    minWidth: 100,
  },
  serviceCardUnselected: {
    backgroundColor: 'rgba(18, 24, 38, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  serviceCardSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  iconText: {
    fontSize: 22,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  serviceNameUnselected: {
    color: colors.textPrimary,
  },
  serviceNameSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  durationTag: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: '600',
  },
});

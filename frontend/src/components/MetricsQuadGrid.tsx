import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MetricsQuadGridProps {
  availableCount: number;
  bookedCount: number;
  totalCount: number;
  slotDuration: number;
}

export const MetricsQuadGrid: React.FC<MetricsQuadGridProps> = ({
  availableCount,
  bookedCount,
  totalCount,
  slotDuration,
}) => {
  const occupancyRate = totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.gridRow}>
        {/* Card 1: Available */}
        <View style={[styles.card, styles.purpleCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.statVal}>{availableCount}</Text>
            {/* Sparkline icon simulation */}
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#A855F7', height: 10 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#C084FC', height: 20 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#A855F7', height: 14 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#E9D5FF', height: 24 }]} />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.statLabel}>Available Slots</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* Card 2: Booked */}
        <View style={[styles.card, styles.peachCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.statVal}>{bookedCount}</Text>
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#F97316', height: 16 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#FB923C', height: 12 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#FDBA74', height: 22 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#EA580C', height: 18 }]} />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.statLabel}>Booked Today</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </View>

      <View style={styles.gridRow}>
        {/* Card 3: Grid Cadence */}
        <View style={[styles.card, styles.cyanCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.statVal}>
              {slotDuration}
              <Text style={styles.unitText}>m</Text>
            </Text>
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#06B6D4', height: 14 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#22D3EE', height: 18 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#67E8F9', height: 24 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#0891B2', height: 16 }]} />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.statLabel}>Grid Cadence</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {/* Card 4: Occupancy Rate */}
        <View style={[styles.card, styles.greenCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.statVal}>
              {occupancyRate}
              <Text style={styles.unitText}>%</Text>
            </Text>
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#10B981', height: 12 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#34D399', height: 18 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#6EE7B7', height: 22 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#059669', height: 26 }]} />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.statLabel}>Occupancy Rate</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    justifyContent: 'space-between',
    minHeight: 104,
  },
  purpleCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  peachCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  cyanCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  greenCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 26,
  },
  sparkDot: {
    width: 5,
    borderRadius: 2.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '700',
    lineHeight: 20,
  },
});

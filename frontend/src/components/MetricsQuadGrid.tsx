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
              <View style={[styles.sparkDot, { backgroundColor: '#A855F7', height: 8 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#C084FC', height: 18 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#A855F7', height: 12 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#E9D5FF', height: 22 }]} />
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
              <View style={[styles.sparkDot, { backgroundColor: '#F97316', height: 14 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#FB923C', height: 10 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#FDBA74', height: 20 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#EA580C', height: 16 }]} />
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
            <Text style={styles.statVal}>{slotDuration}<Text style={styles.unitText}>m</Text></Text>
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#06B6D4', height: 12 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#22D3EE', height: 16 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#67E8F9', height: 22 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#0891B2', height: 14 }]} />
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
            <Text style={styles.statVal}>{occupancyRate}<Text style={styles.unitText}>%</Text></Text>
            <View style={styles.sparkline}>
              <View style={[styles.sparkDot, { backgroundColor: '#10B981', height: 10 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#34D399', height: 15 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#6EE7B7', height: 19 }]} />
              <View style={[styles.sparkDot, { backgroundColor: '#059669', height: 24 }]} />
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
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  purpleCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.09)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  peachCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.09)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
  },
  cyanCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.09)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  greenCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.09)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  unitText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3.5,
    height: 24,
  },
  sparkDot: {
    width: 4,
    borderRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '700',
    lineHeight: 18,
  },
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface LivingStatusOrbProps {
  status: 'available' | 'busy' | 'closed';
  availableCount: number;
  totalCount: number;
  nextSlot?: string | null;
}

export const LivingStatusOrb: React.FC<LivingStatusOrbProps> = ({
  status,
  availableCount,
  totalCount,
  nextSlot,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);

    if (status === 'available') {
      // Gentle breathing pulse (~2.4s)
      pulseScale.value = withRepeat(
        withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else if (status === 'busy') {
      // Slower amber pulse (~3.6s)
      pulseScale.value = withRepeat(
        withTiming(1.22, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Dim & static when closed
      pulseScale.value = withTiming(1, { duration: 400 });
      pulseOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [status]);

  const animatedGlowRing = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          title: 'AVAILABLE FOR BOOKINGS',
          tag: 'LIVE',
          orbGradient: ['#10B981', '#059669', '#064E3B'] as const,
          glowColor: colors.availableGlow,
          bgBadge: colors.availableBg,
          borderBadge: colors.availableBorder,
          badgeColor: colors.available,
          subtext: nextSlot
            ? `Next slot open at ${nextSlot}`
            : `${availableCount} of ${totalCount} slots available today`,
        };
      case 'busy':
        return {
          title: 'CURRENTLY BUSY',
          tag: 'OCCUPIED',
          orbGradient: ['#F59E0B', '#D97706', '#78350F'] as const,
          glowColor: colors.busyGlow,
          bgBadge: colors.busyBg,
          borderBadge: colors.busyBorder,
          badgeColor: colors.busy,
          subtext: nextSlot
            ? `Next available at ${nextSlot}`
            : 'All current time segments occupied',
        };
      case 'closed':
      default:
        return {
          title: 'CURRENTLY CLOSED',
          tag: 'OFFLINE',
          orbGradient: ['#64748B', '#475569', '#1E293B'] as const,
          glowColor: colors.closedGlow,
          bgBadge: colors.closedBg,
          borderBadge: colors.closedBorder,
          badgeColor: colors.closed,
          subtext: 'Outside operating hours or paused for break',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.container}>
      <View style={styles.orbWrapper}>
        {/* Outer breathing aura */}
        <Animated.View
          style={[
            styles.glowAura,
            { backgroundColor: config.glowColor },
            animatedGlowRing,
          ]}
        />

        {/* Inner Glassy Orb */}
        <View style={styles.coreOrb}>
          <LinearGradient
            colors={config.orbGradient}
            style={styles.gradientOrb}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
          >
            {/* Specular highlight on top edge */}
            <View style={styles.specularHighlight} />
          </LinearGradient>
        </View>
      </View>

      {/* Status Details */}
      <View style={styles.textContainer}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: config.bgBadge, borderColor: config.borderBadge },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: config.badgeColor }]} />
            <Text style={[styles.badgeText, { color: config.badgeColor }]}>
              {config.tag}
            </Text>
          </View>
          <Text style={styles.availableStats}>
            {availableCount}/{totalCount} Available
          </Text>
        </View>

        <Text style={styles.statusTitle}>{config.title}</Text>
        <Text style={styles.statusSubtext}>{config.subtext}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 24, 38, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  orbWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  glowAura: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  coreOrb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  gradientOrb: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  specularHighlight: {
    width: 32,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginTop: 3,
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  availableStats: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  statusSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

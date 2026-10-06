import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShopDetails, ShopStatusResponse, SlotItem } from '../api/shopApi';
import { subscribeToShop } from '../api/socket';
import { colors } from '../theme/colors';

interface LivePreviewCardProps {
  shop: ShopDetails;
  initialStatusData?: ShopStatusResponse | null;
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  shop,
  initialStatusData,
}) => {
  const [liveData, setLiveData] = useState<ShopStatusResponse | null>(
    initialStatusData || null
  );
  const [lastPing, setLastPing] = useState<string>('Connected');
  const [pulseKey, setPulseKey] = useState<number>(0);

  // Sync when initialStatusData updates
  useEffect(() => {
    if (initialStatusData) {
      setLiveData(initialStatusData);
    }
  }, [initialStatusData]);

  // Subscribe to real-time socket channel for this shop
  useEffect(() => {
    if (!shop.id) return;

    const unsubscribe = subscribeToShop(shop.id, {
      onShopUpdated: (data) => {
        setLiveData(data);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastPing(`Updated ${time}`);
        setPulseKey((k) => k + 1);
      },
      onSlotChanged: (data) => {
        if (data.slots && liveData) {
          setLiveData((prev) =>
            prev ? { ...prev, slots: data.slots, status: data.status || prev.status } : null
          );
        }
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastPing(`Sync ${time}`);
        setPulseKey((k) => k + 1);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [shop.id]);

  const currentStatus = liveData?.status || 'available';
  const openSlots = liveData?.slots.filter((s) => s.status === 'available') || [];
  const nextSlot = liveData?.nextAvailableSlot || (openSlots.length > 0 ? openSlots[0] : null);

  const getStatusBadge = () => {
    if (currentStatus === 'available') {
      return {
        bg: colors.availableBg,
        border: colors.availableBorder,
        text: colors.availableGlow,
        label: 'OPEN NOW',
      };
    }
    if (currentStatus === 'busy') {
      return {
        bg: colors.busyBg,
        border: colors.busyBorder,
        text: colors.busyGlow,
        label: 'SLOTS BOOKED',
      };
    }
    return {
      bg: colors.closedBg,
      border: colors.closedBorder,
      text: colors.textMuted,
      label: 'CLOSED',
    };
  };

  const badge = getStatusBadge();

  return (
    <View style={styles.cardContainer}>
      {/* Top Banner with Real-time Socket Indicator */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.liveIndicator}>
            <View key={pulseKey} style={styles.liveDot} />
            <Text style={styles.liveText}>CUSTOMER SITE PREVIEW</Text>
          </View>
          <Text style={styles.socketStatus}>{lastPing}</Text>
        </View>
        <Text style={styles.previewCaption}>
          Live read-only stream via Socket.io channel: shop:{shop.id.slice(0, 8)}...
        </Text>
      </View>

      {/* Simulated Customer Page Preview */}
      <View style={styles.customerBox}>
        <View style={styles.shopMetaRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopCategory}>
              {shop.category} • {shop.area || 'City Center'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Schedule highlight for customer */}
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleLabel}>Next Walk-in / Slot:</Text>
          <Text style={styles.scheduleTime}>
            {nextSlot ? `${nextSlot.start} – ${nextSlot.end}` : 'No slots open today'}
          </Text>
        </View>

        {/* Available chips preview */}
        {openSlots.length > 0 && (
          <View style={styles.chipsContainer}>
            <Text style={styles.chipsLabel}>Upcoming Openings:</Text>
            <View style={styles.chipsRow}>
              {openSlots.slice(0, 4).map((slot) => (
                <View key={slot.id} style={styles.slotChip}>
                  <Text style={styles.slotChipText}>{slot.start}</Text>
                </View>
              ))}
              {openSlots.length > 4 && (
                <View style={styles.slotChipMore}>
                  <Text style={styles.slotChipMoreText}>+{openSlots.length - 4} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Phone Call Preview Action */}
        {shop.phone && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${shop.phone}`)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.callGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.callButtonText}>📞 Call {shop.phone} (Client view)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 24, 38, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: 'rgba(14, 19, 31, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  socketStatus: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  previewCaption: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  customerBox: {
    padding: 18,
  },
  shopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  shopName: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  shopCategory: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  scheduleLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.availableGlow,
  },
  slotChipMore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  slotChipMoreText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  callButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  callGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});

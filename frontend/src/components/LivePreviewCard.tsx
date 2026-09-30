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
          <View>
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

        {/* Customer Call to Book CTA */}
        {shop.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${shop.phone}`)}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.callGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.callButtonText}>📞 Call to Book ({shop.phone})</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38BDF8',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  socketStatus: {
    fontSize: 10,
    color: colors.textMuted,
  },
  previewCaption: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  customerBox: {
    padding: 16,
  },
  shopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  shopCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  scheduleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  chipsContainer: {
    marginBottom: 14,
  },
  chipsLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  slotChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.availableGlow,
  },
  slotChipMore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  slotChipMoreText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  callButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  callGradient: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundMesh } from '../../components/BackgroundMesh';
import { LivingStatusOrb } from '../../components/LivingStatusOrb';
import { ExtrudedTimeline } from '../../components/ExtrudedTimeline';
import { DurationPicker } from '../../components/DurationPicker';
import { QuickActionsBar } from '../../components/QuickActionsBar';
import { LivePreviewCard } from '../../components/LivePreviewCard';
import { WorkingHoursModal } from '../../components/WorkingHoursModal';
import { MetricsQuadGrid } from '../../components/MetricsQuadGrid';
import { FloatingDateStrip } from '../../components/FloatingDateStrip';
import { ServicePillRail } from '../../components/ServicePillRail';
import { PeriodSegmentedTimeline } from '../../components/PeriodSegmentedTimeline';
import { SlotInspectorModal } from '../../components/SlotInspectorModal';
import { FloatingActionDock } from '../../components/FloatingActionDock';
import { VoiceBookingAssistantModal } from '../../components/VoiceBookingAssistantModal';
import { CounterKioskMode } from '../../components/CounterKioskMode';
import { useAuth } from '../../context/AuthContext';
import {
  getShopStatusApi,
  updateShopSettingsApi,
  updateShopSlotsApi,
  ShopStatusResponse,
  SlotItem,
  SlotStatus,
} from '../../api/shopApi';
import { subscribeToShop } from '../../api/socket';
import { colors } from '../../theme/colors';

export const OwnerDashboardScreen: React.FC = () => {
  const { user, shopId, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [shopData, setShopData] = useState<ShopStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hoursModalVisible, setHoursModalVisible] = useState<boolean>(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState<boolean>(false);
  const [kioskModalVisible, setKioskModalVisible] = useState<boolean>(false);
  const [inspectSlot, setInspectSlot] = useState<SlotItem | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'smart' | 'extruded'>('smart');

  const fetchShop = useCallback(async () => {
    if (!shopId) return;
    try {
      const data = await getShopStatusApi(shopId);
      setShopData(data);
    } catch (err: any) {
      console.error('Error fetching shop status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  // Subscribe to real-time events for this shop
  useEffect(() => {
    if (!shopId) return;

    const unsubscribe = subscribeToShop(shopId, {
      onShopUpdated: (updatedData) => {
        setShopData(updatedData);
      },
      onSlotChanged: (data) => {
        if (data.slots) {
          setShopData((prev) =>
            prev ? { ...prev, slots: data.slots, status: data.status || prev.status } : null
          );
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [shopId]);

  const showTemporaryNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleVoiceBookingSuccess = (bookedSlot: SlotItem, updatedSlots?: SlotItem[]) => {
    if (updatedSlots && shopData) {
      const available = updatedSlots.filter((s) => s.status === 'available').length;
      const booked = updatedSlots.filter((s) => s.status === 'booked').length;
      const closed = updatedSlots.filter((s) => s.status === 'closed').length;
      setShopData({
        ...shopData,
        slots: updatedSlots,
        counts: {
          ...shopData.counts,
          available,
          booked,
          closed,
        },
      });
    } else {
      fetchShop();
    }
    showTemporaryNotice(`✓ Voice booking: ${bookedSlot.customerName || 'Client'} at ${bookedSlot.start}!`);
  };

  // 1. Slot duration change
  const handleDurationChange = async (newDuration: number) => {
    if (!shopId || !shopData) return;
    try {
      const res = await updateShopSettingsApi(shopId, {
        slotDurationMinutes: newDuration,
      });
      setShopData(res);
      showTemporaryNotice(`Grid regenerated to ${newDuration}m slots (bookings preserved).`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update slot duration');
    }
  };

  // 2. Working hours change
  const handleWorkingHoursSave = async (start: string, end: string) => {
    if (!shopId) return;
    try {
      const res = await updateShopSettingsApi(shopId, {
        workingHoursStart: start,
        workingHoursEnd: end,
      });
      setShopData(res);
      showTemporaryNotice(`Operating hours set: ${start} – ${end}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update working hours');
    }
  };

  // 3. Single slot toggle
  const handleSlotToggle = async (slot: SlotItem, nextStatus: SlotStatus) => {
    if (!shopId || !shopData) return;

    // Optimistic update
    const previousSlots = [...shopData.slots];
    const updatedSlots = shopData.slots.map((s) =>
      s.id === slot.id ? { ...s, status: nextStatus } : s
    );
    setShopData({ ...shopData, slots: updatedSlots });

    try {
      const res = await updateShopSlotsApi(shopId, {
        slotIds: [slot.id],
        status: nextStatus,
      });
      setShopData(res);
    } catch (err: any) {
      // Rollback on error
      setShopData({ ...shopData, slots: previousSlots });
      Alert.alert('Error', err.message || 'Failed to update slot status');
    }
  };

  // 4. Slot inspector update with custom note/name
  const handleSlotInspectSave = async (slot: SlotItem, status: SlotStatus, clientName?: string) => {
    if (!shopId || !shopData) return;
    try {
      const res = await updateShopSlotsApi(shopId, {
        slotIds: [slot.id],
        status,
        customerName: clientName,
      });
      setShopData(res);
      showTemporaryNotice(`Slot ${slot.start} updated to ${status.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update slot');
    }
  };

  // 5. Bulk range update (from drag selection beam)
  const handleBulkUpdate = async (indices: number[], status: SlotStatus) => {
    if (!shopId || !shopData) return;
    try {
      const res = await updateShopSlotsApi(shopId, {
        slotIndices: indices,
        status,
      });
      setShopData(res);
      showTemporaryNotice(`${indices.length} slots updated to ${status.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Bulk update failed');
    }
  };

  // 6. Quick actions
  const handleCloseForBreak = async () => {
    if (!shopId) return;
    try {
      const res = await updateShopSlotsApi(shopId, { action: 'close_break' });
      setShopData(res);
      showTemporaryNotice('Break activated: next 60m slots paused.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set break');
    }
  };

  const handleCloseRestOfToday = async () => {
    if (!shopId) return;
    try {
      const res = await updateShopSlotsApi(shopId, { action: 'close_rest_of_today' });
      setShopData(res);
      showTemporaryNotice('Shop closed for the rest of today.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to close shop');
    }
  };

  const handleOpenAll = async () => {
    if (!shopId) return;
    try {
      const res = await updateShopSlotsApi(shopId, { action: 'open_all' });
      setShopData(res);
      showTemporaryNotice('All remaining slots opened for bookings.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to open slots');
    }
  };

  if (loading || !shopData) {
    return (
      <View style={styles.centerContainer}>
        <BackgroundMesh />
        <ActivityIndicator size="large" color={colors.primaryGlow} />
        <Text style={styles.loadingText}>Syncing shop schedule...</Text>
      </View>
    );
  }

  const { shop, status, counts, slots, nextAvailableSlot } = shopData;

  return (
    <View style={styles.container}>
      <BackgroundMesh />

      {/* Top Organic Header with Curves (Image 2 style) */}
      <View style={[styles.heroHeader, { paddingTop: Math.max(insets.top + 10, 48) }]}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={styles.brandBadge}>
              <View style={styles.brandDot} />
              <Text style={styles.ownerRoleTag}>SLOTIFY STUDIO OWNER</Text>
            </View>
            <Text style={styles.shopHeading} numberOfLines={1}>
              {shop.name}
            </Text>
            <Text style={styles.shopSub} numberOfLines={1}>
              {shop.category} • {shop.area || 'Studio'}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.kioskBtn}
              onPress={() => setKioskModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.kioskLiveDot} />
              <Text style={styles.kioskBtnText}>Kiosk (Hands-Free)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voiceBtn}
              onPress={() => setVoiceModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.voiceBtnText}>🎙️ Voice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hoursBtn}
              onPress={() => setHoursModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.hoursBtnText}>
                🕒 {shop.workingHoursStart}–{shop.workingHoursEnd}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <Text style={styles.logoutText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View Mode Segmented Switcher (Image 2 pills) */}
        <View style={styles.viewSegmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'smart' && styles.segmentBtnActive]}
            onPress={() => setViewMode('smart')}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'smart' && styles.segmentBtnTextActive,
              ]}
            >
              ⚡ Smart Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, viewMode === 'extruded' && styles.segmentBtnActive]}
            onPress={() => setViewMode('extruded')}
          >
            <Text
              style={[
                styles.segmentBtnText,
                viewMode === 'extruded' && styles.segmentBtnTextActive,
              ]}
            >
              🧊 3D Beam Drag
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Notification Banner */}
      {actionNotice && (
        <View style={styles.actionNotice}>
          <Text style={styles.noticeText}>✨ {actionNotice}</Text>
        </View>
      )}

      {/* Main Scrollable View */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchShop();
            }}
            tintColor={colors.primaryGlow}
          />
        }
      >
        {/* Living Status Orb Pulsator */}
        <LivingStatusOrb
          status={status}
          availableCount={counts.available}
          totalCount={counts.total}
          nextSlot={nextAvailableSlot?.start}
        />

        {/* 4-Card Pastel Metrics Grid (Image 1 feature) */}
        <MetricsQuadGrid
          availableCount={counts.available}
          bookedCount={counts.booked}
          totalCount={counts.total}
          slotDuration={shop.slotDurationMinutes}
        />

        {/* Floating Calendar Date Strip (Image 3 & 5 feature) */}
        <FloatingDateStrip
          availableCount={counts.available}
          onSelectDate={(date) => showTemporaryNotice(`Viewing availability for ${date}`)}
        />

        {/* Service Category Rail (Image 4 feature) */}
        <ServicePillRail />

        {/* Quick Availability Controls Bar */}
        <QuickActionsBar
          onCloseForBreak={handleCloseForBreak}
          onCloseRestOfToday={handleCloseRestOfToday}
          onOpenAll={handleOpenAll}
        />

        {/* Slot Duration Grid Selector */}
        <DurationPicker
          currentDuration={shop.slotDurationMinutes}
          onSelect={handleDurationChange}
        />

        {/* Main Schedule Content: Smart Periods vs 3D Extruded */}
        {viewMode === 'smart' ? (
          <PeriodSegmentedTimeline
            slots={slots}
            onSlotUpdate={handleSlotToggle}
            onSelectSlotForInspect={(slot) => setInspectSlot(slot)}
          />
        ) : (
          <ExtrudedTimeline
            slots={slots}
            onSlotUpdate={handleSlotToggle}
            onBulkUpdate={handleBulkUpdate}
          />
        )}

        {/* Real-time Customer Live Preview Card */}
        <LivePreviewCard shop={shop} initialStatusData={shopData} />

        {/* Footer Account & Status info */}
        <View style={styles.footerLogoutCard}>
          <Text style={styles.footerUserText}>Logged in as {user?.email}</Text>
          <TouchableOpacity
            style={styles.footerLogoutBtn}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLogoutBtnText}>🚪 Log Out of Slotify</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Dock (Image 1, 2, 7 feature) */}
      <FloatingActionDock
        onQuickBreak={handleCloseForBreak}
        onOpenAll={handleOpenAll}
        onEditHours={() => setHoursModalVisible(true)}
        onLogout={logout}
        onOpenVoice={() => setVoiceModalVisible(true)}
        onOpenCounterKiosk={() => setKioskModalVisible(true)}
        onShowQuickMenu={() => showTemporaryNotice(`Shop status: ${status.toUpperCase()} (${counts.available} open)`)}
      />

      {/* Slot Inspector Modal (Image 5 & 7 feature) */}
      <SlotInspectorModal
        visible={!!inspectSlot}
        slot={inspectSlot}
        onClose={() => setInspectSlot(null)}
        onSaveStatus={handleSlotInspectSave}
      />

      {/* Working Hours Edit Modal */}
      <WorkingHoursModal
        visible={hoursModalVisible}
        currentStart={shop.workingHoursStart}
        currentEnd={shop.workingHoursEnd}
        onSave={handleWorkingHoursSave}
        onClose={() => setHoursModalVisible(false)}
      />

      {/* Intelligent Voice Assistant Modal */}
      {shopId && (
        <VoiceBookingAssistantModal
          visible={voiceModalVisible}
          shopId={shopId}
          onClose={() => setVoiceModalVisible(false)}
          onBookingSuccess={handleVoiceBookingSuccess}
        />
      )}

      {/* 100% Hands-Free Ambient Counter Kiosk Mode */}
      {shopId && (
        <CounterKioskMode
          visible={kioskModalVisible}
          shopId={shopId}
          shopName={shop.name}
          category={shop.category}
          workingHoursStart={shop.workingHoursStart}
          workingHoursEnd={shop.workingHoursEnd}
          slots={shopData.slots}
          counts={shopData.counts}
          onClose={() => setKioskModalVisible(false)}
          onSlotUpdated={(bookedSlot, updatedSlots) => {
            handleVoiceBookingSuccess(bookedSlot, updatedSlots);
            showTemporaryNotice(`Kiosk Updated: Slot ${bookedSlot.start || ''} confirmed!`);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCanvas,
  },
  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroHeader: {
    backgroundColor: '#12162A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F59B',
  },
  ownerRoleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F59B',
    letterSpacing: 1,
  },
  shopHeading: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  shopSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kioskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#10B981',
    gap: 5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  kioskLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  kioskBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.2,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  voiceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  hoursBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hoursBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  logoutText: {
    fontSize: 14,
  },
  viewSegmentRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionNotice: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E0E7FF',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  footerLogoutCard: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 24, 38, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  footerUserText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  footerLogoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  footerLogoutBtnText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 13,
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundMesh } from '../../components/BackgroundMesh';
import { CreateShopModal } from './CreateShopModal';
import { EditShopModal } from './EditShopModal';
import { useAuth } from '../../context/AuthContext';
import {
  getAdminShopsApi,
  getAdminStatsApi,
  AdminStats,
} from '../../api/adminApi';
import { PublicShopItem } from '../../api/shopApi';
import { colors } from '../../theme/colors';

const CATEGORIES = ['All', 'Barbershop', 'Hair & Styling', 'Spa & Wellness', 'Skin & Facial'];

export const AdminDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [shops, setShops] = useState<PublicShopItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [search, setSearch] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [selectedShopForEdit, setSelectedShopForEdit] = useState<PublicShopItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [shopsData, statsData] = await Promise.all([
        getAdminShopsApi(),
        getAdminStatsApi(),
      ]);
      setShops(shopsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredShops = shops.filter((s) => {
    const matchesCategory =
      activeCategory === 'All' ||
      s.category.toLowerCase().includes(activeCategory.toLowerCase());

    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.area && s.area.toLowerCase().includes(q)) ||
      (s.owner && s.owner.email.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Navbar */}
      <View style={[styles.navBar, { paddingTop: Math.max(insets.top + 8, 46) }]}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={styles.platformBadgeRow}>
            <View style={styles.platformDot} />
            <Text style={styles.platformBadge}>SLOTIFY PLATFORM DEV / ADMIN</Text>
          </View>
          <Text style={styles.mainTitle} numberOfLines={1}>Studio Network</Text>
          <Text style={styles.subTitle}>Manage registered shops & live slot distribution</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary 2x2 Grid */}
      {stats && (
        <View style={styles.adminStatsContainer}>
          <Text style={styles.statsTitle}>REAL-TIME PLATFORM METRICS</Text>
          <View style={styles.statsRow}>
            {/* Card 1: Total Shops */}
            <View style={[styles.statQuadCard, styles.purpleQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={styles.statVal}>{stats.totalShops}</Text>
                <Text style={{ fontSize: 18 }}>🏬</Text>
              </View>
              <Text style={styles.statLbl}>Registered Shops</Text>
            </View>

            {/* Card 2: Available Now */}
            <View style={[styles.statQuadCard, styles.greenQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={[styles.statVal, { color: colors.availableGlow }]}>
                  {stats.availableShops}
                </Text>
                <Text style={{ fontSize: 18 }}>🟢</Text>
              </View>
              <Text style={styles.statLbl}>Live & Open Now</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {/* Card 3: Busy */}
            <View style={[styles.statQuadCard, styles.peachQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={[styles.statVal, { color: colors.busyGlow }]}>
                  {stats.busyShops}
                </Text>
                <Text style={{ fontSize: 18 }}>🟡</Text>
              </View>
              <Text style={styles.statLbl}>Busy Studios</Text>
            </View>

            {/* Card 4: Booked Today */}
            <View style={[styles.statQuadCard, styles.cyanQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={[styles.statVal, { color: colors.primaryGlow }]}>
                  {stats.bookedSlotsToday}
                </Text>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <Text style={styles.statLbl}>Booked Today</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action and Search Row */}
      <View style={styles.controlsRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by studio, area, or owner email..."
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+ Add Shop</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills Slider */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                isSelected ? styles.categoryChipActive : styles.categoryChipInactive,
              ]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List Sub-header */}
      <View style={styles.listSubHeader}>
        <Text style={styles.listSubTitle}>
          REGISTERED SALONS & STUDIOS ({filteredShops.length})
        </Text>
        <Text style={styles.listSubHint}>Tap Edit to configure</Text>
      </View>
    </View>
  );

  const renderShopItem = ({ item }: { item: PublicShopItem }) => {
    const isAvail = item.status === 'available';
    const isBusy = item.status === 'busy';

    const statusBg = isAvail
      ? colors.availableBg
      : isBusy
      ? colors.busyBg
      : colors.closedBg;

    const statusBorder = isAvail
      ? colors.availableBorder
      : isBusy
      ? colors.busyBorder
      : colors.closedBorder;

    const statusTextCol = isAvail
      ? colors.availableGlow
      : isBusy
      ? colors.busyGlow
      : colors.textMuted;

    const statusDotCol = isAvail
      ? colors.availableGlow
      : isBusy
      ? colors.busyGlow
      : colors.closedGlow;

    const occupancy =
      item.totalSlots > 0
        ? Math.round((item.bookedCount / item.totalSlots) * 100)
        : 0;

    return (
      <View style={styles.shopCard}>
        {/* Left vertical status rail */}
        <View style={[styles.shopCardAccentRail, { backgroundColor: statusDotCol }]} />

        <View style={styles.shopCardInner}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.categoryBadgeRow}>
                <Text style={styles.categoryText}>{item.category}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.areaText}>{item.area || 'Downtown'}</Text>
              </View>
              <Text style={styles.shopName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.owner && (
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerIcon}>👤</Text>
                  <Text style={styles.ownerText} numberOfLines={1}>
                    {item.owner.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Status Pill */}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusBg, borderColor: statusBorder },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: statusDotCol }]} />
              <Text style={[styles.statusText, { color: statusTextCol }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Occupancy Progress Bar */}
          <View style={styles.occupancyBarContainer}>
            <View style={styles.occupancyLabelRow}>
              <Text style={styles.occupancyLabel}>Today's Occupancy</Text>
              <Text style={styles.occupancyVal}>{occupancy}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${occupancy}%`,
                    backgroundColor:
                      occupancy > 75
                        ? colors.busyGlow
                        : occupancy > 0
                        ? colors.primaryGlow
                        : colors.closedGlow,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Bottom Row: Cadence & Actions */}
          <View style={styles.cardBottom}>
            <View style={styles.scheduleInfo}>
              <Text style={styles.schedText}>
                🕒 {item.workingHoursStart}–{item.workingHoursEnd} ({item.slotDurationMinutes}m slots)
              </Text>
              <Text style={styles.slotCounts}>
                🟢 {item.availableCount ?? 0} open • 🟡 {item.bookedCount ?? 0} booked • ⚪ {item.closedCount ?? 0} closed
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setSelectedShopForEdit(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.editBtnText}>✏️ Edit Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <BackgroundMesh />
        <ActivityIndicator size="large" color={colors.primaryGlow} />
        <Text style={styles.loadingText}>Loading studio network...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundMesh />

      <FlatList
        data={filteredShops}
        keyExtractor={(item) => item.id}
        renderItem={renderShopItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={colors.primaryGlow}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No studios found matching your filter.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerLogoutCard}>
            <Text style={styles.footerUserText}>Logged in as {user?.email} (Admin)</Text>
            <TouchableOpacity
              style={styles.footerLogoutBtn}
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLogoutBtnText}>🚪 Exit Admin Panel</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <CreateShopModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={fetchData}
      />

      <EditShopModal
        visible={!!selectedShopForEdit}
        shop={selectedShopForEdit}
        onClose={() => setSelectedShopForEdit(null)}
        onUpdated={fetchData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A12',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#070A12',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  platformBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  platformDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FBBF24',
  },
  platformBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  adminStatsContainer: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statQuadCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    minHeight: 104,
    justifyContent: 'space-between',
  },
  purpleQuad: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  greenQuad: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  peachQuad: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  cyanQuad: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  statQuadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statVal: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLbl: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(18, 24, 38, 0.85)',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: colors.primary,
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryGlow,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listSubTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  listSubHint: {
    fontSize: 12,
    color: colors.availableGlow,
    fontWeight: '600',
  },
  shopCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: 'rgba(18, 24, 38, 0.8)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shopCardAccentRail: {
    width: 6,
  },
  shopCardInner: {
    flex: 1,
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 0.6,
  },
  dotSeparator: {
    fontSize: 12,
    color: colors.textMuted,
  },
  areaText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  shopName: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  ownerIcon: {
    fontSize: 12,
  },
  ownerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.2,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  occupancyBarContainer: {
    marginTop: 14,
  },
  occupancyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  occupancyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  occupancyVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleInfo: {
    flex: 1,
    marginRight: 10,
  },
  schedText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  slotCounts: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  footerLogoutCard: {
    marginTop: 24,
    marginBottom: 40,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 24, 38, 0.7)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  footerUserText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  footerLogoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  footerLogoutBtnText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 14,
  },
});

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
      <View style={[styles.navBar, { paddingTop: Math.max(insets.top + 10, 48) }]}>
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

      {/* Stats Summary 2x2 Pastel Grid */}
      {stats && (
        <View style={styles.adminStatsContainer}>
          <Text style={styles.statsTitle}>REAL-TIME PLATFORM METRICS</Text>
          <View style={styles.statsRow}>
            {/* Card 1: Total Shops */}
            <View style={[styles.statQuadCard, styles.purpleQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={styles.statVal}>{stats.totalShops}</Text>
                <Text style={{ fontSize: 16 }}>🏬</Text>
              </View>
              <Text style={styles.statLbl}>Registered Shops</Text>
            </View>

            {/* Card 2: Available Now */}
            <View style={[styles.statQuadCard, styles.greenQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={[styles.statVal, { color: colors.availableGlow }]}>
                  {stats.availableShops}
                </Text>
                <Text style={{ fontSize: 16 }}>🟢</Text>
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
                <Text style={{ fontSize: 16 }}>🟡</Text>
              </View>
              <Text style={styles.statLbl}>Busy Studios</Text>
            </View>

            {/* Card 4: Booked Today */}
            <View style={[styles.statQuadCard, styles.cyanQuad]}>
              <View style={styles.statQuadHeader}>
                <Text style={[styles.statVal, { color: colors.primaryGlow }]}>
                  {stats.bookedSlotsToday}
                </Text>
                <Text style={{ fontSize: 16 }}>⚡</Text>
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
        <Text style={styles.listSubTitle}>PLATFORM SHOPS ({filteredShops.length})</Text>
        <Text style={styles.listSubHint}>Auto-syncs via Socket.io</Text>
      </View>
    </View>
  );

  const renderShopItem = ({ item }: { item: PublicShopItem }) => {
    const isAvailable = item.status === 'available';
    const isBusy = item.status === 'busy';

    const statusColor = isAvailable
      ? colors.availableGlow
      : isBusy
      ? colors.busyGlow
      : colors.textMuted;

    const statusBg = isAvailable
      ? colors.availableBg
      : isBusy
      ? colors.busyBg
      : colors.closedBg;

    const occupancy = item.totalSlots > 0
      ? Math.round((item.bookedCount / item.totalSlots) * 100)
      : 0;

    return (
      <View style={styles.shopCard}>
        {/* Left vertical color accent rail */}
        <View
          style={[
            styles.shopCardAccentRail,
            { backgroundColor: statusColor },
          ]}
        />

        <View style={styles.shopCardInner}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={styles.categoryBadgeRow}>
                <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.areaText}>{item.area || 'Metro Area'}</Text>
              </View>

              <Text style={styles.shopName}>{item.name}</Text>
              
              {item.owner && (
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerIcon}>✉️</Text>
                  <Text style={styles.ownerText}>{item.owner.email}</Text>
                </View>
              )}
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Occupancy Mini Progress Bar */}
          <View style={styles.occupancyBarContainer}>
            <View style={styles.occupancyLabelRow}>
              <Text style={styles.occupancyLabel}>Live Occupancy</Text>
              <Text style={styles.occupancyVal}>{occupancy}% ({item.bookedCount}/{item.totalSlots})</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(occupancy, 100)}%`,
                    backgroundColor: isAvailable ? colors.primaryGlow : colors.busyGlow,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <View style={styles.scheduleInfo}>
              <Text style={styles.schedText}>
                🕒 {item.workingHoursStart}–{item.workingHoursEnd} ({item.slotDurationMinutes}m)
              </Text>
              <Text style={styles.slotCounts}>
                <Text style={{ color: colors.availableGlow, fontWeight: '700' }}>{item.availableCount} open</Text> • {item.bookedCount} booked
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setSelectedShopForEdit(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.editBtnText}>⚙️ Edit Shop</Text>
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
        ListHeaderComponent={renderHeader}
        renderItem={renderShopItem}
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
            <Text style={styles.emptyText}>No shops matched your search.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerLogoutCard}>
            <Text style={styles.footerUserText}>
              Platform Admin Session ({user?.email})
            </Text>
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
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 14,
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
    gap: 6,
    marginBottom: 4,
  },
  platformDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },
  platformBadge: {
    fontSize: 10,
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
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  adminStatsContainer: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statQuadCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  purpleQuad: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.22)',
  },
  greenQuad: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.22)',
  },
  peachQuad: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  cyanQuad: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.22)',
  },
  statQuadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(18, 24, 38, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryGlow,
  },
  categoryChipText: {
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  listSubHint: {
    fontSize: 11,
    color: colors.availableGlow,
    fontWeight: '600',
  },
  shopCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: 'rgba(18, 24, 38, 0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shopCardAccentRail: {
    width: 5,
  },
  shopCardInner: {
    flex: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 0.6,
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.textMuted,
  },
  areaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  shopName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  ownerIcon: {
    fontSize: 10,
  },
  ownerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  occupancyBarContainer: {
    marginTop: 12,
  },
  occupancyLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  occupancyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  occupancyVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleInfo: {
    flex: 1,
  },
  schedText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  slotCounts: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLogoutCard: {
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 20,
    padding: 18,
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

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { updateAdminShopApi, deleteShopApi } from '../../api/adminApi';
import { PublicShopItem } from '../../api/shopApi';
import { colors } from '../../theme/colors';

interface EditShopModalProps {
  visible: boolean;
  shop: PublicShopItem | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditShopModal: React.FC<EditShopModalProps> = ({
  visible,
  shop,
  onClose,
  onUpdated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('19:00');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setCategory(shop.category);
      setArea(shop.area);
      setPhone(shop.phone);
      setStart(shop.workingHoursStart);
      setEnd(shop.workingHoursEnd);
      setDuration(shop.slotDurationMinutes);
    }
  }, [shop]);

  if (!shop) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Shop name is required');
      return;
    }

    setLoading(true);
    try {
      await updateAdminShopApi(shop.id, {
        name: name.trim(),
        category: category.trim(),
        area: area.trim(),
        phone: phone.trim(),
        workingHoursStart: start,
        workingHoursEnd: end,
        slotDurationMinutes: duration,
      });
      Alert.alert('Success', 'Shop updated successfully');
      onUpdated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update shop');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Shop',
      `Are you sure you want to permanently delete "${shop.name}" and its owner account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShopApi(shop.id);
              onUpdated();
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete shop');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.modalTag}>ADMIN EDIT</Text>
                <Text style={styles.modalTitle}>Manage {shop.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Area / Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionHeader}>SCHEDULE PARAMETERS</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Opening (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={start}
                  onChangeText={setStart}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Closing (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={end}
                  onChangeText={setEnd}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Slot Duration (Minutes)</Text>
              <View style={styles.durationRow}>
                {[15, 30, 45, 60].map((dur) => (
                  <TouchableOpacity
                    key={dur}
                    style={[
                      styles.durChip,
                      duration === dur && styles.durChipActive,
                    ]}
                    onPress={() => setDuration(dur)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durChipText,
                        duration === dur && styles.durChipTextActive,
                      ]}
                    >
                      {dur}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteBtnText}>🗑️ Delete Shop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes →</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.bgCard,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: colors.borderGlass,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 50,
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  durChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryGlow,
  },
  durChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  durChipTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  deleteBtn: {
    flex: 1,
    height: 52,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 1.2,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

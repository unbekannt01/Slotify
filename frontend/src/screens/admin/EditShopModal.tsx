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
                <Text style={styles.label}>Area</Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Open Time</Text>
                <TextInput
                  style={styles.input}
                  value={start}
                  onChangeText={setStart}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Close Time</Text>
                <TextInput
                  style={styles.input}
                  value={end}
                  onChangeText={setEnd}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Slot Interval: {duration}m</Text>
              <View style={styles.durationRow}>
                {[15, 30, 45, 60].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durChip,
                      duration === d && styles.durChipActive,
                    ]}
                    onPress={() => setDuration(d)}
                  >
                    <Text
                      style={[
                        styles.durChipText,
                        duration === d && styles.durChipTextActive,
                      ]}
                    >
                      {d}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>🗑 Delete Shop</Text>
            </TouchableOpacity>
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
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 5,
  },
  input: {
    height: 46,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 14,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  durChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  durChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primaryGlow,
  },
  durChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  durChipTextActive: {
    color: '#FFF',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});

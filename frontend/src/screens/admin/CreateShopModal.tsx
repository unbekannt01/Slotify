import React, { useState } from 'react';
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
import { createOwnerAndShopApi, CreateShopPayload } from '../../api/adminApi';
import { colors } from '../../theme/colors';

interface CreateShopModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateShopModal: React.FC<CreateShopModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair & Styling');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('19:00');
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter shop name, owner email, and password.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateShopPayload = {
        name: name.trim(),
        category: category.trim(),
        area: area.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        workingHoursStart: start,
        workingHoursEnd: end,
        slotDurationMinutes: duration,
      };

      await createOwnerAndShopApi(payload);
      Alert.alert('Success', `Shop "${name}" & owner account created!`);
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setArea('');
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.modalTag}>ADMIN PROVISIONING</Text>
                <Text style={styles.modalTitle}>Register New Shop & Owner</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Shop Information */}
            <Text style={styles.sectionHeader}>SHOP DETAILS</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Velvet Hair Studio"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Salon, Barbershop..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Area / Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. Downtown"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone (for Call to Book)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Owner Credentials */}
            <Text style={styles.sectionHeader}>OWNER ACCOUNT CREDENTIALS</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="owner@salon.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            {/* Schedule Configuration */}
            <Text style={styles.sectionHeader}>SCHEDULE PRESETS</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Open Time</Text>
                <TextInput
                  style={styles.input}
                  value={start}
                  onChangeText={setStart}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Close Time</Text>
                <TextInput
                  style={styles.input}
                  value={end}
                  onChangeText={setEnd}
                  placeholder="19:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Slot Interval: {duration} minutes</Text>
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
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Provision Shop & Owner →</Text>
              )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
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
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
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
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

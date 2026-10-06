import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface WorkingHoursModalProps {
  visible: boolean;
  currentStart: string;
  currentEnd: string;
  onSave: (start: string, end: string) => void;
  onClose: () => void;
}

export const WorkingHoursModal: React.FC<WorkingHoursModalProps> = ({
  visible,
  currentStart,
  currentEnd,
  onSave,
  onClose,
}) => {
  const [start, setStart] = useState(currentStart);
  const [end, setEnd] = useState(currentEnd);

  const handleSave = () => {
    // Validate HH:MM format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      alert('Please enter valid times in HH:MM format (e.g. 09:00)');
      return;
    }
    onSave(start, end);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.modalContent}>
          <Text style={styles.title}>OPERATING HOURS</Text>
          <Text style={styles.subtitle}>
            Adjust daily schedule range. Existing bookings will be preserved.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Opening Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={start}
              onChangeText={setStart}
              placeholder="09:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Closing Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={end}
              onChangeText={setEnd}
              placeholder="19:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveText}>Save Hours →</Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgCard,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: colors.borderGlass,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
});

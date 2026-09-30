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
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save Hours</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
} from 'react-native';
import { SlotItem, SlotStatus } from '../api/shopApi';
import { colors } from '../theme/colors';

interface SlotInspectorModalProps {
  visible: boolean;
  slot: SlotItem | null;
  onClose: () => void;
  onSaveStatus: (slot: SlotItem, status: SlotStatus, clientName?: string) => void;
}

export const SlotInspectorModal: React.FC<SlotInspectorModalProps> = ({
  visible,
  slot,
  onClose,
  onSaveStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<SlotStatus>('available');
  const [clientName, setClientName] = useState<string>('');

  useEffect(() => {
    if (slot) {
      setSelectedStatus(slot.status);
      setClientName(slot.customerName || '');
    }
  }, [slot]);

  if (!slot) return null;

  const handleSave = () => {
    onSaveStatus(slot, selectedStatus, clientName);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Grab handle indicator */}
          <View style={styles.handleBar} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>SLOT DETAILS & EDIT</Text>
              <Text style={styles.slotRange}>
                {slot.start} – {slot.end}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Status Selectors */}
          <Text style={styles.fieldLabel}>SLOT STATUS</Text>
          <View style={styles.statusButtonsRow}>
            {/* Available */}
            <TouchableOpacity
              style={[
                styles.statusOptionBtn,
                selectedStatus === 'available' && styles.availableSelected,
              ]}
              onPress={() => setSelectedStatus('available')}
              activeOpacity={0.8}
            >
              <View style={[styles.statusOptionDot, { backgroundColor: colors.availableGlow }]} />
              <Text
                style={[
                  styles.statusOptionText,
                  selectedStatus === 'available' && { color: colors.availableGlow, fontWeight: '800' },
                ]}
              >
                Available
              </Text>
            </TouchableOpacity>

            {/* Booked */}
            <TouchableOpacity
              style={[
                styles.statusOptionBtn,
                selectedStatus === 'booked' && styles.bookedSelected,
              ]}
              onPress={() => setSelectedStatus('booked')}
              activeOpacity={0.8}
            >
              <View style={[styles.statusOptionDot, { backgroundColor: colors.busyGlow }]} />
              <Text
                style={[
                  styles.statusOptionText,
                  selectedStatus === 'booked' && { color: colors.busyGlow, fontWeight: '800' },
                ]}
              >
                Booked
              </Text>
            </TouchableOpacity>

            {/* Closed */}
            <TouchableOpacity
              style={[
                styles.statusOptionBtn,
                selectedStatus === 'closed' && styles.closedSelected,
              ]}
              onPress={() => setSelectedStatus('closed')}
              activeOpacity={0.8}
            >
              <View style={[styles.statusOptionDot, { backgroundColor: colors.closedGlow }]} />
              <Text
                style={[
                  styles.statusOptionText,
                  selectedStatus === 'closed' && { color: colors.textSecondary, fontWeight: '800' },
                ]}
              >
                Closed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Client / Appointment details */}
          <Text style={styles.fieldLabel}>CLIENT NAME / RESERVATION NOTE</Text>
          <TextInput
            style={styles.textInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder="e.g. Sahil - Beard styling (optional)"
            placeholderTextColor={colors.textMuted}
          />

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Save & Broadcast →</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#121826',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 38,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 1,
  },
  slotRange: {
    fontSize: 24,
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
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    gap: 7,
  },
  availableSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: colors.availableGlow,
  },
  bookedSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: colors.busyGlow,
  },
  closedSelected: {
    backgroundColor: 'rgba(100, 116, 139, 0.22)',
    borderColor: colors.closedGlow,
  },
  statusOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.borderSubtle,
    height: 52,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 24,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});

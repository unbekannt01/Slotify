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
          {/* Grab handle indicator (Image 5 & 7) */}
          <View style={styles.handleBar} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>SLOT INSPECTOR</Text>
              <Text style={styles.slotRange}>
                {slot.start} – {slot.end}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Status Selectors (Image 5 & 7 style) */}
          <Text style={styles.fieldLabel}>AVAILABILITY STATUS</Text>
          <View style={styles.statusButtonsRow}>
            {/* Available */}
            <TouchableOpacity
              style={[
                styles.statusOptionBtn,
                selectedStatus === 'available' && styles.availableSelected,
              ]}
              onPress={() => setSelectedStatus('available')}
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

          {/* Client / Appointment details (Optional) */}
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
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            {/* Vivid emerald CTA (Image 7) */}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
              <Text style={styles.confirmBtnText}>Save & Broadcast</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#121826',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 1,
  },
  slotRange: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statusOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 6,
  },
  availableSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.availableGlow,
  },
  bookedSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.busyGlow,
  },
  closedSelected: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderColor: colors.closedGlow,
  },
  statusOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 24,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#064E3B',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.4,
  },
});

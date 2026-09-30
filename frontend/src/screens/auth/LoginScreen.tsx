import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { BackgroundMesh } from '../../components/BackgroundMesh';
import { AnimatedButton } from '../../components/AnimatedButton';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/config';
import { updateApiClientBaseUrl } from '../../api/client';
import { colors } from '../../theme/colors';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('owner@luxe.com');
  const [password, setPassword] = useState('owner123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Server URL status and configuration
  const [serverUrl, setServerUrl] = useState<string>(API_BASE_URL);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [editingServer, setEditingServer] = useState<boolean>(false);
  const [pinging, setPinging] = useState<boolean>(false);

  const checkServerConnection = async (url: string) => {
    setPinging(true);
    try {
      const target = url.endsWith('/') ? `${url}health` : `${url}/health`;
      const res = await axios.get(target, { timeout: 3500 });
      if (res.data?.status === 'ok') {
        setServerOnline(true);
        setErrorMsg(null);
      } else {
        setServerOnline(false);
      }
    } catch (e) {
      setServerOnline(false);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    checkServerConnection(serverUrl);
  }, []);

  const handleSaveServerUrl = () => {
    let formatted = serverUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    setServerUrl(formatted);
    updateApiClientBaseUrl(formatted);
    setEditingServer(false);
    checkServerConnection(formatted);
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    }
  };

  const fillPreset = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <View style={styles.container}>
      <BackgroundMesh />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Platform Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoPill}>
              <View style={styles.logoDot} />
              <Text style={styles.logoText}>SLOTIFY</Text>
            </View>
            <Text style={styles.headline}>Live Salon & Studio Availability</Text>
            <Text style={styles.tagline}>
              High-frequency real-time booking control for shop owners and admins
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            <Text style={styles.cardTitle}>SIGN IN</Text>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@salon.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
            </View>

            <AnimatedButton
              onPress={handleLogin}
              disabled={isLoading}
              style={styles.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitText}>Enter Portal →</Text>
              )}
            </AnimatedButton>
          </View>

          {/* Quick Demo Credentials Switcher */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>QUICK PRESETS (TAP TO FILL)</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillPreset('owner@luxe.com', 'owner123')}
              >
                <Text style={styles.demoChipRole}>Owner</Text>
                <Text style={styles.demoChipShop}>Luxe Salon</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.demoChip}
                onPress={() => fillPreset('barber@apex.com', 'barber123')}
              >
                <Text style={styles.demoChipRole}>Owner</Text>
                <Text style={styles.demoChipShop}>Apex Barber</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoChip, styles.adminChip]}
                onPress={() => fillPreset('admin@slotify.com', 'admin123')}
              >
                <Text style={[styles.demoChipRole, { color: '#FBBF24' }]}>Admin</Text>
                <Text style={styles.demoChipShop}>Platform Dev</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Backend Connection Diagnostics Bar */}
          <View style={styles.connectionBar}>
            <View style={styles.connStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      serverOnline === true
                        ? colors.availableGlow
                        : serverOnline === false
                        ? colors.danger
                        : colors.busyGlow,
                  },
                ]}
              />
              <Text style={styles.connUrlText} numberOfLines={1}>
                Server: {serverUrl}
              </Text>

              <TouchableOpacity
                onPress={() => setEditingServer(!editingServer)}
                style={styles.changeBtn}
              >
                <Text style={styles.changeBtnText}>
                  {editingServer ? 'Done' : 'Change'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => checkServerConnection(serverUrl)}
                disabled={pinging}
                style={styles.testBtn}
              >
                <Text style={styles.testBtnText}>
                  {pinging ? '...' : 'Ping'}
                </Text>
              </TouchableOpacity>
            </View>

            {editingServer && (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.1.X:5000"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.saveServerBtn}
                  onPress={handleSaveServerUrl}
                >
                  <Text style={styles.saveServerBtnText}>Set</Text>
                </TouchableOpacity>
              </View>
            )}

            {serverOnline === false && (
              <Text style={styles.offlineHint}>
                ⚠️ Cannot connect to backend server. If using a physical phone, ensure phone and PC are on the same Wi-Fi and set the server URL to your PC's IP (e.g. http://10.240.100.45:5000).
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryGlow,
    marginRight: 8,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },
  loginCard: {
    backgroundColor: 'rgba(18, 24, 38, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    height: 50,
    backgroundColor: colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 15,
  },
  submitBtn: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  demoSection: {
    marginTop: 22,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  adminChip: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  demoChipRole: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryGlow,
    letterSpacing: 0.5,
  },
  demoChipShop: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  connectionBar: {
    marginTop: 24,
    backgroundColor: 'rgba(18, 24, 38, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  connStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connUrlText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    marginLeft: 6,
  },
  changeBtnText: {
    fontSize: 11,
    color: colors.primaryGlow,
    fontWeight: '700',
  },
  testBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 6,
    marginLeft: 6,
  },
  testBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  serverInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    color: colors.textPrimary,
    fontSize: 12,
  },
  saveServerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveServerBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  offlineHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#F87171',
    lineHeight: 15,
  },
});

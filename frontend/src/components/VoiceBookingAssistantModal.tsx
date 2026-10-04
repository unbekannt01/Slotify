import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { colors } from '../theme/colors';
import { sendVoiceCommandApi, VoiceAssistantResponse, SlotItem } from '../api/shopApi';

interface VoiceBookingAssistantModalProps {
  visible: boolean;
  shopId: string;
  onClose: () => void;
  onBookingSuccess?: (bookedSlot: SlotItem, updatedSlots?: SlotItem[]) => void;
}

type AssistantStep = 'idle' | 'listening' | 'understanding' | 'checking' | 'confirming' | 'booked' | 'need_info' | 'error';

export const VoiceBookingAssistantModal: React.FC<VoiceBookingAssistantModalProps> = ({
  visible,
  shopId,
  onClose,
  onBookingSuccess,
}) => {
  const [step, setStep] = useState<AssistantStep>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [typedInput, setTypedInput] = useState<string>('');
  const [language, setLanguage] = useState<'auto' | 'hi' | 'gu' | 'en'>('auto');
  const [voiceResponse, setVoiceResponse] = useState<VoiceAssistantResponse | null>(null);
  const [activeContext, setActiveContext] = useState<any>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation values for glowing pulsing rings & audio waveform
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const waveBars = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.7),
    new Animated.Value(0.5),
    new Animated.Value(0.9),
    new Animated.Value(0.4),
    new Animated.Value(0.8),
    new Animated.Value(0.6),
  ]).current;

  const recognitionRef = useRef<any>(null);
  const nativeSubscriptionsRef = useRef<any[]>([]);

  // Pulse animation loops
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    let waveLoop: Animated.CompositeAnimation | null = null;

    if (step === 'listening') {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);

      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.45,
              duration: 1100,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 900,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.75,
              duration: 1300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 1000,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animLoop.start();

      // Audio waveform random animation
      const barAnimations = waveBars.map((val, idx) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 0.2 + ((idx * 3) % 8) * 0.1,
              duration: 200 + idx * 40,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: 0.9 - ((idx * 2) % 4) * 0.1,
              duration: 250 + idx * 30,
              useNativeDriver: false,
            }),
          ])
        )
      );
      waveLoop = Animated.parallel(barAnimations);
      waveLoop.start();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      waveBars.forEach((bar) => bar.setValue(0.3));
    }

    return () => {
      if (animLoop) animLoop.stop();
      if (waveLoop) waveLoop.stop();
    };
  }, [step]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStep('idle');
      setTranscript('');
      setTypedInput('');
      setVoiceResponse(null);
      setActiveContext(null);
      setErrorMessage(null);
      // Auto-start listening on open for seamless experience
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
      Speech.stop();
    }
  }, [visible]);

  // Initialize Speech Recognition (Native Mobile via expo-speech-recognition + Web Speech API)
  const startSpeechRecognition = async () => {
    setErrorMessage(null);
    setTranscript('');
    setStep('listening');

    const langCode =
      language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'hi-IN';

    // 1. Web browser environment
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.abort();
          }

          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = langCode;
          recognition.continuous = false;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }

            const currentSpoken = final || interim;
            if (currentSpoken) {
              setTranscript(currentSpoken);
            }

            if (final) {
              handleCommandSubmission(final.trim());
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('[Voice Assistant] Web speech recognition error:', e.error);
            if (e.error === 'not-allowed') {
              setErrorMessage('Microphone access is blocked. Please allow mic permission or use typed input.');
              setStep('idle');
            } else if (e.error === 'no-speech') {
              setStep('idle');
            }
          };

          recognition.onend = () => {
            if (step === 'listening' && !transcript) {
              setStep('idle');
            }
          };

          recognition.start();
        } catch (err: any) {
          console.warn('[Voice Assistant] Could not start web speech recognition:', err);
          setStep('idle');
        }
      } else {
        setStep('idle');
      }
      return;
    }

    // 2. Native Mobile (Android & iOS) environment via ExpoSpeechRecognitionModule
    try {
      if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === 'function') {
        const permResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permResult.granted) {
          setErrorMessage('Microphone and speech permissions are required for voice booking on your phone.');
          setStep('idle');
          return;
        }

        // Clean previous listeners
        nativeSubscriptionsRef.current.forEach((sub) => {
          try {
            sub?.remove?.();
          } catch (_) {}
        });
        nativeSubscriptionsRef.current = [];

        // Attach native listeners
        const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
          const spoken = event.results?.[0]?.transcript || '';
          if (spoken) {
            setTranscript(spoken);
          }
          if (event.isFinal && spoken.trim()) {
            handleCommandSubmission(spoken.trim());
          }
        });

        const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
          console.warn('[Voice Assistant] Native mobile speech error:', event.error, event.message);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access denied. Please grant microphone permission in app settings.');
          }
          setStep('idle');
        });

        const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
          if (step === 'listening') {
            setStep('idle');
          }
        });

        nativeSubscriptionsRef.current = [resultSub, errorSub, endSub];

        await ExpoSpeechRecognitionModule.start({
          lang: langCode,
          interimResults: true,
          continuous: false,
        });
      } else {
        // Fallback if running on Expo Go without native prebuild
        console.info('[Voice Assistant] Native speech module not active in current environment.');
      }
    } catch (mobileErr: any) {
      console.warn('[Voice Assistant] Mobile speech recognition start error:', mobileErr);
      setStep('idle');
    }
  };

  const stopSpeechRecognition = () => {
    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }
    } else {
      try {
        if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.stop === 'function') {
          ExpoSpeechRecognitionModule.stop();
        }
      } catch (_) {}
      nativeSubscriptionsRef.current.forEach((sub) => {
        try {
          sub?.remove?.();
        } catch (_) {}
      });
      nativeSubscriptionsRef.current = [];
    }
  };

  // Speak assistant feedback via expo-speech
  const speakAssistantVoice = (textToSpeak: string, lang: 'hi' | 'gu' | 'en') => {
    if (!audioFeedbackEnabled) return;
    try {
      Speech.stop();
      const voiceLang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
      Speech.speak(textToSpeak, {
        language: voiceLang,
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (_) {}
  };

  // Submit recognized or typed voice command to the backend AI assistant
  const handleCommandSubmission = async (commandText: string, isConfirmation = false) => {
    if (!commandText && !isConfirmation) return;

    stopSpeechRecognition();
    setTranscript(commandText);
    setStep('understanding');

    try {
      // Step: Checking availability & intent
      setStep('checking');

      const response = await sendVoiceCommandApi(shopId, {
        text: commandText,
        context: activeContext,
        confirm: isConfirmation,
      });

      setVoiceResponse(response);
      setActiveContext(response.context || null);

      if (response.replyText) {
        speakAssistantVoice(response.replyText, response.language);
      }

      if (response.status === 'booked') {
        setStep('booked');
        if (response.bookedSlot && onBookingSuccess) {
          onBookingSuccess(response.bookedSlot, response.updatedSlots);
        }
      } else if (response.status === 'confirming') {
        setStep('confirming');
      } else if (response.status === 'need_info') {
        setStep('need_info');
      } else if (response.status === 'cancelled') {
        setStep('booked'); // Success state for cancellation
        if (onBookingSuccess && response.updatedSlots) {
          onBookingSuccess(response.cancelledSlot || ({} as any), response.updatedSlots);
        }
      } else {
        setStep('idle');
      }
    } catch (err: any) {
      console.error('[Voice Assistant] Command failed:', err);
      const msg = err.response?.data?.error || err.message || 'Could not understand command.';
      setErrorMessage(msg);
      setStep('error');
      speakAssistantVoice(msg, 'en');
    }
  };

  const handleConfirmDirect = () => {
    handleCommandSubmission(transcript || 'Yes confirm', true);
  };

  const handleSampleChipPress = (sampleText: string) => {
    setTranscript(sampleText);
    setTypedInput(sampleText);
    handleCommandSubmission(sampleText);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlayBackdrop}>
        <View style={styles.assistantSheet}>
          
          {/* Top Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeDot}>●</Text>
                <Text style={styles.aiBadgeText}>AI RECEPTIONIST</Text>
              </View>
              <Text style={styles.headerTitle}>Voice Slot Booking</Text>
            </View>

            <View style={styles.headerRightControls}>
              {/* Sound Toggle */}
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
                activeOpacity={0.7}
                accessibilityLabel={audioFeedbackEnabled ? 'Voice reply enabled' : 'Muted'}
              >
                <Text style={styles.headerIconText}>{audioFeedbackEnabled ? '🔊' : '🔇'}</Text>
              </TouchableOpacity>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Language Selection Filter Pills */}
          <View style={styles.languagePillRow}>
            {[
              { id: 'auto', label: '⚡ Auto (All Languages)' },
              { id: 'hi', label: '🇮🇳 Hindi' },
              { id: 'gu', label: '🌾 Gujarati' },
              { id: 'en', label: '🌐 English' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.languagePill,
                  language === item.id && styles.languagePillActive,
                ]}
                onPress={() => setLanguage(item.id as any)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.languagePillText,
                    language === item.id && styles.languagePillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* State Progress Stepper */}
          <View style={styles.stepperContainer}>
            {[
              { key: 'listening', label: 'Listening' },
              { key: 'understanding', label: 'Understanding' },
              { key: 'checking', label: 'Checking Availability' },
              { key: 'confirming', label: 'Confirming' },
              { key: 'booked', label: 'Booked ✓' },
            ].map((s, index) => {
              const isCurrent = step === s.key;
              const isDone =
                (step === 'booked' && s.key !== 'booked') ||
                (step === 'confirming' && ['listening', 'understanding', 'checking'].includes(s.key)) ||
                (step === 'checking' && ['listening', 'understanding'].includes(s.key)) ||
                (step === 'understanding' && s.key === 'listening');

              return (
                <View key={s.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      isCurrent && styles.stepDotActive,
                      isDone && styles.stepDotDone,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelActive,
                      isDone && styles.stepLabelDone,
                    ]}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Central Interactive Voice Canvas */}
          <View style={styles.voiceStageCard}>
            
            {/* 1. LISTENING STATE */}
            {step === 'listening' && (
              <View style={styles.centerStageBox}>
                {/* Glowing Pulsing Rings */}
                <View style={styles.orbWrapper}>
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      { transform: [{ scale: pulseAnim2 }], opacity: 0.2 },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.pulsingRing,
                      { transform: [{ scale: pulseAnim1 }], opacity: 0.35 },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.micOrbActive}
                    onPress={stopSpeechRecognition}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.micOrbIcon}>🎙️</Text>
                  </TouchableOpacity>
                </View>

                {/* Animated Waveform Visualizer */}
                <View style={styles.waveformContainer}>
                  {waveBars.map((val, idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.waveBar,
                        {
                          transform: [{ scaleY: val }],
                        },
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.stateHeading}>Listening to your voice...</Text>
                <Text style={styles.transcriptPreview}>
                  {transcript ? `"${transcript}"` : 'Speak naturally (e.g. "Aaj 8:15 ka Raj ka slot book kar do")'}
                </Text>
              </View>
            )}

            {/* 2. UNDERSTANDING OR CHECKING STATE */}
            {(step === 'understanding' || step === 'checking') && (
              <View style={styles.centerStageBox}>
                <View style={styles.processingOrb}>
                  <ActivityIndicator size="large" color="#6366F1" />
                </View>
                <Text style={styles.stateHeading}>
                  {step === 'understanding' ? 'Understanding voice intent...' : 'Checking shop slots & availability...'}
                </Text>
                {transcript ? (
                  <View style={styles.heardBox}>
                    <Text style={styles.heardLabel}>HEARD:</Text>
                    <Text style={styles.heardText}>"{transcript}"</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* 3. CONFIRMING STATE */}
            {step === 'confirming' && (
              <ScrollView style={styles.confirmScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.assistantSpeechBubble}>
                  <Text style={styles.bubbleTag}>AI RECEPTIONIST</Text>
                  <Text style={styles.bubbleMessage}>{voiceResponse?.replyText}</Text>
                </View>

                {/* Structured Slot Card Preview */}
                <View style={styles.proposalCard}>
                  <View style={styles.proposalTopRow}>
                    <View>
                      <Text style={styles.proposalTimeTitle}>
                        {voiceResponse?.proposedSlot?.start || voiceResponse?.extracted?.time}
                      </Text>
                      <Text style={styles.proposalSubDate}>
                        Today, {voiceResponse?.extracted?.date || 'Schedule Grid'}
                      </Text>
                    </View>
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableBadgeText}>● AVAILABLE</Text>
                    </View>
                  </View>

                  <View style={styles.proposalMetaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>CLIENT NAME</Text>
                      <Text style={styles.metaValue}>
                        👤 {voiceResponse?.extracted?.customerName || voiceResponse?.context?.customerName || 'Customer'}
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>ACTION</Text>
                      <Text style={styles.metaValue}>⚡ Slot Reservation</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.confirmActionBtn}
                    onPress={handleConfirmDirect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmActionBtnText}>✓ Confirm & Book Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.speakAgainBtn}
                    onPress={startSpeechRecognition}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.speakAgainBtnText}>🎙️ Change</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* 4. NEED INFO STATE (e.g. Missing customer name or ambiguous time) */}
            {step === 'need_info' && (
              <View style={styles.centerStageBox}>
                <View style={styles.needInfoBubble}>
                  <Text style={styles.bubbleTag}>FOLLOW-UP QUESTION</Text>
                  <Text style={styles.needInfoText}>{voiceResponse?.replyText}</Text>
                </View>

                <TouchableOpacity
                  style={styles.replyMicBtn}
                  onPress={startSpeechRecognition}
                  activeOpacity={0.8}
                >
                  <Text style={styles.replyMicIcon}>🎙️</Text>
                  <Text style={styles.replyMicLabel}>Tap to Answer with Voice</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 5. BOOKED SUCCESS STATE */}
            {step === 'booked' && (
              <View style={styles.centerStageBox}>
                <View style={styles.successIconBadge}>
                  <Text style={styles.successCheckmark}>✓</Text>
                </View>
                <Text style={styles.successHeading}>Slot Booked & Synced!</Text>
                <Text style={styles.successMessage}>{voiceResponse?.replyText}</Text>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Done (View in Calendar)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 6. IDLE OR ERROR STATE */}
            {(step === 'idle' || step === 'error') && (
              <View style={styles.centerStageBox}>
                <TouchableOpacity
                  style={styles.idleMicOrb}
                  onPress={startSpeechRecognition}
                  activeOpacity={0.85}
                >
                  <Text style={styles.idleMicIcon}>🎙️</Text>
                </TouchableOpacity>
                <Text style={styles.idleHeading}>Tap Microphone to Speak</Text>
                <Text style={styles.idleSubtitle}>
                  Supports English, Hindi (हिंदी), and Gujarati (ગુજરાતી)
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Quick Preset Examples Chips Rail */}
          <View style={styles.sampleChipsSection}>
            <Text style={styles.sampleSectionTitle}>TRY SAYING:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sampleChipsScroll}>
              <TouchableOpacity
                style={styles.sampleChip}
                onPress={() => handleSampleChipPress('Aaj 8:15 ka Raj ka slot book kar do.')}
                activeOpacity={0.7}
              >
                <Text style={styles.sampleChipText}>🇮🇳 “Aaj 8:15 ka Raj ka slot book kar do”</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sampleChip}
                onPress={() => handleSampleChipPress('Aaje Raj nu 8:15 nu slot book kari do.')}
                activeOpacity={0.7}
              >
                <Text style={styles.sampleChipText}>🌾 “Aaje Raj nu 8:15 nu slot book kari do”</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sampleChip}
                onPress={() => handleSampleChipPress('Raj ka aaj 8:15 ka slot book kar do.')}
                activeOpacity={0.7}
              >
                <Text style={styles.sampleChipText}>✨ “Raj ka aaj 8:15 ka slot book kar do”</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sampleChip}
                onPress={() => handleSampleChipPress('Aaje ketla slots khali chhe?')}
                activeOpacity={0.7}
              >
                <Text style={styles.sampleChipText}>📊 “Aaje ketla slots khali chhe?”</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Bottom Manual Typed Bar Fallback */}
          <View style={styles.bottomBar}>
            <TextInput
              style={styles.typedTextInput}
              placeholder="Or type voice command in Hindi / Gujarati / English..."
              placeholderTextColor="#64748B"
              value={typedInput}
              onChangeText={setTypedInput}
              onSubmitEditing={() => {
                if (typedInput.trim()) {
                  handleCommandSubmission(typedInput.trim());
                  setTypedInput('');
                }
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !typedInput.trim() && styles.sendBtnDisabled,
              ]}
              disabled={!typedInput.trim()}
              onPress={() => {
                if (typedInput.trim()) {
                  handleCommandSubmission(typedInput.trim());
                  setTypedInput('');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.85)',
    justifyContent: 'flex-end',
  },
  assistantSheet: {
    backgroundColor: '#0D111E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '90%',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  aiBadgeDot: {
    fontSize: 8,
    color: '#34D399',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 15,
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
    fontWeight: '700',
    color: '#94A3B8',
  },
  languagePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  languagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  languagePillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderColor: '#6366F1',
  },
  languagePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  languagePillTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#818CF8',
    transform: [{ scale: 1.4 }],
  },
  stepDotDone: {
    backgroundColor: '#34D399',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#818CF8',
    fontWeight: '800',
  },
  stepLabelDone: {
    color: '#34D399',
  },
  voiceStageCard: {
    minHeight: 220,
    backgroundColor: 'rgba(18, 24, 40, 0.65)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  centerStageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  orbWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  pulsingRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6366F1',
  },
  micOrbActive: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#818CF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 12,
  },
  micOrbIcon: {
    fontSize: 32,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    marginVertical: 10,
  },
  waveBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#818CF8',
  },
  stateHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 6,
    textAlign: 'center',
  },
  transcriptPreview: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  processingOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heardBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '90%',
  },
  heardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#818CF8',
    marginBottom: 2,
  },
  heardText: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  confirmScrollView: {
    width: '100%',
  },
  assistantSpeechBubble: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  bubbleTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bubbleMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 20,
  },
  proposalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  proposalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  proposalTimeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  proposalSubDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  availableBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  availableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  proposalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmActionBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  confirmActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  speakAgainBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  speakAgainBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  needInfoBubble: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  needInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FDE68A',
    lineHeight: 20,
  },
  replyMicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  replyMicIcon: {
    fontSize: 18,
  },
  replyMicLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  successIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheckmark: {
    fontSize: 32,
    fontWeight: '900',
    color: '#34D399',
  },
  successHeading: {
    fontSize: 19,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  idleMicOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  idleMicIcon: {
    fontSize: 30,
  },
  idleHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  idleSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  errorBox: {
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  sampleChipsSection: {
    marginBottom: 12,
  },
  sampleSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sampleChipsScroll: {
    gap: 8,
  },
  sampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typedTextInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});

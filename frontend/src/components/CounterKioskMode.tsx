import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { sendVoiceCommandApi, VoiceAssistantResponse, SlotItem } from '../api/shopApi';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CounterKioskModeProps {
  visible: boolean;
  shopId: string;
  shopName: string;
  category?: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  slots: SlotItem[];
  counts: {
    available: number;
    booked: number;
    closed: number;
    total: number;
  };
  onClose: () => void;
  onSlotUpdated?: (slot: SlotItem, updatedSlots?: SlotItem[]) => void;
}

type KioskVoiceState = 'standby' | 'listening' | 'processing' | 'speaking' | 'confirming' | 'success' | 'error';

interface ActivityItem {
  id: string;
  timestamp: string;
  type: 'booking' | 'cancellation' | 'info' | 'clarification';
  spokenText: string;
  replyText: string;
  customerName?: string;
  time?: string;
}

export const CounterKioskMode: React.FC<CounterKioskModeProps> = ({
  visible,
  shopId,
  shopName,
  category,
  workingHoursStart,
  workingHoursEnd,
  slots,
  counts,
  onClose,
  onSlotUpdated,
}) => {
  const [voiceState, setVoiceState] = useState<KioskVoiceState>('standby');
  const [transcript, setTranscript] = useState<string>('');
  const [lastSpokenReply, setLastSpokenReply] = useState<string>('Counter Mode Active. Say "Slotify" or speak your booking command.');
  const [activeContext, setActiveContext] = useState<any>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState<boolean>(true);
  const [isMicPaused, setIsMicPaused] = useState<boolean>(false);
  const [language, setLanguage] = useState<'auto' | 'hi' | 'gu' | 'en'>('auto');
  const [activityHistory, setActivityHistory] = useState<ActivityItem[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Animation values
  const pulseRing1 = useRef(new Animated.Value(1)).current;
  const pulseRing2 = useRef(new Animated.Value(1)).current;
  const pulseRing3 = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const waveBars = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.7),
    new Animated.Value(0.5),
    new Animated.Value(0.9),
    new Animated.Value(0.4),
    new Animated.Value(0.8),
    new Animated.Value(0.6),
  ]).current;

  // Refs for state coordination across callbacks
  const recognitionRef = useRef<any>(null);
  const nativeSubscriptionsRef = useRef<any[]>([]);
  const isListeningActiveRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const activeContextRef = useRef<any>(null);
  const isKioskMountedRef = useRef<boolean>(false);
  const speechFallbackTimerRef = useRef<any>(null);

  activeContextRef.current = activeContext;

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ambient Ring Animation
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    let waveLoop: Animated.CompositeAnimation | null = null;

    if (voiceState === 'listening' || voiceState === 'confirming') {
      pulseRing1.setValue(1);
      pulseRing2.setValue(1);
      pulseRing3.setValue(1);

      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseRing1, {
              toValue: 1.35,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing1, {
              toValue: 1,
              duration: 900,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseRing2, {
              toValue: 1.65,
              duration: 1400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing2, {
              toValue: 1,
              duration: 1000,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseRing3, {
              toValue: 1.95,
              duration: 1600,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing3, {
              toValue: 1,
              duration: 1100,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animLoop.start();

      // Soundwave animation
      const barAnimations = waveBars.map((val, idx) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 0.2 + ((idx * 3) % 8) * 0.1,
              duration: 180 + idx * 30,
              useNativeDriver: false,
            }),
            Animated.timing(val, {
              toValue: 0.95 - ((idx * 2) % 4) * 0.1,
              duration: 220 + idx * 25,
              useNativeDriver: false,
            }),
          ])
        )
      );
      waveLoop = Animated.parallel(barAnimations);
      waveLoop.start();
    } else {
      pulseRing1.setValue(1);
      pulseRing2.setValue(1);
      pulseRing3.setValue(1);
      waveBars.forEach((bar) => bar.setValue(0.3));
    }

    return () => {
      if (animLoop) animLoop.stop();
      if (waveLoop) waveLoop.stop();
    };
  }, [voiceState]);

  // Keep Awake & Lifecycle
  useEffect(() => {
    isKioskMountedRef.current = visible;

    if (visible) {
      activateKeepAwakeAsync('counter-kiosk').catch(() => {});
      startAmbientListening();
    } else {
      stopAmbientListening();
      Speech.stop();
      deactivateKeepAwake('counter-kiosk').catch(() => {});
    }

    return () => {
      isKioskMountedRef.current = false;
      stopAmbientListening();
      Speech.stop();
      deactivateKeepAwake('counter-kiosk').catch(() => {});
    };
  }, [visible, language, isMicPaused]);

  // Speak assistant feedback aloud via Speaker, then resume listening!
  const speakAndResumeListening = useCallback(
    (textToSpeak: string, lang: 'hi' | 'gu' | 'en') => {
      if (!isKioskMountedRef.current) return;

      isSpeakingRef.current = true;
      stopAmbientListening();
      setVoiceState('speaking');

      if (!audioFeedbackEnabled) {
        // Silent mode: wait 1.2s then resume listening
        setTimeout(() => {
          isSpeakingRef.current = false;
          if (isKioskMountedRef.current && !isMicPaused) {
            startAmbientListening();
          }
        }, 1200);
        return;
      }

      try {
        Speech.stop();
        if (speechFallbackTimerRef.current) {
          clearTimeout(speechFallbackTimerRef.current);
        }

        const voiceLang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        const estimatedDurationMs = Math.max(1800, (textToSpeak.split(' ').length || 1) * 380);

        const onFinishedSpeaking = () => {
          if (!isSpeakingRef.current) return;
          isSpeakingRef.current = false;
          // 450ms room echo settling buffer so mic doesn't hear the speaker output
          setTimeout(() => {
            if (isKioskMountedRef.current && !isMicPaused) {
              startAmbientListening();
            }
          }, 450);
        };

        Speech.speak(textToSpeak, {
          language: voiceLang,
          pitch: 1.0,
          rate: 0.95,
          onDone: onFinishedSpeaking,
          onError: onFinishedSpeaking,
        });

        // Safety fallback timer in case onDone is not fired by OS
        speechFallbackTimerRef.current = setTimeout(onFinishedSpeaking, estimatedDurationMs + 800);
      } catch (err) {
        isSpeakingRef.current = false;
        setTimeout(() => {
          if (isKioskMountedRef.current && !isMicPaused) {
            startAmbientListening();
          }
        }, 600);
      }
    },
    [audioFeedbackEnabled, isMicPaused]
  );

  // Stop ambient listening
  const stopAmbientListening = useCallback(() => {
    isListeningActiveRef.current = false;

    if (Platform.OS === 'web') {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
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
  }, []);

  // Process finalized voice command
  const handleRecognizedCommand = useCallback(
    async (spokenText: string) => {
      const clean = (spokenText || '').trim();
      if (!clean) return;

      stopAmbientListening();
      setTranscript(clean);
      setVoiceState('processing');

      try {
        const response = await sendVoiceCommandApi(shopId, {
          text: clean,
          context: activeContextRef.current,
        });

        setLastSpokenReply(response.replyText || 'Command processed.');
        setActiveContext(response.context || null);

        // Record Activity Entry
        const activityItem: ActivityItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type:
            response.status === 'booked'
              ? 'booking'
              : response.status === 'cancelled'
              ? 'cancellation'
              : response.status === 'confirming'
              ? 'clarification'
              : 'info',
          spokenText: clean,
          replyText: response.replyText,
          customerName: response.extracted?.customerName,
          time: response.extracted?.time,
        };

        setActivityHistory((prev) => [activityItem, ...prev.slice(0, 9)]);

        if (response.status === 'booked' || response.status === 'cancelled') {
          setVoiceState('success');
          if (onSlotUpdated && response.updatedSlots) {
            onSlotUpdated(response.bookedSlot || response.cancelledSlot || ({} as any), response.updatedSlots);
          }
        } else if (response.status === 'confirming') {
          setVoiceState('confirming');
        } else if (response.status === 'error') {
          setVoiceState('error');
        } else {
          setVoiceState('standby');
        }

        // Announce reply aloud, then automatically resume listening!
        if (response.replyText) {
          speakAndResumeListening(response.replyText, response.language);
        } else {
          setTimeout(() => {
            if (isKioskMountedRef.current && !isMicPaused) {
              startAmbientListening();
            }
          }, 800);
        }
      } catch (err: any) {
        console.error('[Counter Kiosk] Command execution error:', err);
        const errMessage = err.response?.data?.error || err.message || 'Error processing voice command.';
        setLastSpokenReply(errMessage);
        setVoiceState('error');
        speakAndResumeListening(errMessage, 'en');
      }
    },
    [shopId, onSlotUpdated, speakAndResumeListening, stopAmbientListening]
  );

  // Start continuous ambient listening
  const startAmbientListening = useCallback(async () => {
    if (!isKioskMountedRef.current || isMicPaused || isSpeakingRef.current) return;

    stopAmbientListening();
    isListeningActiveRef.current = true;
    setVoiceState(activeContextRef.current ? 'confirming' : 'listening');

    const langCode =
      language === 'gu' ? 'gu-IN' : language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'hi-IN';

    // 1. Web Environment
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = langCode;
          recognition.continuous = true;
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

            const current = final || interim;
            if (current) {
              setTranscript(current);
            }

            if (final.trim()) {
              handleRecognizedCommand(final.trim());
            }
          };

          recognition.onerror = (e: any) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
              console.warn('[Counter Kiosk Web] Speech error:', e.error);
            }
          };

          recognition.onend = () => {
            // Auto-rearm listening loop if kiosk still active
            if (isListeningActiveRef.current && isKioskMountedRef.current && !isSpeakingRef.current && !isMicPaused) {
              setTimeout(startAmbientListening, 300);
            }
          };

          recognition.start();
        } catch (_) {}
      }
      return;
    }

    // 2. Native Mobile Environment (Android & iOS)
    try {
      if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.start === 'function') {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
          setLastSpokenReply('Microphone permission required for Hands-Free Counter Mode.');
          setVoiceState('error');
          return;
        }

        const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
          const spoken = event.results?.[0]?.transcript || '';
          if (spoken) {
            setTranscript(spoken);
          }
          if (event.isFinal && spoken.trim()) {
            handleRecognizedCommand(spoken.trim());
          }
        });

        const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
          if (event.error !== 'no-speech') {
            console.warn('[Counter Kiosk Mobile] Speech error:', event.error, event.message);
          }
          // Auto-rearm if session ended
          if (isListeningActiveRef.current && isKioskMountedRef.current && !isSpeakingRef.current && !isMicPaused) {
            setTimeout(startAmbientListening, 600);
          }
        });

        const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
          // Continuous loop: seamlessly restart listening!
          if (isListeningActiveRef.current && isKioskMountedRef.current && !isSpeakingRef.current && !isMicPaused) {
            setTimeout(startAmbientListening, 400);
          }
        });

        nativeSubscriptionsRef.current = [resultSub, errorSub, endSub];

        await ExpoSpeechRecognitionModule.start({
          lang: langCode,
          interimResults: true,
          continuous: false,
        });
      }
    } catch (err) {
      console.warn('[Counter Kiosk] Mobile listener init error:', err);
    }
  }, [isMicPaused, language, handleRecognizedCommand, stopAmbientListening]);

  // Color scheme based on active state
  const stateColor =
    voiceState === 'listening'
      ? '#34D399'
      : voiceState === 'processing'
      ? '#60A5FA'
      : voiceState === 'confirming'
      ? '#F59E0B'
      : voiceState === 'speaking'
      ? '#A78BFA'
      : voiceState === 'success'
      ? '#10B981'
      : voiceState === 'error'
      ? '#F87171'
      : '#64748B';

  const stateBadgeText =
    voiceState === 'listening'
      ? '● LISTENING (HANDS-FREE)'
      : voiceState === 'processing'
      ? '⚡ UNDERSTANDING INTENT...'
      : voiceState === 'confirming'
      ? '❓ WAITING FOR VERBAL CONFIRMATION'
      : voiceState === 'speaking'
      ? '🔊 ANNOUNCING UPDATE'
      : voiceState === 'success'
      ? '✓ ACTION COMPLETED'
      : voiceState === 'error'
      ? '⚠️ ATTENTION NEEDED'
      : 'STANDBY';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Dynamic Ambient Background Glow */}
        <View style={styles.backdropMesh}>
          <View style={[styles.ambientOrb, { backgroundColor: stateColor, opacity: 0.18 }]} />
          <View style={[styles.ambientOrbSecondary, { backgroundColor: '#6366F1', opacity: 0.12 }]} />
        </View>

        {/* 1. TOP KIOSK HEADER: Digital Clock, Live Shop Badge, Exit */}
        <View style={styles.kioskHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.clockRow}>
              <Text style={styles.digitalClockText}>{currentTime}</Text>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
            <View style={styles.shopMetaRow}>
              <View style={[styles.liveDot, { backgroundColor: stateColor }]} />
              <Text style={styles.shopNameText}>{shopName}</Text>
              <Text style={styles.hoursBadge}>
                {workingHoursStart}–{workingHoursEnd}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Audio Feedback Toggle */}
            <TouchableOpacity
              style={[styles.kioskPillBtn, audioFeedbackEnabled && styles.kioskPillBtnActive]}
              onPress={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
              activeOpacity={0.8}
            >
              <Text style={styles.kioskPillIcon}>{audioFeedbackEnabled ? '🔊' : '🔇'}</Text>
              <Text style={styles.kioskPillLabel}>Voice: {audioFeedbackEnabled ? 'ON' : 'MUTE'}</Text>
            </TouchableOpacity>

            {/* Mic Pause/Resume Toggle */}
            <TouchableOpacity
              style={[styles.kioskPillBtn, isMicPaused && styles.kioskPillBtnWarning]}
              onPress={() => setIsMicPaused(!isMicPaused)}
              activeOpacity={0.8}
            >
              <Text style={styles.kioskPillIcon}>{isMicPaused ? '⏸️' : '🎙️'}</Text>
              <Text style={styles.kioskPillLabel}>{isMicPaused ? 'PAUSED' : 'ACTIVE'}</Text>
            </TouchableOpacity>

            {/* Exit Counter Mode */}
            <TouchableOpacity style={styles.exitBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.exitBtnText}>✕ Exit Kiosk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Quick Rail */}
        <View style={styles.langRail}>
          <Text style={styles.langRailTitle}>Listening Language:</Text>
          {(['auto', 'hi', 'gu', 'en'] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.langChip, language === l && styles.langChipActive]}
              onPress={() => setLanguage(l)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langChipText, language === l && styles.langChipTextActive]}>
                {l === 'auto' ? '⚡ Auto Detect' : l === 'hi' ? '🇮🇳 Hindi (हिंदी)' : l === 'gu' ? '🌾 Gujarati (ગુજરાતી)' : '🌐 English'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 2. HERO: Ambient Glowing Voice Pulsar & Real-Time Waveform */}
          <View style={styles.heroSection}>
            <View style={styles.orbWrapper}>
              {/* Outer Pulsing Rings */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: stateColor,
                    transform: [{ scale: pulseRing3 }],
                    opacity: 0.18,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: stateColor,
                    transform: [{ scale: pulseRing2 }],
                    opacity: 0.35,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: stateColor,
                    transform: [{ scale: pulseRing1 }],
                    opacity: 0.55,
                  },
                ]}
              />

              {/* Center Core Button */}
              <View style={[styles.orbCore, { borderColor: stateColor }]}>
                <Text style={styles.orbCoreIcon}>
                  {voiceState === 'confirming'
                    ? '❓'
                    : voiceState === 'speaking'
                    ? '🔊'
                    : voiceState === 'processing'
                    ? '⚡'
                    : voiceState === 'success'
                    ? '✓'
                    : '🎙️'}
                </Text>
              </View>
            </View>

            {/* Status Badge */}
            <View style={[styles.stateBadge, { borderColor: stateColor }]}>
              <Text style={[styles.stateBadgeText, { color: stateColor }]}>{stateBadgeText}</Text>
            </View>

            {/* Audio Waveform Bars */}
            <View style={styles.waveformContainer}>
              {waveBars.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      backgroundColor: stateColor,
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 42],
                      }),
                    },
                  ]}
                />
              ))}
            </View>

            {/* Live Spoken Transcription Display */}
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>
                {transcript ? 'HEARD SPOKEN INPUT:' : 'HANDS-FREE AMBIENT LISTENING ACTIVE'}
              </Text>
              <Text style={styles.transcriptText}>
                {transcript ? `“${transcript}”` : 'Say "Slotify" or speak your booking out loud...'}
              </Text>
            </View>

            {/* Assistant Voice Response Card */}
            <View style={styles.assistantResponseCard}>
              <View style={styles.assistantCardHeader}>
                <Text style={styles.assistantIcon}>🤖</Text>
                <Text style={styles.assistantTitle}>SLOTIFY VOICE ASSISTANT</Text>
              </View>
              <Text style={styles.assistantSpeechText}>{lastSpokenReply}</Text>

              {voiceState === 'confirming' && (
                <View style={styles.confirmPromptBox}>
                  <Text style={styles.confirmPromptEmoji}>🗣️</Text>
                  <Text style={styles.confirmPromptText}>
                    Bina phone chhue sirf bole: <Text style={{ color: '#FDE047', fontWeight: '800' }}>“Haan”</Text> ya <Text style={{ color: '#FDE047', fontWeight: '800' }}>“Kar do”</Text> confirm karne ke liye!
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 3. GLANCEABLE SCHEDULE STRIP (Glance from 10 feet away) */}
          <View style={styles.scheduleStripSection}>
            <View style={styles.stripHeaderRow}>
              <Text style={styles.stripTitle}>TODAY'S LIVE TIMELINE</Text>
              <View style={styles.countsPill}>
                <Text style={styles.countItem}>
                  <Text style={{ color: '#34D399', fontWeight: '800' }}>{counts.available}</Text> Free
                </Text>
                <Text style={styles.countDivider}>•</Text>
                <Text style={styles.countItem}>
                  <Text style={{ color: '#F87171', fontWeight: '800' }}>{counts.booked}</Text> Booked
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotsRail}>
              {slots.map((slot) => {
                const isBooked = slot.status === 'booked';
                const isClosed = slot.status === 'closed';
                return (
                  <View
                    key={slot.id}
                    style={[
                      styles.slotMiniCard,
                      isBooked && styles.slotMiniCardBooked,
                      isClosed && styles.slotMiniCardClosed,
                    ]}
                  >
                    <Text style={styles.slotMiniTime}>{slot.start}</Text>
                    <View
                      style={[
                        styles.slotMiniIndicator,
                        isBooked
                          ? { backgroundColor: '#F87171' }
                          : isClosed
                          ? { backgroundColor: '#64748B' }
                          : { backgroundColor: '#34D399' },
                      ]}
                    />
                    <Text style={styles.slotMiniStatus} numberOfLines={1}>
                      {isBooked ? slot.customerName || 'Booked' : isClosed ? 'Break' : 'Open'}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. RECENT VOICE ACTIONS AUDIT LOG */}
          <View style={styles.activitySection}>
            <Text style={styles.activityTitle}>RECENT VOICE COMMANDS</Text>
            {activityHistory.length === 0 ? (
              <View style={styles.emptyActivityBox}>
                <Text style={styles.emptyActivityText}>
                  No voice commands yet this session. Speak into the room to test!
                </Text>
              </View>
            ) : (
              activityHistory.map((item) => (
                <View key={item.id} style={styles.activityItemCard}>
                  <View style={styles.activityItemTop}>
                    <Text style={styles.activityTypeBadge}>
                      {item.type === 'booking' ? '✓ BOOKED' : item.type === 'cancellation' ? '✕ CANCELLED' : '💬 INFO'}
                    </Text>
                    <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
                  </View>
                  <Text style={styles.activitySpoken}>🗣️ “{item.spokenText}”</Text>
                  <Text style={styles.activityReply}>🤖 {item.replyText}</Text>
                </View>
              ))
            )}
          </View>

          {/* 5. HANDS-FREE VOICE CHEAT SHEET TIPS */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsHeader}>💡 WHAT YOU CAN SAY OUT LOUD (HINDI / GUJARATI / ENGLISH):</Text>
            <View style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipHighlight}>“Aaj 4:15 ka Raj ka slot book kar do”</Text> (Instant Booking)
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipHighlight}>“Shaam 6 baje ka booking cancel karo”</Text> (Cancellation)
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipHighlight}>“Aaje 5 vagye Amit nu slot kari aapo”</Text> (Gujarati Support)
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Text style={styles.tipDot}>•</Text>
              <Text style={styles.tipText}>
                <Text style={styles.tipHighlight}>“Abhi kitne slots khali hain?”</Text> (Schedule Check)
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06090F',
  },
  backdropMesh: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    top: '15%',
    left: '20%',
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  ambientOrbSecondary: {
    position: 'absolute',
    bottom: '20%',
    right: '15%',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  kioskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(10, 15, 29, 0.85)',
  },
  headerLeft: {
    flex: 1,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  digitalClockText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  shopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shopNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  hoursBadge: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kioskPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  kioskPillBtnActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    borderColor: '#A78BFA',
  },
  kioskPillBtnWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  kioskPillIcon: {
    fontSize: 12,
  },
  kioskPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  exitBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
  },
  langRail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(6, 9, 15, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  langRailTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  langChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  orbWrapper: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  orbCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0F172A',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  orbCoreIcon: {
    fontSize: 42,
  },
  stateBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    marginBottom: 16,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: 6,
    marginBottom: 20,
  },
  waveformBar: {
    width: 5,
    borderRadius: 3,
  },
  transcriptCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#64748B',
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  assistantResponseCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderRadius: 16,
    padding: 16,
  },
  assistantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  assistantIcon: {
    fontSize: 14,
  },
  assistantTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C4B5FD',
    letterSpacing: 0.8,
  },
  assistantSpeechText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E7FF',
    lineHeight: 22,
  },
  confirmPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  confirmPromptEmoji: {
    fontSize: 16,
  },
  confirmPromptText: {
    fontSize: 13,
    color: '#FEF08A',
    flex: 1,
    lineHeight: 18,
  },
  scheduleStripSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stripHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stripTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  countsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  countItem: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  countDivider: {
    color: '#475569',
    fontSize: 10,
  },
  slotsRail: {
    gap: 8,
  },
  slotMiniCard: {
    width: 82,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    alignItems: 'center',
  },
  slotMiniCardBooked: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(69, 10, 10, 0.35)',
  },
  slotMiniCardClosed: {
    borderColor: 'rgba(100, 116, 139, 0.2)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  slotMiniTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  slotMiniIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  slotMiniStatus: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyActivityBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyActivityText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  activityItemCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  activityTimestamp: {
    fontSize: 10,
    color: '#64748B',
  },
  activitySpoken: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
    marginBottom: 3,
  },
  activityReply: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tipsSection: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tipsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  tipDot: {
    fontSize: 14,
    color: '#38BDF8',
    lineHeight: 18,
  },
  tipText: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
    lineHeight: 18,
  },
  tipHighlight: {
    color: '#F1F5F9',
    fontWeight: '700',
  },
});

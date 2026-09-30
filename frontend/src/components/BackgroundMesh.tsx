import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

/**
 * Premium Architectural Studio Backdrop
 * Replaces childish circular drifting bubbles with an ultra-sleek,
 * Apple/Linear-inspired dark canvas featuring ambient top spotlighting
 * and delicate technical grid accents.
 */
export const BackgroundMesh: React.FC = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep Obsidian Canvas */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#070A12' }]} />

      {/* Top Ambient Studio Lighting Spotlight */}
      <LinearGradient
        colors={[
          'rgba(30, 41, 68, 0.65)',
          'rgba(17, 24, 39, 0.4)',
          'rgba(7, 10, 18, 0.95)',
          '#070A12',
        ]}
        locations={[0, 0.25, 0.6, 1]}
        style={[StyleSheet.absoluteFill, { height: height * 0.75 }]}
      />

      {/* Subtle Electric Indigo Horizon Line Glow */}
      <LinearGradient
        colors={['transparent', 'rgba(99, 102, 241, 0.12)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.horizonBeam}
      />

      {/* Subtle Micro Geometric Technical Grid Lines */}
      <View style={styles.gridOverlay}>
        <View style={[styles.gridLineV, { left: width * 0.18 }]} />
        <View style={[styles.gridLineV, { left: width * 0.5 }]} />
        <View style={[styles.gridLineV, { left: width * 0.82 }]} />
        
        <View style={[styles.gridLineH, { top: 90 }]} />
        <View style={[styles.gridLineH, { top: 220 }]} />
        <View style={[styles.gridLineH, { top: 480 }]} />
        <View style={[styles.gridLineH, { top: 720 }]} />
      </View>

      {/* Vignette Edge Shading */}
      <LinearGradient
        colors={['rgba(7, 10, 18, 0)', 'rgba(7, 10, 18, 0.7)']}
        style={[StyleSheet.absoluteFill]}
        start={{ x: 0.5, y: 0.7 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  horizonBeam: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    height: 1.5,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },

  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});

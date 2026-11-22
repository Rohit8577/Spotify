import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { usePlayer } from '../context/PlayerContext';
import { aiApi } from '../api/aiApi';

const FREQUENCIES = ['60Hz', '170Hz', '350Hz', '1kHz', '3kHz', '10kHz'];

const PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0],
  'Bass Boost': [10, 8, 3, 0, 0, 2],
  Vocal: [-2, -1, 3, 6, 4, 2],
  Rock: [5, 3, -2, 4, 6, 8],
  Electronic: [6, 4, 1, 2, 5, 7],
};

export const EqualizerModal = () => {
  const {
    currentSong,
    eqValues,
    eqGenre,
    updateEqSettings,
    isEqualizerVisible,
    setIsEqualizerVisible,
  } = usePlayer();

  const [loadingAi, setLoadingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSliderChange = (val, index) => {
    const updated = [...eqValues];
    updated[index] = Math.round(val);
    updateEqSettings(updated, 'Custom');
  };

  const handleApplyPreset = (presetName) => {
    const vals = PRESETS[presetName];
    if (vals) {
      updateEqSettings(vals, presetName);
      setStatusMessage(`Suggested preset: ${presetName}`);
    }
  };

  const handleAiAutoTune = async () => {
    if (!currentSong) return;
    setLoadingAi(true);
    setStatusMessage('Analyzing song audio profile...');
    try {
      const res = await aiApi.getAiEq(currentSong.title, currentSong.artist);
      if (res.success && Array.isArray(res.values)) {
        updateEqSettings(res.values, res.genre || 'AI Tuned');
        setStatusMessage(`Suggested settings: ${res.genre || 'Optimal'}`);
      } else {
        setStatusMessage('AI busy, please try again.');
      }
    } catch (e) {
      setStatusMessage('Failed to tune with AI');
    } finally {
      setLoadingAi(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <Modal
      visible={isEqualizerVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsEqualizerVisible(false)}
    >
      <View style={styles.overlay}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Equalizer Suggestions</Text>
              <Text style={styles.subtitle}>
                Profile: <Text style={styles.activeGenre}>{eqGenre}</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEqualizerVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle-outline" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* AI Auto-Tune Button */}
          <Text style={styles.subtitle}>Apply these suggestions in your device equalizer. These sliders do not change playback audio.</Text>
          <TouchableOpacity
            style={[styles.aiButton, loadingAi && styles.aiButtonDisabled]}
            onPress={handleAiAutoTune}
            disabled={loadingAi}
            activeOpacity={0.8}
          >
            {loadingAi ? (
              <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="sparkles" size={18} color="#000" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.aiButtonText}>
              {loadingAi ? 'AI Sound Engineer Tuning...' : 'AI Auto-Tune EQ for Current Song'}
            </Text>
          </TouchableOpacity>

          {statusMessage ? (
            <Text style={styles.statusText}>{statusMessage}</Text>
          ) : null}

          {/* Sliders Container */}
          <View style={styles.slidersRow}>
            {FREQUENCIES.map((freq, idx) => {
              const val = eqValues[idx] || 0;
              return (
                <View key={freq} style={styles.sliderCol}>
                  <Text style={styles.valText}>{val > 0 ? `+${val}` : val}</Text>
                  <View style={styles.verticalSliderWrapper}>
                    <Slider
                      style={styles.verticalSlider}
                      minimumValue={-12}
                      maximumValue={12}
                      value={val}
                      step={1}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                      thumbTintColor={colors.text}
                      onValueChange={(v) => handleSliderChange(v, idx)}
                    />
                  </View>
                  <Text style={styles.freqText}>{freq}</Text>
                </View>
              );
            })}
          </View>

          {/* Presets Pills */}
          <Text style={styles.presetsHeader}>PRESETS</Text>
          <View style={styles.presetsRow}>
            {Object.keys(PRESETS).map((p) => {
              const isActive = eqGenre === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  onPress={() => handleApplyPreset(p)}
                >
                  <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reset button */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => handleApplyPreset('Flat')}
          >
            <Text style={styles.resetBtnText}>Reset to Flat Profile</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeGenre: {
    color: colors.primary,
    fontWeight: '600',
  },
  aiButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
  slidersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 180,
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  sliderCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 48,
  },
  valText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  verticalSliderWrapper: {
    height: 120,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalSlider: {
    width: 120,
    height: 40,
    transform: [{ rotate: '-90deg' }],
  },
  freqText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
  },
  presetsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
  },
  presetText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#000',
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});

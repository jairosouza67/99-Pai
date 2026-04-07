import React from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';

interface VoiceButtonProps {
  onPress: () => void;
  isListening: boolean;
  size?: number;
}

export const VoiceButton = ({ onPress, isListening, size = 72 }: VoiceButtonProps) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, { width: size, height: size, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      <Animated.View
        style={[
          styles.innerCircle,
          { transform: [{ scale: pulseAnim }] },
          isListening && styles.listening,
        ]}
      >
        <Ionicons name="mic" size={size / 2} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listening: {
    backgroundColor: colors.accent,
  },
});
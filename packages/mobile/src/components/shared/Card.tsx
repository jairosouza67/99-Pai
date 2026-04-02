import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
}

export const Card = ({ children, style, onPress, elevated = true }: CardProps) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[styles.card, elevated && styles.elevated, style]}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
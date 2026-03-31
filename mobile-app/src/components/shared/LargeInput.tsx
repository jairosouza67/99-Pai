import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface LargeInputProps extends TextInputProps {
  label: string;
  error?: string;
  minHeight?: number;
}

export const LargeInput = ({
  label,
  error,
  minHeight = 56,
  value,
  onChangeText,
  ...props
}: LargeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {Boolean(isFocused || value) && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { minHeight, borderColor: error ? colors.error : isFocused ? colors.primary : colors.border },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={!isFocused && !value ? label : ''}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {Boolean(error) && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  input: {
    fontSize: 20,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  error: {
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const colors = {
  primary: '#E53935',
  accent: '#FF9800',
  secondary: '#E91E63',
  success: '#43A047',
  info: '#1E88E5',
  warning: '#FDD835',
  error: '#C62828',
  background: '#FAFAF5',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#4A4A4A',
  disabled: '#9E9E9E',
  border: '#E0E0E0',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    accent: colors.accent,
    secondary: colors.secondary,
    error: colors.error,
    background: colors.background,
    surface: colors.surface,
    text: colors.textPrimary,
    onSurface: colors.textPrimary,
    outline: colors.border,
  },
  fonts: {
    ...DefaultTheme.fonts,
    displayLarge: {
      fontFamily: 'System',
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
    },
    displayMedium: {
      fontFamily: 'System',
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    headlineLarge: {
      fontFamily: 'System',
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 36,
    },
    headlineMedium: {
      fontFamily: 'System',
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    bodyLarge: {
      fontFamily: 'System',
      fontSize: 20,
      fontWeight: '400' as const,
      lineHeight: 28,
    },
    bodyMedium: {
      fontFamily: 'System',
      fontSize: 18,
      fontWeight: '400' as const,
      lineHeight: 26,
    },
    labelLarge: {
      fontFamily: 'System',
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 28,
    },
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
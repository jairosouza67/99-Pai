import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>99por1</Text>
        <Text style={styles.subtitle}>Seu assistente de cuidado</Text>
        <View style={styles.buttonContainer}>
          <LargeButton
            title="Sou Idoso(a)"
            onPress={() => router.push('/auth/elderly-login')}
            backgroundColor={colors.primary}
            style={styles.button}
          />
          <LargeButton
            title="Sou Cuidador(a)"
            onPress={() => router.push('/auth/caregiver-login')}
            backgroundColor={colors.info}
            style={styles.button}
          />
          <LargeButton
            title="Sou Prestador(a)"
            onPress={() => router.push('/auth/provider-login')}
            backgroundColor={colors.success}
            style={styles.button}
          />
          <LargeButton
            title="Sou Admin"
            onPress={() => router.push('/auth/admin-login')}
            backgroundColor={colors.textPrimary}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 20,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
});
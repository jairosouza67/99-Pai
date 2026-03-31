import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.('Tem certeza que deseja sair?') ?? true;
      if (confirmed) {
        logout()
          .then(() => router.replace('/auth/role-select'))
          .catch(() => Alert.alert('Erro', 'Nao foi possivel fazer logout. Tente novamente.'));
      }
      return;
    }

    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/role-select');
            } catch {
              Alert.alert('Erro', 'Nao foi possivel fazer logout. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel Administrativo</Text>
        <Ionicons
          name="log-out-outline"
          size={28}
          color={colors.error}
          onPress={handleLogout}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Bem-vindo, {user?.name}</Text>
        <Text style={styles.description}>
          Painel administrativo em desenvolvimento.
        </Text>
      </View>

      <View style={styles.footer}>
        <LargeButton
          title="Voltar"
          onPress={() => router.back()}
          backgroundColor="#757575"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});

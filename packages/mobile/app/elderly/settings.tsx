import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { Card } from '../../src/components/shared/Card';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { ElderlyProfile } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ElderlySettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const loadProfile = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('elderlyprofile')
        .select('*')
        .eq('userId', user.legacyId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setProfile(data as ElderlyProfile ?? null);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const performLogout = async () => {
    try {
      console.log('Logout iniciado...');
      await logout();
      console.log('Logout concluído, navegação automática será feita pelo layout');
      // A navegação é automática pelo _layout.tsx quando user fica null
    } catch (error: any) {
      console.error('Erro no logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm?.('Tem certeza que deseja sair?') ?? true;
      if (confirmed) {
        performLogout();
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
          onPress: () => {
            // Chamar função async separadamente para evitar problemas com Alert
            performLogout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajustes</Text>

        <Card style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Som do Assistente</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: colors.disabled, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {profile?.linkCode && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Código de Vinculação</Text>
            <Text style={styles.linkCode}>{profile.linkCode}</Text>
            <Text style={styles.infoText}>
              Compartilhe este código com seu cuidador para vincular a conta
            </Text>
          </Card>
        )}

        <View style={styles.footer}>
          <LargeButton
            title="Voltar"
            onPress={() => router.back()}
            backgroundColor="#757575"
            style={styles.button}
          />
          <LargeButton
            title="Sair"
            onPress={handleLogout}
            backgroundColor={colors.surface}
            textColor={colors.error}
            style={styles.logoutButton}
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
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  settingCard: {
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  settingLabel: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  linkCode: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginVertical: spacing.md,
    letterSpacing: 4,
  },
  infoText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  logoutButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: colors.error,
  },
});
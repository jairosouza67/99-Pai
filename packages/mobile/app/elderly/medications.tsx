import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { Card } from '../../src/components/shared/Card';
import { useVoice } from '../../src/hooks/useVoice';
import { TodayMedication } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ElderlyMedicationsScreen() {
  const router = useRouter();
  const { speak } = useVoice();
  const { user } = useAuth();
  const [medications, setMedications] = useState<TodayMedication[]>([]);

  const loadMedications = async () => {
    try {
      if (!user?.id) return;

      // Get elderly profile
      const { data: profile, error: profileError } = await supabase
        .from('elderlyprofile')
        .select('id')
        .eq('userId', user.legacyId)
        .single();

      if (profileError || !profile) {
        console.error('Error loading profile:', profileError);
        return;
      }

      // Get today's medications (active ones)
      const { data: medsData, error: medsError } = await supabase
        .from('medication')
        .select('*')
        .eq('elderlyProfileId', profile.id)
        .eq('active', true)
        .order('time', { ascending: true });

      if (medsError) {
        throw new Error(medsError.message);
      }

      // Get today's medication history
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: historyData, error: historyError } = await supabase
        .from('medicationhistory')
        .select('*')
        .eq('elderlyProfileId', profile.id)
        .eq('scheduledDate', todayStr);

      if (historyError) {
        throw new Error(historyError.message);
      }

      // Combine medications with their history status
      const items = (medsData || []).map((med) => {
        const history = (historyData || []).find(
          (h) => h.medicationId === med.id
        );
        const status: 'pending' | 'confirmed' | 'missed' = history
          ? (history.confirmed ? 'confirmed' : 'missed')
          : 'pending';

        return {
          id: med.id,
          name: med.name,
          time: med.time,
          dosage: med.dosage,
          status,
          historyId: history?.id ?? null,
        } as TodayMedication;
      });

      setMedications(items);

      const pending = items.filter((m) => m.status === 'pending');
      if (pending?.length > 0) {
        const medList = pending.map((m) => `${m?.name} de ${m?.time}`).join(', ');
        speak(`Você tem ${pending.length} remédio${pending.length > 1 ? 's' : ''} pendente${pending.length > 1 ? 's' : ''}: ${medList}`);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMedications();
    }, [])
  );

  const handleConfirm = async (medication: TodayMedication) => {
    try {
      if (!user?.id) return;

      // Get elderly profile
      const { data: profile, error: profileError } = await supabase
        .from('elderlyprofile')
        .select('id')
        .eq('userId', user.legacyId)
        .single();

      if (profileError || !profile) {
        Alert.alert('Erro', 'Não foi possível confirmar');
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Upsert medication history: if history exists, update it; otherwise insert
      if (medication.historyId) {
        const { error: updateError } = await supabase
          .from('medicationhistory')
          .update({
            confirmed: true,
            respondedAt: new Date().toISOString(),
          })
          .eq('id', medication.historyId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase
          .from('medicationhistory')
          .insert({
            medicationId: medication.id,
            elderlyProfileId: profile.id,
            confirmed: true,
            scheduledDate: todayStr,
            respondedAt: new Date().toISOString(),
            caregiverNotified: false,
            retryCount: 0,
          });

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      speak('Ótimo!');
      loadMedications();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível confirmar');
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'confirmed') return <Ionicons name="checkmark-circle" size={32} color={colors.success} />;
    if (status === 'missed') return <Ionicons name="close-circle" size={32} color={colors.error} />;
    return <Ionicons name="time" size={32} color={colors.accent} />;
  };

  const renderMedication = ({ item }: { item: TodayMedication }) => (
    <Card style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDetails}>
            {item.time} - {item.dosage}
          </Text>
        </View>
        {getStatusIcon(item.status)}
      </View>
      {item.status === 'pending' && (
        <LargeButton
          title="Tomou?"
          onPress={() => handleConfirm(item)}
          backgroundColor={colors.success}
          style={styles.confirmButton}
        />
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seus Remédios de Hoje</Text>
      </View>

      <FlatList
        data={medications}
        renderItem={renderMedication}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum remédio cadastrado</Text>
        }
      />

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
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  medicationCard: {
    minHeight: 80,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  medicationDetails: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  confirmButton: {
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  footer: {
    padding: spacing.lg,
  },
});
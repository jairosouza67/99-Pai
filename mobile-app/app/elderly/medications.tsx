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
import { api } from '../../src/services/api';

export default function ElderlyMedicationsScreen() {
  const router = useRouter();
  const { speak } = useVoice();
  const [medications, setMedications] = useState<TodayMedication[]>([]);

  const loadMedications = async () => {
    try {
      const response = await api.get('/medications/today');
      const items = (response.data?.items || []) as TodayMedication[];
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
      await api.post(`/medications/${medication.id}/confirm`, {
        confirmed: true,
      });
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
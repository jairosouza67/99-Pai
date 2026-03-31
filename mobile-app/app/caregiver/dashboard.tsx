import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { LargeInput } from '../../src/components/shared/LargeInput';
import { Card } from '../../src/components/shared/Card';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { ElderlyProfileSummary } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function CaregiverDashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [elderlyList, setElderlyList] = useState<ElderlyProfileSummary[]>([]);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const loadElderlyList = async () => {
    try {
      const response = await api.get('/caregiver/elderly');
      setElderlyList(response.data?.items || []);
    } catch (error) {
      console.error('Error loading elderly list:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadElderlyList();
    }, [])
  );

  const handleLink = async () => {
    if (!linkCode || linkCode.length !== 6) {
      Alert.alert('Erro', 'Digite um código válido de 6 dígitos');
      return;
    }

    setIsLinking(true);
    try {
      await api.post('/caregiver/link', { linkCode: linkCode.toUpperCase() });
      Alert.alert('Sucesso', 'Idoso vinculado com sucesso!');
      setLinkModalVisible(false);
      setLinkCode('');
      loadElderlyList();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Código inválido');
    } finally {
      setIsLinking(false);
    }
  };

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

  const renderElderly = ({ item }: { item: ElderlyProfileSummary }) => (
    <Card
      onPress={() => router.push(`/caregiver/elderly/${item?.id}`)}
      style={styles.elderlyCard}
    >
      <View style={styles.elderlyHeader}>
        <Text style={styles.elderlyName}>{item?.preferredName}</Text>
        {item?.hasAlert && (
          <Ionicons name="alert-circle" size={24} color={colors.error} />
        )}
      </View>
      <View style={styles.elderlyStats}>
        <Text style={styles.statText}>
          Remédios: {item?.todayMedicationStats?.confirmed}/{item?.todayMedicationStats?.total}
        </Text>
        {item?.autonomyScore !== null && (
          <Text style={styles.statText}>
            Autonomia: {item.autonomyScore}%
          </Text>
        )}
      </View>
      {item?.lastInteraction && (
        <Text style={styles.lastInteraction}>
          Última interação: {new Date(item.lastInteraction).toLocaleString('pt-BR')}
        </Text>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Painel do Cuidador</Text>
        <Ionicons
          name="log-out-outline"
          size={28}
          color={colors.error}
          onPress={handleLogout}
        />
      </View>

      <View style={styles.actionBar}>
        <LargeButton
          title="Vincular Idoso"
          onPress={() => setLinkModalVisible(true)}
          backgroundColor={colors.info}
          minHeight={48}
          icon={<Ionicons name="add" size={24} color="#FFFFFF" />}
        />
      </View>

      <FlatList
        data={elderlyList}
        renderItem={renderElderly}
        keyExtractor={(item) => item?.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhum idoso vinculado. Clique em "Vincular Idoso" para começar.
          </Text>
        }
      />

      <Modal
        visible={linkModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vincular Idoso</Text>
            <Text style={styles.modalDescription}>
              Digite o código de 6 dígitos fornecido pelo idoso
            </Text>
            <LargeInput
              label="Código"
              value={linkCode}
              onChangeText={(text) => setLinkCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              minHeight={48}
            />
            <View style={styles.modalButtons}>
              <LargeButton
                title="Cancelar"
                onPress={() => {
                  setLinkModalVisible(false);
                  setLinkCode('');
                }}
                backgroundColor="#757575"
                minHeight={48}
                style={styles.modalButton}
              />
              <LargeButton
                title="Vincular"
                onPress={handleLink}
                backgroundColor={colors.info}
                minHeight={48}
                disabled={isLinking}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  elderlyCard: {
    minHeight: 100,
  },
  elderlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  elderlyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  elderlyStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  lastInteraction: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
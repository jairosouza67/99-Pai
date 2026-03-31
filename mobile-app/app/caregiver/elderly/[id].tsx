import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Modal, Alert, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import { LargeButton } from '../../../src/components/shared/LargeButton';
import { LargeInput } from '../../../src/components/shared/LargeInput';
import { Card } from '../../../src/components/shared/Card';
import { api } from '../../../src/services/api';
import { Medication, Contact, AgendaEvent, MedicationHistory } from '../../../src/types';
import { colors, spacing } from '../../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { DateTimePicker } from '../../../src/components/shared/DateTimePicker';

type Section = 'medications' | 'contacts' | 'agenda' | 'history';

export default function ElderlyDetailScreen() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams();
  const [currentSection, setCurrentSection] = useState<Section>('medications');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [history, setHistory] = useState<MedicationHistory[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Form states
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactThreshold, setContactThreshold] = useState('7');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);

  const loadData = async () => {
    if (!id) return;

    try {
      if (currentSection === 'medications') {
        const response = await api.get(`/elderly/${id}/medications`);
        setMedications(response.data?.items || []);
      } else if (currentSection === 'contacts') {
        const response = await api.get(`/elderly/${id}/contacts`);
        setContacts(response.data?.items || []);
      } else if (currentSection === 'agenda') {
        const response = await api.get(`/elderly/${id}/agenda`);
        setAgenda(response.data?.items || []);
      } else if (currentSection === 'history') {
        const response = await api.get(`/elderly/${id}/medication-history`);
        setHistory(response.data?.items || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [currentSection, id])
  );

  const handleAddMedication = async () => {
    if (!medName || !medTime || !medDosage) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      await api.post(`/elderly/${id}/medications`, {
        name: medName,
        time: medTime,
        dosage: medDosage,
        active: true,
      });
      setAddModalVisible(false);
      resetForms();
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao adicionar remédio');
    }
  };

  const handleAddContact = async () => {
    if (!contactName || !contactPhone) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      await api.post(`/elderly/${id}/contacts`, {
        name: contactName,
        phone: contactPhone,
        thresholdDays: parseInt(contactThreshold) || 7,
      });
      setAddModalVisible(false);
      resetForms();
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao adicionar contato');
    }
  };

  const handleAddAgenda = async () => {
    if (!eventDescription || !eventDate) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      await api.post(`/elderly/${id}/agenda`, {
        description: eventDescription,
        dateTime: eventDate.toISOString(),
        reminder: true,
      });
      setAddModalVisible(false);
      resetForms();
      loadData();
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao adicionar evento');
    }
  };

  const handleDelete = async (type: Section, itemId: string) => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja excluir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const endpoint = type === 'agenda' ? 'agenda' : type;
              await api.delete(`/elderly/${id}/${endpoint}/${itemId}`);
              loadData();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const resetForms = () => {
    setMedName('');
    setMedTime('');
    setMedDosage('');
    setContactName('');
    setContactPhone('');
    setContactThreshold('7');
    setEventDescription('');
    setEventDate(undefined);
  };

  const renderAddModal = () => {
    let content;

    if (currentSection === 'medications') {
      content = (
        <>
          <LargeInput label="Nome do remédio" value={medName} onChangeText={setMedName} minHeight={48} />
          <LargeInput
            label="Horário (HH:mm)"
            value={medTime}
            onChangeText={setMedTime}
            placeholder="08:00"
            minHeight={48}
          />
          <LargeInput label="Dosagem" value={medDosage} onChangeText={setMedDosage} minHeight={48} />
          <LargeButton title="Adicionar" onPress={handleAddMedication} backgroundColor={colors.primary} minHeight={48} />
        </>
      );
    } else if (currentSection === 'contacts') {
      content = (
        <>
          <LargeInput label="Nome" value={contactName} onChangeText={setContactName} minHeight={48} />
          <LargeInput
            label="Telefone"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            minHeight={48}
          />
          <LargeInput
            label="Lembrar a cada (dias)"
            value={contactThreshold}
            onChangeText={setContactThreshold}
            keyboardType="number-pad"
            minHeight={48}
          />
          <LargeButton title="Adicionar" onPress={handleAddContact} backgroundColor={colors.info} minHeight={48} />
        </>
      );
    } else if (currentSection === 'agenda') {
      content = (
        <>
          <LargeInput label="Descrição" value={eventDescription} onChangeText={setEventDescription} minHeight={48} />
          <DateTimePicker
            value={eventDate}
            onChange={setEventDate}
            label="Data e Hora"
            placeholder="Selecione a data"
          />
          <LargeButton title="Adicionar" onPress={handleAddAgenda} backgroundColor={colors.warning} textColor={colors.textPrimary} minHeight={48} />
        </>
      );
    }

    return (
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddModalVisible(false);
          resetForms();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar {currentSection === 'medications' ? 'Remédio' : currentSection === 'contacts' ? 'Contato' : 'Evento'}</Text>
            {content}
            <LargeButton
              title="Cancelar"
              onPress={() => {
                setAddModalVisible(false);
                resetForms();
              }}
              backgroundColor="#757575"
              minHeight={48}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderMedication = ({ item }: { item: Medication }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item?.name}</Text>
          <Text style={styles.itemDetails}>
            {item?.time} - {item?.dosage}
          </Text>
        </View>
        <Ionicons
          name="trash-outline"
          size={24}
          color={colors.error}
          onPress={() => handleDelete('medications', item?.id)}
        />
      </View>
    </Card>
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item?.name}</Text>
          <Text style={styles.itemDetails}>
            {item?.phone} - Lembrar a cada {item?.thresholdDays} dias
          </Text>
        </View>
        <Ionicons
          name="trash-outline"
          size={24}
          color={colors.error}
          onPress={() => handleDelete('contacts', item?.id)}
        />
      </View>
    </Card>
  );

  const renderAgenda = ({ item }: { item: AgendaEvent }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item?.description}</Text>
          <Text style={styles.itemDetails}>
            {format(new Date(item?.dateTime ?? ''), 'dd/MM/yyyy HH:mm')}
          </Text>
        </View>
        <Ionicons
          name="trash-outline"
          size={24}
          color={colors.error}
          onPress={() => handleDelete('agenda', item?.id)}
        />
      </View>
    </Card>
  );

  const renderHistory = ({ item }: { item: MedicationHistory }) => (
    <Card style={styles.historyCard}>
      <View style={styles.historyRow}>
        <Ionicons
          name={item?.confirmed ? 'checkmark-circle' : 'close-circle'}
          size={24}
          color={item?.confirmed ? colors.success : colors.error}
        />
        <View style={styles.historyInfo}>
          <Text style={styles.historyName}>{item?.medicationName}</Text>
          <Text style={styles.historyDate}>
            {format(new Date(item?.timestamp ?? ''), 'dd/MM/yyyy HH:mm')}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderContent = () => {
    if (currentSection === 'medications') {
      return (
        <FlatList
          data={medications}
          renderItem={renderMedication}
          keyExtractor={(item) => item?.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum remédio cadastrado</Text>}
        />
      );
    } else if (currentSection === 'contacts') {
      return (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item?.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum contato cadastrado</Text>}
        />
      );
    } else if (currentSection === 'agenda') {
      return (
        <FlatList
          data={agenda}
          renderItem={renderAgenda}
          keyExtractor={(item) => item?.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum evento cadastrado</Text>}
        />
      );
    } else if (currentSection === 'history') {
      return (
        <FlatList
          data={history}
          renderItem={renderHistory}
          keyExtractor={(item) => item?.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum histórico</Text>}
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={28} color={colors.textPrimary} onPress={() => router.back()} />
        <Text style={styles.title}>Gerenciar Idoso</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        <LargeButton
          title="Remédios"
          onPress={() => setCurrentSection('medications')}
          backgroundColor={currentSection === 'medications' ? colors.primary : colors.disabled}
          minHeight={40}
          style={styles.tab}
          textStyle={{ fontSize: 16 }}
        />
        <LargeButton
          title="Contatos"
          onPress={() => setCurrentSection('contacts')}
          backgroundColor={currentSection === 'contacts' ? colors.info : colors.disabled}
          minHeight={40}
          style={styles.tab}
          textStyle={{ fontSize: 16 }}
        />
        <LargeButton
          title="Agenda"
          onPress={() => setCurrentSection('agenda')}
          backgroundColor={currentSection === 'agenda' ? colors.warning : colors.disabled}
          textColor={currentSection === 'agenda' ? colors.textPrimary : '#FFFFFF'}
          minHeight={40}
          style={styles.tab}
          textStyle={{ fontSize: 16 }}
        />
        <LargeButton
          title="Histórico"
          onPress={() => setCurrentSection('history')}
          backgroundColor={currentSection === 'history' ? colors.success : colors.disabled}
          minHeight={40}
          style={styles.tab}
          textStyle={{ fontSize: 16 }}
        />
      </ScrollView>

      {renderContent()}

      {currentSection !== 'history' && (
        <View style={styles.fab}>
          <Ionicons
            name="add-circle"
            size={64}
            color={colors.info}
            onPress={() => setAddModalVisible(true)}
          />
        </View>
      )}

      {renderAddModal()}
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabs: {
    maxHeight: 50,
    paddingHorizontal: spacing.md,
  },
  tab: {
    marginHorizontal: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  itemCard: {
    minHeight: 70,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyCard: {
    minHeight: 60,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
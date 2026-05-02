import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Linking, Alert, Platform, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { Card } from '../../src/components/shared/Card';
import { useVoice } from '../../src/hooks/useVoice';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { ContactWithStatus } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ElderlyContactsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak } = useVoice();
  const [contacts, setContacts] = useState<ContactWithStatus[]>([]);

  const loadContacts = async () => {
    try {
      if (!user?.id) return;

      // Fetch elderly profile to get elderlyProfileId
      const { data: profile, error: profileError } = await supabase
        .from('elderlyprofile')
        .select('id')
        .eq('userId', user.legacyId)
        .single();

      if (profileError || !profile) {
        console.error('Error loading profile:', profileError);
        return;
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from('contact')
        .select('*')
        .eq('elderlyProfileId', profile.id)
        .order('createdAt', { ascending: false });

      if (contactsError) {
        throw new Error(contactsError.message);
      }

      const items = (contactsData || []).map((c) => {
        const daysOverdue = c.lastCallAt
          ? Math.floor((Date.now() - new Date(c.lastCallAt).getTime()) / (1000 * 60 * 60 * 24))
          : c.thresholdDays;
        return {
          ...c,
          daysOverdue,
          isOverdue: daysOverdue >= c.thresholdDays,
        } as ContactWithStatus;
      });

      setContacts(items);

      const overdue = items.filter((c) => c.isOverdue);
      if (overdue.length > 0) {
        const first = overdue[0];
        speak(`Faz ${first.daysOverdue} dias que você não fala com ${first.name}. Quer ligar?`);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [])
  );

  const handleCall = async (contact: ContactWithStatus) => {
    try {
      const phoneNumber = `tel:${contact?.phone}`;

      const canOpen = await Linking.canOpenURL(phoneNumber);
      if (canOpen) {
        const now = new Date().toISOString();

        // Update contact's lastCallAt
        await supabase
          .from('contact')
          .update({ lastCallAt: now })
          .eq('id', contact.id);

        // Insert call history record
        await supabase
          .from('callhistory')
          .insert({
            contactId: contact.id,
            elderlyProfileId: contact.elderlyProfileId,
            calledAt: now,
          });

        await Linking.openURL(phoneNumber);
        loadContacts();
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o discador');
      }
    } catch (error) {
      console.error('Error calling contact:', error);
      Alert.alert('Erro', 'Não foi possível ligar');
    }
  };

  const renderContact = ({ item }: { item: ContactWithStatus }) => {
    const cardStyle: ViewStyle = item?.isOverdue 
      ? { ...styles.contactCard, ...styles.overdueCard }
      : styles.contactCard;
    
    return (
    <Card style={cardStyle}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item?.name}</Text>
        <Text style={styles.contactDetails}>
          Última ligação: {item?.daysOverdue} dias atrás
        </Text>
        {item?.isOverdue && (
          <Text style={styles.overdueText}>Ligar?</Text>
        )}
      </View>
      <Ionicons
        name="call"
        size={56}
        color={item?.isOverdue ? colors.accent : colors.info}
        onPress={() => handleCall(item)}
        style={styles.callIcon}
      />
    </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suas Pessoas</Text>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item?.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum contato cadastrado</Text>
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
  contactCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overdueCard: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactDetails: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  overdueText: {
    fontSize: 18,
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  callIcon: {
    marginLeft: spacing.md,
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
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { Card } from '../../src/components/shared/Card';
import { useVoice } from '../../src/hooks/useVoice';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { AgendaEvent } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

export default function ElderlyAgendaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak } = useVoice();
  const [events, setEvents] = useState<AgendaEvent[]>([]);

  const loadEvents = async () => {
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

      // Get today's agenda events
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: eventsData, error: eventsError } = await supabase
        .from('agendaevent')
        .select('*')
        .eq('elderlyProfileId', profile.id)
        .gte('dateTime', todayStr)
        .lt('dateTime', `${todayStr}T23:59:59`)
        .order('dateTime', { ascending: true });

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      const items = (eventsData || []) as AgendaEvent[];
      
      // Sort by time (already sorted by Supabase query)
      setEvents(items);

      if (items.length > 0) {
        const eventList = items.map((e) => {
          const time = format(new Date(e.dateTime), 'HH:mm', { locale: ptBR });
          return `Às ${time}, ${e.description}`;
        }).join('. ');
        speak(`Hoje você tem ${items.length} compromisso${items.length > 1 ? 's' : ''}. ${eventList}`);
      } else {
        speak('Você não tem compromissos hoje.');
      }
    } catch (error) {
      console.error('Error loading agenda:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  const renderEvent = ({ item }: { item: AgendaEvent }) => {
    const time = format(new Date(item?.dateTime ?? ''), 'HH:mm', { locale: ptBR });
    return (
      <Card style={styles.eventCard}>
        <View style={styles.eventContent}>
          <Text style={styles.eventTime}>{time}</Text>
          <Text style={styles.eventDescription}>{item?.description}</Text>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sua Agenda de Hoje</Text>
        <Text style={styles.date}>
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </Text>
      </View>

      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item?.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum compromisso hoje</Text>
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
  date: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  eventCard: {
    minHeight: 80,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  eventTime: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 70,
  },
  eventDescription: {
    flex: 1,
    fontSize: 20,
    color: colors.textPrimary,
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
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { Card } from '../../src/components/shared/Card';
import { useAuth } from '../../src/contexts/AuthContext';
import { useVoice } from '../../src/hooks/useVoice';
import { ElderlyProfile, WeatherData } from '../../src/types';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../src/lib/supabase';

export default function ElderlyHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { speak } = useVoice();
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const loadData = async () => {
    try {
      if (!user?.id) return;

      // Load profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('elderlyprofile')
        .select('*')
        .eq('userId', user.legacyId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      const profile = (profileData as ElderlyProfile | null) ?? null;

      // Weather via Edge Function
      let weatherData: WeatherData | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('weather-get', {
          body: {},
        });
        if (!error && data) {
          weatherData = data as WeatherData;
        }
      } catch {
        weatherData = null;
      }

      setProfile(profile);
      setWeather(weatherData);

      const greeting = `Olá ${profile?.preferredName || user?.name}. ${weatherData?.weatherDescription || ''}. ${weatherData?.clothingAdvice || ''}`;
      speak(greeting);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (profile?.onboardingComplete === false) {
      router.replace('/elderly/onboarding');
    }
  }, [profile, router]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.greeting}>
            Olá, {profile?.preferredName || user?.name}!
          </Text>
        </View>

        {weather && (
          <Card style={styles.weatherCard}>
            <Text style={styles.weatherTemp}>
              {weather.temperature}°{weather.temperatureUnit}
            </Text>
            <Text style={styles.weatherDescription}>
              {weather.weatherDescription}
            </Text>
            <Text style={styles.clothingAdvice}>
              {weather.clothingAdvice}
            </Text>
          </Card>
        )}

        <View style={styles.buttonGrid}>
          <LargeButton
            title="Remédios"
            onPress={() => router.push('/elderly/medications')}
            backgroundColor={colors.secondary}
            icon={<Ionicons name="medical" size={40} color="#FFFFFF" />}
            style={styles.gridButton}
            minHeight={120}
          />
          <LargeButton
            title="Agenda"
            onPress={() => router.push('/elderly/agenda')}
            backgroundColor={colors.warning}
            textColor={colors.textPrimary}
            icon={<Ionicons name="calendar" size={40} color={colors.textPrimary} />}
            style={styles.gridButton}
            minHeight={120}
          />
          <LargeButton
            title="Ligar"
            onPress={() => router.push('/elderly/contacts')}
            backgroundColor={colors.info}
            icon={<Ionicons name="call" size={40} color="#FFFFFF" />}
            style={styles.gridButton}
            minHeight={120}
          />
          <LargeButton
            title="Ajustes"
            onPress={() => router.push('/elderly/settings')}
            backgroundColor="#757575"
            icon={<Ionicons name="settings" size={40} color="#FFFFFF" />}
            style={styles.gridButton}
            minHeight={120}
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weatherCard: {
    backgroundColor: colors.warning,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weatherDescription: {
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  clothingAdvice: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridButton: {
    flex: 1,
    minWidth: '45%',
  },
});
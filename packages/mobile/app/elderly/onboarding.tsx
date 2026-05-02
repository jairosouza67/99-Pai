import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { LargeInput } from '../../src/components/shared/LargeInput';
import { VoiceButton } from '../../src/components/shared/VoiceButton';
import { useVoice } from '../../src/hooks/useVoice';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingStep = 'name' | 'phone' | 'activities' | 'mobility' | 'medication' | 'complete';

const questions = {
  name: 'Como posso te chamar?',
  phone: 'Você usa o celular sozinho?',
  activities: 'Você faz suas atividades do dia sozinho?',
  mobility: 'Você sai de casa sozinho?',
  medication: 'Você toma seus remédios sozinho?',
  complete: 'Pronto! Vou te ajudar todos os dias.',
};

const yesWords = ['sim', 'pode', 'claro', 'quero', 'ok'];
const noWords = ['não', 'nunca'];
const sometimesWords = ['às vezes', 'as vezes', 'às vez', 'à vezes'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak, startListening, stopListening, isListening, results } = useVoice();
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [phoneScore, setPhoneScore] = useState(0);
  const [activitiesScore, setActivitiesScore] = useState(0);
  const [mobilityScore, setMobilityScore] = useState(0);
  const [medicationScore, setMedicationScore] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);

  const currentQuestion = questions[step];

  useEffect(() => {
    speak(currentQuestion);
  }, [step]);

  useEffect(() => {
    if (results?.length > 0) {
      const answer = results[0]?.toLowerCase() ?? '';
      handleVoiceResponse(answer);
      stopListening();
    }
  }, [results]);

  const handleVoiceResponse = (answer: string) => {
    if (step === 'name') {
      setName(answer);
      nextStep();
      return;
    }

    if (answer.includes('repete')) {
      if (repeatCount < 2) {
        speak(currentQuestion);
        setRepeatCount(repeatCount + 1);
      } else {
        nextStep();
      }
      return;
    }

    const isYes = yesWords.some((word) => answer.includes(word));
    const isNo = noWords.some((word) => answer.includes(word));
    const isSometimes = sometimesWords.some((word) => answer.includes(word));

    if (isYes) handleChoice(3);
    else if (isSometimes) handleChoice(2);
    else if (isNo) handleChoice(1);
    else {
      if (repeatCount < 1) {
        speak('Não entendi. ' + currentQuestion);
        setRepeatCount(repeatCount + 1);
      } else {
        nextStep();
      }
    }
  };

  const handleChoice = (score: number) => {
    if (step === 'phone') setPhoneScore(score);
    else if (step === 'activities') setActivitiesScore(score);
    else if (step === 'mobility') setMobilityScore(score);
    else if (step === 'medication') setMedicationScore(score);

    setRepeatCount(0);
    nextStep();
  };

  const nextStep = () => {
    const stepOrder: OnboardingStep[] = ['name', 'phone', 'activities', 'mobility', 'medication', 'complete'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1] as OnboardingStep);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    const autonomyScore = Math.round(
      ((phoneScore + activitiesScore + mobilityScore + medicationScore) / 12) * 100
    );

    try {
      // Get elderly profile for the current user
      const { data: profile, error: profileError } = await supabase
        .from('elderlyprofile')
        .select('id')
        .eq('userId', user?.id ?? '')
        .single();

      if (profileError || !profile) {
        throw new Error(profileError?.message || 'Perfil não encontrado');
      }

      const { error } = await supabase
        .from('elderlyprofile')
        .update({
          preferredName: name || 'Amigo',
          autonomyScore,
          interactionTimes: ['08:00', '12:00', '16:00', '19:00'],
          onboardingComplete: true,
        })
        .eq('id', profile.id);

      if (error) {
        throw new Error(error.message);
      }

      speak('Tudo pronto! Bem-vindo ao 99por1.');
      setTimeout(() => {
        router.replace('/elderly/home');
      }, 2000);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert('Erro', 'Não foi possível completar o cadastro');
    }
  };

  const handleListenPress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const renderStepContent = () => {
    if (step === 'name') {
      return (
        <View style={styles.stepContent}>
          <LargeInput
            label="Como posso te chamar?"
            value={name}
            onChangeText={setName}
          />
          <LargeButton
            title="Confirmar"
            onPress={nextStep}
            backgroundColor={colors.success}
          />
        </View>
      );
    }

    if (step === 'complete') {
      return (
        <View style={styles.stepContent}>
          <LargeButton
            title="Começar"
            onPress={completeOnboarding}
            backgroundColor={colors.success}
          />
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <LargeButton
          title="Sim"
          onPress={() => handleChoice(3)}
          backgroundColor={colors.success}
        />
        <LargeButton
          title="Às Vezes"
          onPress={() => handleChoice(2)}
          backgroundColor={colors.accent}
        />
        <LargeButton
          title="Não"
          onPress={() => handleChoice(1)}
          backgroundColor={colors.error}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        {['name', 'phone', 'activities', 'mobility', 'medication', 'complete'].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s === step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>{currentQuestion}</Text>
        {renderStepContent()}
      </View>

      {step !== 'name' && (
        <View style={styles.voiceContainer}>
          <VoiceButton onPress={handleListenPress} isListening={isListening} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.disabled,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  stepContent: {
    gap: spacing.md,
  },
  voiceContainer: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { LargeInput } from '../../src/components/shared/LargeInput';
import { useAuth } from '../../src/contexts/AuthContext';
import { useVoice } from '../../src/hooks/useVoice';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ElderlyLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { speak } = useVoice();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    speak('Bem-vindo ao 99por1. Digite seu e-mail e senha para entrar.');
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/elderly/home');
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <LargeInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <LargeInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <LargeButton
          title="Entrar"
          onPress={handleLogin}
          backgroundColor={colors.primary}
          style={styles.button}
          disabled={isLoading}
        />

        <Text
          style={styles.link}
          onPress={() => router.push('/auth/elderly-signup')}
        >
          Criar conta
        </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  link: {
    fontSize: 18,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
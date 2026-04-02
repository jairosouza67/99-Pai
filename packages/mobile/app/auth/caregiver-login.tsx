import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LargeButton } from '../../src/components/shared/LargeButton';
import { LargeInput } from '../../src/components/shared/LargeInput';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, spacing } from '../../src/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CaregiverLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/caregiver/dashboard');
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
        <Text style={styles.title}>Cuidador</Text>

        <LargeInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          minHeight={48}
        />

        <LargeInput
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          minHeight={48}
        />

        <LargeButton
          title="Entrar"
          onPress={handleLogin}
          backgroundColor={colors.info}
          minHeight={48}
          style={styles.button}
          disabled={isLoading}
        />

        <Text
          style={styles.link}
          onPress={() => router.push('/auth/caregiver-signup')}
        >
          Criar conta de cuidador
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
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  link: {
    fontSize: 16,
    color: colors.info,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
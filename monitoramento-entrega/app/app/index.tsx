import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api, setToken } from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) {
      Alert.alert('Erro', 'Informe email e senha');
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(email, senha);
      setToken(result.token);
      await SecureStore.setItemAsync('auth_token', result.token);
      await SecureStore.setItemAsync('motorista_id', result.motorista.id);
      await SecureStore.setItemAsync('motorista_nome', result.motorista.nome);
      router.replace('/(app)/rota');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f172a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 }}>
          Dashboard Entrega
        </Text>
        <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 40 }}>
          Monitoramento de entregas
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            backgroundColor: '#1e293b', color: '#fff', borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12,
          }}
        />

        <TextInput
          placeholder="Senha"
          placeholderTextColor="#64748b"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          style={{
            backgroundColor: '#1e293b', color: '#fff', borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 24,
          }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#334155' : '#3b82f6',
            borderRadius: 12, paddingVertical: 14, alignItems: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

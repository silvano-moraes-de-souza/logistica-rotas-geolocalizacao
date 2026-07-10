import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { setToken } from '../../src/services/api';

export default function AppLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      router.replace('/');
      return;
    }
    setToken(token);
    setReady(true);
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="rota" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="entrega/[id]" />
    </Stack>
  );
}

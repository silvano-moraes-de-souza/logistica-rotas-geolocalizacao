import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase } from '../src/services/database';
import { startSync } from '../src/services/sync';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().then(() => {
      console.log('[DB] Local database ready');
      startSync();
    });
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

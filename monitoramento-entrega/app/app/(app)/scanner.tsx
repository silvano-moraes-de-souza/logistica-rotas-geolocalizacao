import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../../src/services/api';

type ScanTipo = 'saida' | 'chegada';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [tipo, setTipo] = useState<ScanTipo>('saida');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  async function handleScan(data: string) {
    if (scanning) return;
    setScanning(true);

    try {
      if (data.startsWith('VIAGEM:')) {
        const viagemId = data.replace('VIAGEM:', '');
        const lat = 0; // TODO: get from expo-location
        const lon = 0;
        await api.scanQR(viagemId, tipo, lat, lon);
        Alert.alert('Sucesso', `QR Code de ${tipo} registrado!`, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('QR Inválido', 'Este QR code não é válido para o sistema.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao registrar QR code');
    } finally {
      setScanning(false);
    }
  }

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>
          Permissão de câmera necessária
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#ffffff20', borderRadius: 8, padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Voltar</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>
            Escanear {tipo === 'saida' ? 'Saída' : 'Chegada'}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <CameraView
          style={{ width: 280, height: 280 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result: any) => handleScan(result.data)}
        >
          <View style={{
            flex: 1, borderWidth: 2, borderColor: '#3b82f6', margin: 16,
            borderRadius: 16, justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 14, opacity: 0.7 }}>Posicione o QR code aqui</Text>
          </View>
        </CameraView>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 32, gap: 16 }}>
        <TouchableOpacity
          onPress={() => setTipo('saida')}
          style={{
            backgroundColor: tipo === 'saida' ? '#3b82f6' : '#1e293b',
            borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Saída</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTipo('chegada')}
          style={{
            backgroundColor: tipo === 'chegada' ? '#3b82f6' : '#1e293b',
            borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Chegada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

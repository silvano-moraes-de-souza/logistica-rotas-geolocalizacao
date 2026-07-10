import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../../src/services/api';
import { queryOne } from '../../../../src/services/database';

const MOTIVOS = [
  'Cliente ausente',
  'Endereço errado',
  'Recusou receber',
  'Empresa fechada',
  'Destinatário não localizado',
];

export default function EntregaScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [pacote, setPacote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [passo, setPasso] = useState<'acao' | 'sim' | 'nao'>('acao');
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    loadPacote();
  }, [id]);

  async function loadPacote() {
    try {
      const p = await queryOne('SELECT * FROM pacotes WHERE id = ?', [id as string]);
      setPacote(p);
    } catch (error: any) {
      Alert.alert('Erro', 'Pacote não encontrado');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleEntregar() {
    if (!nomeRecebedor.trim()) {
      Alert.alert('Atenção', 'Informe o nome de quem recebeu');
      return;
    }
    setSubmitting(true);
    try {
      const lat = 0; // TODO: get from expo-location
      const lon = 0;
      await api.entregarPacote(id as string, nomeRecebedor.trim(), lat, lon);
      Alert.alert('Sucesso', 'Entrega registrada!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao registrar');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNaoEntregue() {
    if (!motivo) {
      Alert.alert('Atenção', 'Selecione um motivo');
      return;
    }
    setSubmitting(true);
    try {
      const lat = 0; // TODO: get from expo-location
      const lon = 0;
      await api.naoEntregue(id as string, motivo, lat, lon);
      Alert.alert('Registrado', 'Não entrega registrada.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao registrar');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (pacote?.status !== 'pendente') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 32 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Pacote já processado</Text>
        <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center' }}>
          Status: {pacote?.status === 'entregue' ? 'Entregue' : 'Não entregue'}
          {pacote?.data_hora_entrega ? ` em ${new Date(pacote.data_hora_entrega).toLocaleString('pt-BR')}` : ''}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20 }}>
          <Text style={{ color: '#3b82f6', fontSize: 16 }}>Voltar</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 }}>Confirmar Entrega</Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>{pacote?.endereco || 'Endereço não informado'}</Text>

        {passo === 'acao' && (
          <View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>
              Foi entregue?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setPasso('sim')}
                style={{
                  flex: 1, backgroundColor: '#22c55e', borderRadius: 16, paddingVertical: 24, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>SIM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPasso('nao')}
                style={{
                  flex: 1, backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 24, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>NÃO</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {passo === 'sim' && (
          <View>
            <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
              Informe o nome de quem recebeu
            </Text>
            <TextInput
              placeholder="Nome do recebedor"
              placeholderTextColor="#64748b"
              value={nomeRecebedor}
              onChangeText={setNomeRecebedor}
              style={{
                backgroundColor: '#1e293b', color: '#fff', borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleEntregar}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#334155' : '#22c55e',
                borderRadius: 12, paddingVertical: 14, alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Confirmar Entrega</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPasso('acao')} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}

        {passo === 'nao' && (
          <View>
            <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
              Selecione o motivo
            </Text>
            {MOTIVOS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMotivo(m)}
                style={{
                  backgroundColor: motivo === m ? '#3b82f6' : '#1e293b',
                  borderRadius: 12, padding: 14, marginBottom: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>{m}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleNaoEntregue}
              disabled={submitting || !motivo}
              style={{
                backgroundColor: submitting || !motivo ? '#334155' : '#ef4444',
                borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Registrar Não Entrega</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPasso('acao')} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

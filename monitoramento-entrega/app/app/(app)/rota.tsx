import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../../src/services/api';
import { query } from '../../../src/services/database';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_CORES: Record<string, string> = {
  pendente: '#f59e0b',
  entregue: '#22c55e',
  nao_entregue: '#ef4444',
};

export default function RotaScreen() {
  const router = useRouter();
  const [viagem, setViagem] = useState<any>(null);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Tenta remoto primeiro
      let data = null;
      try { data = await api.viagemHoje(); } catch {}

      if (data) {
        setViagem(data.viagem);
        setPacotes(data.pacotes);
      } else {
        // Fallback offline: carrega do SQLite local
        const motoristaId = await SecureStore.getItemAsync('motorista_id');
        const hoje = new Date().toISOString().split('T')[0];
        const v = await query('SELECT * FROM viagens WHERE motorista_id = ? AND data = ?', [motoristaId, hoje]);
        if (v.length > 0) {
          setViagem(v[0]);
          const p = await query('SELECT * FROM pacotes WHERE viagem_id = ? ORDER BY criado_em', [v[0].id]);
          setPacotes(p);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar rota:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function iniciarViagem() {
    try {
      const result = await api.iniciarViagem();
      setViagem({ id: result.id, data: result.data, status: 'em_andamento', total_pacotes: 0, entregues: 0 });
      Alert.alert('Sucesso', 'Viagem iniciada! Escaneie o QR code na saída.');
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('motorista_id');
    router.replace('/');
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Rota de Hoje</Text>
          <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: '#334155', borderRadius: 8, padding: 8 }}>
            <MaterialCommunityIcons name="logout" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {!viagem ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <MaterialCommunityIcons name="truck-delivery" size={64} color="#334155" />
          <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
            Nenhuma viagem encontrada para hoje
          </Text>
          <TouchableOpacity
            onPress={iniciarViagem}
            style={{
              backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Iniciar Viagem</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{
            flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
            backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
          }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>Status</Text>
              <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
                {viagem.status === 'em_andamento' ? 'Em Andamento' : viagem.status}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>Pacotes</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
                {pacotes.filter(p => p.status === 'entregue').length}/{pacotes.length}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => router.push('scanner')}
                style={{ backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={pacotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/entrega/${item.id}`)}
                style={{
                  backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8,
                  flexDirection: 'row', alignItems: 'center',
                }}
              >
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: STATUS_CORES[item.status] || '#f59e0b',
                  marginRight: 12,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                    {item.endereco || 'Endereço não informado'}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    {item.cidade || ''}{item.uf ? ` - ${item.uf}` : ''}
                  </Text>
                </View>
                <Text style={{
                  fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2,
                  borderRadius: 4, overflow: 'hidden',
                  backgroundColor: STATUS_CORES[item.status] + '20',
                  color: STATUS_CORES[item.status],
                }}>
                  {item.status === 'entregue' ? 'Entregue' : item.status === 'nao_entregue' ? 'Não Entregue' : 'Pendente'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#64748b' }}>Nenhum pacote nesta rota</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

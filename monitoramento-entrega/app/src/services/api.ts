const API_BASE = 'http://192.168.0.100:3002/api'; // IP local da empresa

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.erro || `Erro ${response.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: any) => request<T>('POST', path, body),
  login: (email: string, senha: string) =>
    request<{ token: string; motorista: { id: string; nome: string; email: string } }>(
      'POST', '/auth/login', { email, senha }
    ),
  criarMotorista: (nome: string, email: string, senha: string) =>
    request<{ id: string; nome: string; email: string }>(
      'POST', '/auth/criar-motorista', { nome, email, senha }
    ),
  viagemHoje: () =>
    request<{ viagem: any; pacotes: any[] } | null>('GET', '/viagens/hoje'),
  iniciarViagem: () =>
    request<{ id: string; data: string; status: string }>('POST', '/viagens/iniciar'),
  finalizarViagem: (viagem_id: string) =>
    request<{ status: string }>('POST', '/viagens/finalizar', { viagem_id }),
  entregarPacote: (pacote_id: string, nome_recebedor: string, lat?: number, lon?: number) =>
    request<{ status: string; data_hora: string }>('POST', '/pacotes/entregar', { pacote_id, nome_recebedor, lat, lon }),
  naoEntregue: (pacote_id: string, motivo: string, lat?: number, lon?: number) =>
    request<{ status: string }>('POST', '/pacotes/nao-entregue', { pacote_id, motivo, lat, lon }),
  scanQR: (viagem_id: string, tipo: 'saida' | 'chegada', lat?: number, lon?: number) =>
    request<{ id: string; tipo: string; data_hora: string }>('POST', '/qrcode/scan', { viagem_id, tipo, lat, lon }),
  sincronizar: (itens: any[]) =>
    request<{ resultados: any[] }>('POST', '/sincronizacao/enviar', { itens }),
  verificarIntegridade: (registros: any[]) =>
    request<{ inconsistencias: any[] }>('POST', '/sincronizacao/verificar-integridade', { registros }),
};

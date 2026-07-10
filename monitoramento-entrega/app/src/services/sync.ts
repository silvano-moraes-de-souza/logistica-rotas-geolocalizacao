import { query, execute, queryOne } from './database';
import { api } from './api';
import { gerarHash256 } from './integrity';

let syncInterval: ReturnType<typeof setInterval> | null = null;
let lastOnlineTime: number | null = null;

export function startSync(intervalMs: number = 60000) {
  if (syncInterval) return;
  syncInterval = setInterval(processSyncQueue, intervalMs);
}

export function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function addToSyncQueue(tabela: string, operacao: 'insert' | 'update' | 'delete', dados: any) {
  const hash = await gerarHash256(dados);
  await execute(
    `INSERT INTO sync_queue (id, tabela, operacao, dados_json, hash_sha256) VALUES (?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), tabela, operacao, JSON.stringify(dados), hash]
  );
}

async function processSyncQueue() {
  const pending = await query(
    'SELECT * FROM sync_queue WHERE status = ? ORDER BY criado_em LIMIT 50',
    ['pendente']
  );

  if (pending.length === 0) return;

  try {
    const itens = pending.map(item => ({
      id: item.id,
      tabela: item.tabela,
      operacao: item.operacao,
      dados: JSON.parse(item.dados_json),
      hash_local: item.hash_sha256,
    }));

    const result = await api.sincronizar(itens);
    const online = new Date().getTime();

    // Atualiza status na fila
    for (const res of result.resultados) {
      if (res.status === 'enviado' || res.status === 'ja_na_fila') {
        await execute('UPDATE sync_queue SET status = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
          ['enviado', res.id]);

        // Marca registro original como sincronizado
        const item = pending.find(p => p.id === res.id);
        if (item && res.hash_sha256) {
          await execute(`UPDATE ${item.tabela} SET sincronizado = 1, hash_sha256 = ? WHERE id = ?`,
            [res.hash_sha256, item.registro_id || JSON.parse(item.dados_json).id]);
        }
      } else {
        await execute('UPDATE sync_queue SET status = ?, tentativas = tentativas + 1, erro = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
          ['falha', res.erro || 'erro desconhecido', res.id]);
      }
    }

    // Verificação de integridade após 10 minutos de conexão estável
    if (lastOnlineTime && (online - lastOnlineTime) > 10 * 60 * 1000) {
      await verificarIntegridade();
    }
    if (!lastOnlineTime) {
      lastOnlineTime = online;
    }
  } catch (error: any) {
    console.error('[SYNC] Erro ao sincronizar:', error.message);
  }
}

async function verificarIntegridade() {
  const tabelas = ['viagens', 'pacotes', 'scans_qrcode'];

  for (const tabela of tabelas) {
    const registros = await query(
      `SELECT id, hash_sha256 FROM ${tabela} WHERE sincronizado = 1 AND hash_sha256 IS NOT NULL`
    );

    if (registros.length === 0) continue;

    const registrosParaVerificar = registros.map(r => ({
      tabela,
      registro_id: r.id,
      hash_local: r.hash_sha256,
    }));

    try {
      const result = await api.verificarIntegridade(registrosParaVerificar);

      for (const inc of result.inconsistencias) {
        if (inc.status === 'corrompido') {
          console.warn(`[INTEGRIDADE] Registro corrompido: ${tabela}/${inc.registro_id}`);
          // Remove local corrompido
          await execute(`DELETE FROM sync_queue WHERE registro_id = ? AND tabela = ?`, [inc.registro_id, tabela]);
          // Re-adiciona à fila para reenvio
          const dados = await queryOne(`SELECT * FROM ${tabela} WHERE id = ?`, [inc.registro_id]);
          if (dados) {
            await addToSyncQueue(tabela, 'update', dados);
          }
        }
      }
    } catch (error: any) {
      console.error('[INTEGRIDADE] Erro na verificacao:', error.message);
    }
  }
}

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('monitoramento.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS motoristas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT,
      criado_em TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS viagens (
      id TEXT PRIMARY KEY,
      motorista_id TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      saida_qrcode_data TEXT,
      saida_qrcode_lat REAL,
      saida_qrcode_lon REAL,
      chegada_qrcode_data TEXT,
      chegada_qrcode_lat REAL,
      chegada_qrcode_lon REAL,
      hash_sha256 TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pacotes (
      id TEXT PRIMARY KEY,
      viagem_id TEXT NOT NULL,
      codigo_barras TEXT,
      qrcode_palete TEXT,
      endereco TEXT,
      cidade TEXT,
      uf TEXT,
      lat_destino REAL,
      lon_destino REAL,
      status TEXT DEFAULT 'pendente',
      nome_recebedor TEXT,
      motivo_nao_entregue TEXT,
      lat_entrega REAL,
      lon_entrega REAL,
      data_hora_entrega TEXT,
      hash_sha256 TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scans_qrcode (
      id TEXT PRIMARY KEY,
      viagem_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      lat REAL,
      lon REAL,
      hash_sha256 TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      tabela TEXT NOT NULL,
      operacao TEXT NOT NULL,
      dados_json TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      tentativas INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const database = getDb();
  await database.runAsync(sql, params);
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const database = getDb();
  return await database.getAllAsync(sql, params);
}

export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const database = getDb();
  return await database.getFirstAsync(sql, params);
}

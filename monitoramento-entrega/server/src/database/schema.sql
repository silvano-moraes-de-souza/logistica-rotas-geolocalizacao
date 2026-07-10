CREATE TABLE IF NOT EXISTS motoristas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hash_senha TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS viagens (
  id TEXT PRIMARY KEY,
  motorista_id TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','concluida')),
  saida_qrcode_data TEXT,
  saida_qrcode_lat REAL,
  saida_qrcode_lon REAL,
  chegada_qrcode_data TEXT,
  chegada_qrcode_lat REAL,
  chegada_qrcode_lon REAL,
  hash_sha256 TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (motorista_id) REFERENCES motoristas(id)
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
  status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente','entregue','nao_entregue')),
  nome_recebedor TEXT,
  motivo_nao_entregue TEXT,
  lat_entrega REAL,
  lon_entrega REAL,
  data_hora_entrega TEXT,
  hash_sha256 TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (viagem_id) REFERENCES viagens(id)
);

CREATE TABLE IF NOT EXISTS scans_qrcode (
  id TEXT PRIMARY KEY,
  viagem_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('saida','chegada')),
  data_hora TEXT NOT NULL,
  lat REAL,
  lon REAL,
  hash_sha256 TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (viagem_id) REFERENCES viagens(id)
);

CREATE TABLE IF NOT EXISTS registros_automaticos (
  id TEXT PRIMARY KEY,
  viagem_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('saida','chegada')),
  data_hora TEXT NOT NULL,
  lat REAL,
  lon REAL,
  justificativa TEXT,
  hash_sha256 TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (viagem_id) REFERENCES viagens(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL CHECK(operacao IN ('insert','update','delete')),
  registro_id TEXT NOT NULL,
  dados_json TEXT NOT NULL,
  hash_sha256 TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente','enviado','falha')),
  tentativas INTEGER DEFAULT 0,
  erro TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auditoria_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  motorista_id TEXT,
  acao TEXT NOT NULL,
  dados_json TEXT,
  ip_origem TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagens_data ON viagens(data);
CREATE INDEX IF NOT EXISTS idx_pacotes_viagem ON pacotes(viagem_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_status ON pacotes(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_auditoria_criado ON auditoria_log(criado_em);

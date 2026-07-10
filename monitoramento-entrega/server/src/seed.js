require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, execute, persist } = require('./database/init');

async function seed() {
  const db = await initDatabase();

  const motoristaId = uuidv4();
  const hash = bcrypt.hashSync('123456', 10);
  execute(
    'INSERT INTO motoristas (id, nome, email, hash_senha) VALUES (?, ?, ?, ?)',
    [motoristaId, 'Motorista Teste', 'email@exemplo.com', hash]
  );

  const viagemId = uuidv4();
  const hoje = new Date().toISOString().split('T')[0];
  execute(
    'INSERT INTO viagens (id, motorista_id, data, status) VALUES (?, ?, ?, ?)',
    [viagemId, motoristaId, hoje, 'em_andamento']
  );

  const entregas = [
    { endereco: 'Rua XV de Novembro, 350', cidade: 'Sorocaba', uf: 'SP', lat: -23.5015, lon: -47.4583 },
    { endereco: 'Av. São Paulo, 500', cidade: 'Sorocaba', uf: 'SP', lat: -23.4978, lon: -47.4512 },
    { endereco: 'Rua da Penha, 200', cidade: 'Sorocaba', uf: 'SP', lat: -23.5050, lon: -47.4620 },
    { endereco: 'Av. Antonio Carlos, 1000', cidade: 'Votorantim', uf: 'SP', lat: -23.5400, lon: -47.4400 },
    { endereco: 'Rua Sete de Setembro, 80', cidade: 'Sorocaba', uf: 'SP', lat: -23.4990, lon: -47.4550 },
  ];

  for (const e of entregas) {
    const pacoteId = uuidv4();
    execute(
      'INSERT INTO pacotes (id, viagem_id, endereco, cidade, uf, lat_destino, lon_destino, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [pacoteId, viagemId, e.endereco, e.cidade, e.uf, e.lat, e.lon, 'pendente']
    );
  }

  persist();
  console.log('[SEED] Dados de teste criados:');
  console.log(`  Motorista: email@exemplo.com / 123456`);
  console.log(`  Viagem ID: ${viagemId}`);
  console.log(`  Pacotes criados: ${entregas.length}`);
}

seed().catch(console.error);

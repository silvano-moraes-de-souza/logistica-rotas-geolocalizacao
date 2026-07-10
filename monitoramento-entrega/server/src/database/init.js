const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '..', '..', 'data', 'monitoramento.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.run(schema);

  persist();
  return db;
}

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getDb() {
  return db;
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
  db.run(sql, params);
  persist();
}

if (require.main === module) {
  initDatabase().then(() => {
    console.log('[DB] Schema aplicado com sucesso.');
    process.exit(0);
  });
}

module.exports = { initDatabase, persist, getDb, query, queryOne, execute };

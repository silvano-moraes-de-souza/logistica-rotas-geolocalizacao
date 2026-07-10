require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/init');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes(db));

app.use(authMiddleware);

const viagensRoutes = require('./routes/viagens');
app.use('/api/viagens', viagensRoutes(db));

const pacotesRoutes = require('./routes/pacotes');
app.use('/api/pacotes', pacotesRoutes(db));

const qrcodeRoutes = require('./routes/qrcode');
app.use('/api/qrcode', qrcodeRoutes(db));

const sincronizacaoRoutes = require('./routes/sincronizacao');
app.use('/api/sincronizacao', sincronizacaoRoutes(db));

app.use((err, req, res, next) => {
  console.error('[ERRO]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

initDatabase().then((database) => {
  db = database;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Monitoramento de Entrega rodando em http://localhost:${PORT}`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/api/health`);
  });
});

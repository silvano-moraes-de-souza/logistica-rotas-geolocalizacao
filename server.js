//=============================================
// PLANEJAMENTO DE ROTA
// NOME:
// DESCRIÇÃO:
// AUTOR: SILVANO MORAES DE SOUZA
// VERSÃO: 
//=============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Carregar rotas da API
const processRoute = require('./api/process');
const optimizeRoute = require('./api/optimize');

// Rotas da API
app.post('/api/process', (req, res) => processRoute(req, res));
app.post('/api/optimize', (req, res) => optimizeRoute(req, res));

// Rota para buscar preço do combustível
app.get('/api/fuel-price', async (req, res) => {
    const FALLBACK_PRICE = 6.14;
    try {
        // Tentativa de buscar preço em Sorocaba via scraping discreto (regex)
        // Usando um site que costuma ter o dado de forma simples
        const axios = require('axios');
        const response = await axios.get('https://www.precodecombustivel.com.br/cidade/sorocaba-sp', {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        // Regex para capturar o preço médio (ex: "Preço médio: R$ 6,14")
        const match = response.data.match(/Preço Médio de Gasolina em Sorocaba é de R\$\s*(\d+,\d+)/);
        if (match && match[1]) {
            const price = parseFloat(match[1].replace(',', '.'));
            return res.json({ price: price, city: 'Sorocaba', status: 'live' });
        }
        
        res.json({ price: FALLBACK_PRICE, city: 'Sorocaba', status: 'fallback' });
    } catch (error) {
        res.json({ price: FALLBACK_PRICE, city: 'Sorocaba', status: 'error' });
    }
});

// Servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API Process: POST http://localhost:${PORT}/api/process`);
    console.log(`⚡ API Optimize: POST http://localhost:${PORT}/api/optimize`);
    console.log(`🔑 ORS API Key: ${process.env.OPENROUTESERVICE_API_KEY ? 'Configurada' : 'NÃO CONFIGURADA'}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Erro: A porta ${PORT} já está em uso.`);
        console.error(`💡 Sugestão: Mate o processo anterior ou use 'PORT=3002 node server.js'`);
        process.exit(1);
    }
});

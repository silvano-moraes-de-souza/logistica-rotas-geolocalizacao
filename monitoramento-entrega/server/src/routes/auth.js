const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { gerarToken } = require('../middleware/auth');
const { execute, queryOne } = require('../database/init');

module.exports = function (db) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha obrigatorios' });
    }

    const motorista = queryOne('SELECT * FROM motoristas WHERE email = ? AND ativo = 1', [email]);
    if (!motorista) {
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    const valida = bcrypt.compareSync(senha, motorista.hash_senha);
    if (!valida) {
      return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    const token = gerarToken(motorista);

    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [motorista.id, 'login', JSON.stringify({ email })]);

    res.json({
      token,
      motorista: { id: motorista.id, nome: motorista.nome, email: motorista.email }
    });
  });

  router.post('/criar-motorista', (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha obrigatorios' });
    }

    const existente = queryOne('SELECT id FROM motoristas WHERE email = ?', [email]);
    if (existente) {
      return res.status(409).json({ erro: 'Email ja cadastrado' });
    }

    const id = uuidv4();
    const hash = bcrypt.hashSync(senha, 10);
    execute('INSERT INTO motoristas (id, nome, email, hash_senha) VALUES (?, ?, ?, ?)', [id, nome, email, hash]);
    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [id, 'criar_motorista', JSON.stringify({ nome, email })]);

    res.status(201).json({ id, nome, email });
  });

  return router;
};

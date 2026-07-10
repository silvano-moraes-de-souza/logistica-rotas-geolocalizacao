const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { execute, queryOne, query } = require('../database/init');

module.exports = function (db) {
  const router = Router();

  router.get('/hoje', (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    const viagem = queryOne(`
      SELECT v.*,
        (SELECT COUNT(*) FROM pacotes WHERE viagem_id = v.id) as total_pacotes,
        (SELECT COUNT(*) FROM pacotes WHERE viagem_id = v.id AND status = 'entregue') as entregues
      FROM viagens v
      WHERE v.motorista_id = ? AND v.data = ?
    `, [req.motoristaId, hoje]);

    if (!viagem) {
      return res.json(null);
    }

    const pacotes = query('SELECT * FROM pacotes WHERE viagem_id = ? ORDER BY criado_em', [viagem.id]);
    res.json({ viagem, pacotes });
  });

  router.post('/iniciar', (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    const existente = queryOne('SELECT id FROM viagens WHERE motorista_id = ? AND data = ?', [req.motoristaId, hoje]);
    if (existente) {
      return res.status(409).json({ erro: 'Viagem ja iniciada hoje' });
    }

    const id = uuidv4();
    execute('INSERT INTO viagens (id, motorista_id, data, status) VALUES (?, ?, ?, ?)',
      [id, req.motoristaId, hoje, 'em_andamento']);
    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [req.motoristaId, 'iniciar_viagem', JSON.stringify({ viagem_id: id, data: hoje })]);

    res.status(201).json({ id, data: hoje, status: 'em_andamento' });
  });

  router.post('/finalizar', (req, res) => {
    const { viagem_id } = req.body;
    if (!viagem_id) {
      return res.status(400).json({ erro: 'viagem_id obrigatorio' });
    }

    const viagem = queryOne('SELECT * FROM viagens WHERE id = ? AND motorista_id = ?', [viagem_id, req.motoristaId]);
    if (!viagem) {
      return res.status(404).json({ erro: 'Viagem nao encontrada' });
    }

    const hash = crypto.createHash('sha256').update(JSON.stringify(viagem) + Date.now()).digest('hex');
    execute('UPDATE viagens SET status = ?, hash_sha256 = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
      ['concluida', hash, viagem_id]);

    res.json({ status: 'concluida', hash_sha256: hash });
  });

  return router;
};

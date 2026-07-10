const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { execute, queryOne } = require('../database/init');

module.exports = function (db) {
  const router = Router();

  router.post('/entregar', (req, res) => {
    const { pacote_id, nome_recebedor, lat, lon } = req.body;
    if (!pacote_id) {
      return res.status(400).json({ erro: 'pacote_id obrigatorio' });
    }

    const pacote = queryOne(`
      SELECT p.* FROM pacotes p
      JOIN viagens v ON v.id = p.viagem_id
      WHERE p.id = ? AND v.motorista_id = ?
    `, [pacote_id, req.motoristaId]);

    if (!pacote) {
      return res.status(404).json({ erro: 'Pacote nao encontrado' });
    }
    if (pacote.status !== 'pendente') {
      return res.status(409).json({ erro: 'Pacote ja processado', status_atual: pacote.status });
    }

    const data_hora = new Date().toISOString();
    const dados_hash = { pacote_id, nome_recebedor, lat, lon, data_hora };
    const hash = crypto.createHash('sha256').update(JSON.stringify(dados_hash)).digest('hex');

    execute(`
      UPDATE pacotes SET status = 'entregue', nome_recebedor = ?,
        lat_entrega = ?, lon_entrega = ?, data_hora_entrega = ?,
        hash_sha256 = ?, atualizado_em = datetime('now')
      WHERE id = ?
    `, [nome_recebedor || null, lat || null, lon || null, data_hora, hash, pacote_id]);

    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [req.motoristaId, 'entregar_pacote', JSON.stringify({ pacote_id, nome_recebedor, lat, lon })]);

    res.json({ status: 'entregue', data_hora, hash_sha256: hash });
  });

  router.post('/nao-entregue', (req, res) => {
    const { pacote_id, motivo, lat, lon } = req.body;
    if (!pacote_id || !motivo) {
      return res.status(400).json({ erro: 'pacote_id e motivo obrigatorios' });
    }

    const pacote = queryOne(`
      SELECT p.* FROM pacotes p
      JOIN viagens v ON v.id = p.viagem_id
      WHERE p.id = ? AND v.motorista_id = ?
    `, [pacote_id, req.motoristaId]);

    if (!pacote) {
      return res.status(404).json({ erro: 'Pacote nao encontrado' });
    }
    if (pacote.status !== 'pendente') {
      return res.status(409).json({ erro: 'Pacote ja processado', status_atual: pacote.status });
    }

    const data_hora = new Date().toISOString();
    const dados_hash = { pacote_id, motivo, lat, lon, data_hora };
    const hash = crypto.createHash('sha256').update(JSON.stringify(dados_hash)).digest('hex');

    execute(`
      UPDATE pacotes SET status = 'nao_entregue', motivo_nao_entregue = ?,
        lat_entrega = ?, lon_entrega = ?, data_hora_entrega = ?,
        hash_sha256 = ?, atualizado_em = datetime('now')
      WHERE id = ?
    `, [motivo, lat || null, lon || null, data_hora, hash, pacote_id]);

    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [req.motoristaId, 'nao_entregue_pacote', JSON.stringify({ pacote_id, motivo, lat, lon })]);

    res.json({ status: 'nao_entregue', data_hora, hash_sha256: hash });
  });

  return router;
};

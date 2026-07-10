const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { execute, queryOne } = require('../database/init');

module.exports = function (db) {
  const router = Router();

  router.post('/scan', (req, res) => {
    const { viagem_id, tipo, lat, lon } = req.body;
    if (!viagem_id || !tipo) {
      return res.status(400).json({ erro: 'viagem_id e tipo obrigatorios' });
    }
    if (!['saida', 'chegada'].includes(tipo)) {
      return res.status(400).json({ erro: 'tipo deve ser saida ou chegada' });
    }

    const viagem = queryOne('SELECT * FROM viagens WHERE id = ? AND motorista_id = ?', [viagem_id, req.motoristaId]);
    if (!viagem) {
      return res.status(404).json({ erro: 'Viagem nao encontrada' });
    }

    const id = uuidv4();
    const data_hora = new Date().toISOString();
    const dados_hash = { viagem_id, tipo, data_hora, lat, lon };
    const hash = crypto.createHash('sha256').update(JSON.stringify(dados_hash)).digest('hex');

    execute(
      'INSERT INTO scans_qrcode (id, viagem_id, tipo, data_hora, lat, lon, hash_sha256) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, viagem_id, tipo, data_hora, lat || null, lon || null, hash]
    );

    if (tipo === 'saida') {
      execute(
        'UPDATE viagens SET saida_qrcode_data = ?, saida_qrcode_lat = ?, saida_qrcode_lon = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
        [data_hora, lat || null, lon || null, viagem_id]
      );
    } else {
      execute(
        'UPDATE viagens SET chegada_qrcode_data = ?, chegada_qrcode_lat = ?, chegada_qrcode_lon = ?, atualizado_em = datetime(\'now\') WHERE id = ?',
        [data_hora, lat || null, lon || null, viagem_id]
      );
    }

    execute('INSERT INTO auditoria_log (motorista_id, acao, dados_json) VALUES (?, ?, ?)',
      [req.motoristaId, `qrcode_${tipo}`, JSON.stringify({ viagem_id, tipo, lat, lon })]);

    res.status(201).json({ id, tipo, data_hora, hash_sha256: hash });
  });

  return router;
};

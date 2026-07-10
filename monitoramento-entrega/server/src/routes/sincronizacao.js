const { Router } = require('express');
const crypto = require('crypto');
const { execute, queryOne } = require('../database/init');

module.exports = function (db) {
  const router = Router();

  router.post('/enviar', (req, res) => {
    const { itens } = req.body;
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'Lista de itens obrigatoria' });
    }

    const resultados = [];
    for (const item of itens) {
      try {
        const { tabela, operacao, dados } = item;
        if (!tabela || !operacao || !dados) {
          resultados.push({ id: item.id, status: 'falha', erro: 'campos incompletos' });
          continue;
        }

        const hashLocal = crypto.createHash('sha256').update(JSON.stringify(dados)).digest('hex');

        if (operacao === 'insert' || operacao === 'update') {
          const ids = dados.id ? [dados.id] : [];
          const colunas = Object.keys(dados).join(', ');
          const valores = Object.values(dados);
          const placeholders = valores.map(() => '?').join(', ');

          const upsertCols = Object.keys(dados).map(k => `${k} = ?`).join(', ');

          const check = queryOne('SELECT id FROM sync_queue WHERE registro_id = ? AND tabela = ? AND status = ?',
            [dados.id, tabela, 'pendente']);

          if (check) {
            resultados.push({ id: item.id, status: 'ja_na_fila' });
            continue;
          }

          execute(
            `INSERT INTO ${tabela} (${colunas}) VALUES (${placeholders})`,
            valores
          );

          resultados.push({ id: item.id, status: 'enviado', hash_sha256: hashLocal });
        } else if (operacao === 'delete') {
          execute(`DELETE FROM ${tabela} WHERE id = ?`, [dados.id]);
          resultados.push({ id: item.id, status: 'enviado' });
        }
      } catch (err) {
        resultados.push({ id: item.id, status: 'falha', erro: err.message });
      }
    }

    res.json({ resultados });
  });

  router.post('/verificar-integridade', (req, res) => {
    const { registros } = req.body;
    if (!registros || !Array.isArray(registros)) {
      return res.status(400).json({ erro: 'Lista de registros obrigatoria' });
    }

    const inconsistencias = [];
    for (const item of registros) {
      const { tabela, registro_id, hash_local } = item;
      if (!tabela || !registro_id || !hash_local) continue;

      if (!['viagens', 'pacotes', 'scans_qrcode', 'registros_automaticos'].includes(tabela)) {
        inconsistencias.push({ registro_id, status: 'tabela_invalida' });
        continue;
      }

      const row = queryOne(`SELECT hash_sha256 FROM ${tabela} WHERE id = ?`, [registro_id]);
      if (!row) {
        inconsistencias.push({ registro_id, status: 'nao_encontrado' });
        continue;
      }

      if (row.hash_sha256 !== hash_local) {
        inconsistencias.push({
          registro_id, status: 'corrompido',
          hash_servidor: row.hash_sha256, hash_local
        });
      } else {
        inconsistencias.push({ registro_id, status: 'ok' });
      }
    }

    res.json({ inconsistencias });
  });

  return router;
};

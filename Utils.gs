/**
 * ==================================================================================================
 * COMPONENTE: Utils.gs
 * PROJETO: Integração GAS-Colab para NCA-SEM Educacional
 * 
 * DESCRIÇÃO:
 *   Funções utilitárias diversas (formatação de data, strings, etc.).
 *
 * INTEGRAÇÕES:
 *   - Centraliza fluxo na Google Planilha (SPREADSHEETS_ID).
 *   - Comunicação com motor analítico em Python (notebook.py).
 *   - Interface HTML para interação do usuário.
 * ==================================================================================================
 */


function Utils_init() {
  return {
    version: '1.0.0',
    helpers: ['toNumber', 'text', 'uniqueByKey', 'chunk', 'safeJsonParse']
  };
}

/** Converte números vindos de células sem transformar vazio em NaN. */
function Utils_toNumber(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback === undefined ? 0 : fallback;
  }
  var number = Number(value);
  return isFinite(number) ? number : (fallback === undefined ? 0 : fallback);
}

/** Normaliza texto de planilha e limita o tamanho antes de chegar à UI. */
function Utils_text(value, maxLength, fallback) {
  var text = value === null || value === undefined ? (fallback || '') : String(value);
  text = text.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  var limit = Number(maxLength);
  if (!isFinite(limit) || limit < 1) limit = 500;
  return text.slice(0, limit);
}

/** Retorna registros únicos preservando a primeira ocorrência. */
function Utils_uniqueByKey(records, key) {
  var seen = {};
  return (Array.isArray(records) ? records : []).filter(function(record) {
    var value = record && record[key] !== undefined ? String(record[key]) : '';
    if (seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

/** Divide uma lista em lotes para operações de planilha sem timeout. */
function Utils_chunk(items, size) {
  var list = Array.isArray(items) ? items : [];
  var chunkSize = Math.max(1, Math.floor(Utils_toNumber(size, 100)));
  var chunks = [];
  for (var index = 0; index < list.length; index += chunkSize) {
    chunks.push(list.slice(index, index + chunkSize));
  }
  return chunks;
}

/** Faz parse tolerante de propriedades/linhas legadas. */
function Utils_safeJsonParse(value, fallback) {
  try {
    return JSON.parse(String(value));
  } catch (error) {
    return fallback === undefined ? null : fallback;
  }
}

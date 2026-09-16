/**
 * AnaliseFeatures.gs — Funcionalidades autenticadas do NCA-SEM.
 *
 * Justificam o login: analistas autenticados registram observacoes sobre
 * resultados de analise (NCA/SEM) e sugerem indicadores de monitoramento.
 * Toda acao exige credenciais validas (Auth_loginWithPassword) e e atribuida
 * ao usuario autor.
 */

function nca_auth_(username, password) {
  var res = Auth_loginWithPassword(username, password);
  return (res && res.success) ? res.user : null;
}

function nca_append_(sheetName, headers, obj) {
  try {
    nca_with_lock_('nca_append:' + sheetName, function () {
      var ss = SheetsDB_getSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      }
      var current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String) : [];
      if (!current.length) { sheet.getRange(1, 1, 1, headers.length).setValues([headers]); current = headers.slice(); }
      sheet.appendRow(current.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; }));
    });
  } catch (error) {
    Logger.log("Erro em nca_append_: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

function nca_list_(sheetName, options) {
  try {
    try {
      var sheet = SheetsDB_getSpreadsheet().getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return [];
      options = options || {};
      var limit = Math.max(1, Math.min(Number(options.limit || 200), 1000));
      var lastRow = sheet.getLastRow();
      var lastColumn = sheet.getLastColumn();
      var dataRows = Math.min(limit, lastRow - 1);
      var startRow = Math.max(2, lastRow - dataRows + 1);
      var values = [sheet.getRange(1, 1, 1, lastColumn).getValues()[0]]
        .concat(sheet.getRange(startRow, 1, dataRows, lastColumn).getValues());
      var headers = values[0].map(String);
      return values.slice(1).map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i]; }); return o; }).reverse();
    } catch (error) {
      Logger.log("Erro em nca_list_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em nca_list_: " + error.message);
    throw error;
  }
}

function nca_id_(prefix) { return prefix + '-' + Utilities.getUuid(); }

function nca_with_lock_(operationName, callback) {
  try {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Nao foi possivel obter lock para ' + operationName + '.');
    try {
      return callback();
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    Logger.log("Erro em nca_with_lock_: " + error.message);
    throw error;
  }
}

/** Funcionalidade 1 — Registrar observacao sobre um resultado de analise. */
function registrarObservacaoAnalise(username, password, analiseId, observacao) {
  try {
    var user = nca_auth_(username, password);
    if (!user) return { success: false, message: 'Credenciais invalidas.' };
    if (!String(analiseId || '').trim()) return { success: false, message: 'Informe o ID da analise.' };
    if (!String(observacao || '').trim()) return { success: false, message: 'Informe a observacao.' };
    var id = nca_id_('OBS');
    nca_append_('ObservacoesAnalise', ['ID', 'DataHora', 'Autor', 'AnaliseID', 'Observacao'], {
      ID: id, DataHora: new Date(), Autor: user.username, AnaliseID: analiseId, Observacao: observacao
    });
    return { success: true, id: id };
  } catch (error) {
    Logger.log("Erro em registrarObservacaoAnalise: " + error.message);
    throw error;
  }
}

/** Funcionalidade 2 — Sugerir indicador de monitoramento. */
function sugerirIndicadorMonitoramento(username, password, indicador, justificativa) {
  var user = nca_auth_(username, password);
  if (!user) return { success: false, message: 'Credenciais invalidas.' };
  if (!String(indicador || '').trim()) return { success: false, message: 'Informe o indicador.' };
  var id = nca_id_('IND');
  nca_append_('IndicadoresSugeridos', ['ID', 'DataHora', 'Autor', 'Indicador', 'Justificativa', 'Status'], {
    ID: id, DataHora: new Date(), Autor: user.username, Indicador: indicador, Justificativa: justificativa || '', Status: 'sugerido'
  });
  return { success: true, id: id };
}

function listarObservacoesAnalise(username, password, limit) {
  if (!nca_auth_(username, password)) return { success: false, message: 'Credenciais invalidas.' };
  return { success: true, itens: nca_list_('ObservacoesAnalise', { limit: limit }) };
}

function listarIndicadoresSugeridos(username, password, limit) {
  if (!nca_auth_(username, password)) return { success: false, message: 'Credenciais invalidas.' };
  return { success: true, itens: nca_list_('IndicadoresSugeridos', { limit: limit }) };
}

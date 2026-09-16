/**
 * IndicadorWorkflow.gs — Workflow de aprovacao (admin) do NCA-SEM.
 *
 * Administradores listam indicadores de monitoramento pendentes e aprovam/
 * rejeitam, registrando revisor e data. Exige login com papel 'admin'.
 * Opera sobre a aba 'IndicadoresSugeridos'.
 */

function ncawf_admin_(username, password) {
  try {
    var res = Auth_loginWithPassword(username, password);
    if (!res || !res.success || !res.user) return null;
    return String(res.user.role || '').toLowerCase() === 'admin' ? res.user : null;
  } catch (error) {
    Logger.log("Erro em ncawf_admin_: " + error.message);
    throw error;
  }
}

function ncawf_update_(id, status, revisor, obs) {
  try {
    return nca_with_lock_('ncawf_update', function () {
      var sheet = SheetsDB_getSpreadsheet().getSheetByName('IndicadoresSugeridos');
      if (!sheet || sheet.getLastRow() < 2) return { success: false, message: 'Nenhum registro.' };
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
      ['Revisor', 'RevisadoEm', 'ObsRevisao'].forEach(function (h) {
        if (headers.indexOf(h) === -1) { sheet.getRange(1, headers.length + 1).setValue(h); headers.push(h); }
      });
      var idCol = headers.indexOf('ID'), stCol = headers.indexOf('Status');
      var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][idCol]) === String(id)) {
          values[i][stCol] = status;
          values[i][headers.indexOf('Revisor')] = revisor;
          values[i][headers.indexOf('RevisadoEm')] = new Date();
          values[i][headers.indexOf('ObsRevisao')] = obs || '';
          sheet.getRange(i + 2, 1, 1, headers.length).setValues([values[i]]);
          return { success: true, id: id, status: status };
        }
      }
      return { success: false, message: 'ID nao encontrado: ' + id };
    });
  } catch (error) {
    Logger.log("Erro em ncawf_update_: " + error.message);
    throw error; // Re-lança para tratamento superior
  }
}

function ncawf_list_(statusFiltro, limit) {
  try {
    try {
      var sheet = SheetsDB_getSpreadsheet().getSheetByName('IndicadoresSugeridos');
      if (!sheet || sheet.getLastRow() < 2) return [];
      var max = Math.max(1, Math.min(Number(limit || 200), 1000));
      var rows = Math.min(max, sheet.getLastRow() - 1);
      var startRow = Math.max(2, sheet.getLastRow() - rows + 1);
      var values = [sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]]
        .concat(sheet.getRange(startRow, 1, rows, sheet.getLastColumn()).getValues());
      var headers = values[0].map(String);
      return values.slice(1).map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i]; }); return o; })
        .filter(function (o) { return !statusFiltro || String(o.Status || '').toLowerCase() === statusFiltro; })
        .reverse();
    } catch (error) {
      Logger.log("Erro em ncawf_list_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em ncawf_list_: " + error.message);
    throw error;
  }
}

function listarIndicadoresPendentes(username, password, limit) {
  if (!ncawf_admin_(username, password)) return { success: false, message: 'Acesso restrito a administradores.' };
  return { success: true, itens: ncawf_list_('sugerido', limit) };
}

function aprovarIndicador(username, password, id, observacao) {
  try {
    var admin = ncawf_admin_(username, password);
    if (!admin) return { success: false, message: 'Acesso restrito a administradores.' };
    if (!String(id || '').trim()) return { success: false, message: 'Informe o ID.' };
    return ncawf_update_(id, 'aprovado', admin.username, observacao);
  } catch (error) {
    Logger.log("Erro em aprovarIndicador: " + error.message);
    throw error;
  }
}

function rejeitarIndicador(username, password, id, motivo) {
  try {
    var admin = ncawf_admin_(username, password);
    if (!admin) return { success: false, message: 'Acesso restrito a administradores.' };
    if (!String(id || '').trim()) return { success: false, message: 'Informe o ID.' };
    if (!String(motivo || '').trim()) return { success: false, message: 'Informe o motivo da rejeicao.' };
    return ncawf_update_(id, 'rejeitado', admin.username, motivo);
  } catch (error) {
    Logger.log("Erro em rejeitarIndicador: " + error.message);
    throw error;
  }
}

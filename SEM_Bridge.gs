/**
 * SEM_Bridge.gs — Prepara e lê os resultados SEM da planilha.
 *
 * O cálculo é feito em notebook.py via semopy.
 * Constructo latente previamente especificado no modelo (não descoberto
 * automaticamente pelos componentes ou pelos dados):
 *   Desempenho =~ notaMatematica + notaPortugues
 *   Desempenho ~  rendaFamiliar + frequencia
 *
 * Schema esperado na aba Resultados_Analise:
 *   tipo | variavel_x | variavel_y | metrica | valor | interpretacao | geradoEm
 */

/**
 * Lê todos os resultados SEM já escritos pelo notebook.py.
 * @return {Array<Object>} Lista de resultados filtrados por tipo='SEM'.
 */
function SEM_Bridge_getResults() {
  try {
    var sheet = SheetsDB_getSpreadsheet().getSheetByName('Resultados_Analise');
    if (!sheet || sheet.getLastRow() < 2) return [];

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(h) { return String(h == null ? '' : h).trim(); });
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();

    return rows
      .map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      })
      .filter(function(r) { return String(r.tipo || '').trim().toUpperCase() === 'SEM'; });
  } catch (error) {
    Logger.log("Erro em SEM_Bridge_getResults: " + error.message);
    throw error;
  }
}

/**
 * Prepara o payload de disparo para o notebook.py executar o SEM.
 * @return {Object} Payload para ColabOrchestrator_dispatch.
 */
function SEM_Bridge_buildPayload() {
  var spreadsheetId = Config_getSpreadsheetId();
  if (!spreadsheetId) throw new Error('SPREADSHEETS_ID não configurado.');

  return {
    SPREADSHEETS_ID: spreadsheetId,
    analysis: 'sem',
    modelo: {
      medidas: [
        { constructo: 'Desempenho', indicadores: ['notaMatematica', 'notaPortugues'] }
      ],
      estrutural: [
        { resultado: 'Desempenho', preditores: ['rendaFamiliar', 'frequencia'] }
      ]
    }
  };
}

/**
 * Formata os resultados SEM separando cargas de mensuração de coeficientes de
 * caminho. Os constructos vêm especificados no modelo; a saída não autoriza
 * tratá-los como fatores latentes automaticamente descobertos ou como prova
 * de causalidade.
 * @return {Object} { pathCoefficients, factorLoadings, status, generatedAt,
 *                    latentConstructsSpecified, causalInference }
 */
function SEM_Bridge_getSummary() {
  try {
    var results = SEM_Bridge_getResults();

    // Caso o notebook tenha retornado bloqueio ou erro
    var bloqueio = results.find(function(r) {
      var metric = String(r.metrica || '').trim().toLowerCase();
      return metric === 'status' || metric === 'erro';
    });
    if (bloqueio) {
      return {
        status: 'bloqueado',
        mensagem: bloqueio.interpretacao,
        pathCoefficients: [],
        factorLoadings: [],
        latentConstructsSpecified: true,
        causalInference: 'not_established',
        generatedAt: String(bloqueio.geradoEm || '')
      };
    }

    var caminho = results.filter(function(r) { return String(r.metrica || '').trim() === 'path_coefficient'; });
    var cargas  = results.filter(function(r) { return String(r.metrica || '').trim() === 'factor_loading';  });
    var hasModelOutput = caminho.length > 0 || cargas.length > 0;
    var generatedAt = results.length ? String(results[0].geradoEm || '') : null;

    return {
      status: hasModelOutput ? 'pronto' : 'sem_dados',
      generatedAt: generatedAt,
      latentConstructsSpecified: true,
      causalInference: 'not_established',
      pathCoefficients: caminho.map(function(r) {
        return {
          preditor: r.variavel_x,
          resultado: r.variavel_y,
          estimativa: SEM_Bridge_toFiniteNumber_(r.valor),
          interpretacao: r.interpretacao
        };
      }),
      factorLoadings: cargas.map(function(r) {
        return {
          constructo: r.variavel_x,
          indicador: r.variavel_y,
          carga: SEM_Bridge_toFiniteNumber_(r.valor),
          measurementRole: 'specified_construct_indicator_loading',
          interpretacao: r.interpretacao
        };
      })
    };
  } catch (error) {
    Logger.log("Erro em SEM_Bridge_getSummary: " + error.message);
    throw error;
  }
}

/** Converte valores do notebook, preservando zero e rejeitando números não finitos. */
function SEM_Bridge_toFiniteNumber_(value) {
  if (value === null || typeof value === 'undefined') return null;
  var raw = String(value).trim();
  if (!raw) return null;
  var number = Number(raw.replace(',', '.'));
  return isFinite(number) ? number : null;
}

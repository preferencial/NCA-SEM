/**
 * NCA_Bridge.gs — Prepara e lê os resultados NCA da planilha.
 *
 * O cálculo é feito em notebook.py (Google Colab/Cloud Run).
 * Este módulo lida com o lado GAS: acionar o Colab via
 * ColabOrchestrator e consumir os resultados escritos na aba
 * Resultados_Analise.
 *
 * Schema esperado na aba Resultados_Analise (escrito pelo notebook.py):
 *   tipo | variavel_x | variavel_y | metrica | valor | interpretacao | geradoEm
 */

/**
 * Lê todos os resultados NCA já escritos pelo notebook.py.
 * @return {Array<Object>} Lista de resultados filtrados por tipo='NCA'.
 */
function NCA_Bridge_getResults() {
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
      .filter(function(r) { return String(r.tipo || '').trim().toUpperCase() === 'NCA'; });
  } catch (error) {
    Logger.log("Erro em NCA_Bridge_getResults: " + error.message);
    throw error;
  }
}

/**
 * Prepara o payload de disparo para o notebook.py executar a NCA.
 * Inclui o ID da planilha e as configurações de variáveis.
 * @return {Object} Payload para ColabOrchestrator_dispatch.
 */
function NCA_Bridge_buildPayload() {
  var spreadsheetId = Config_getSpreadsheetId();
  if (!spreadsheetId) throw new Error('SPREADSHEETS_ID não configurado.');

  return {
    SPREADSHEETS_ID: spreadsheetId,
    analysis: 'nca',
    pares: [
      { x: 'rendaFamiliar',  y: 'notaMatematica' },
      { x: 'rendaFamiliar',  y: 'notaPortugues'  },
      { x: 'frequencia',     y: 'notaMatematica' },
      { x: 'frequencia',     y: 'notaPortugues'  }
    ]
  };
}

/**
 * Formata os resultados NCA para exibição no NcaDashboard.html.
 * O limiar operacional sinaliza um padrão compatível com necessidade no
 * escopo observado; não transforma a linha de teto em prova causal.
 * @return {Object} { results: Array, generatedAt: string, count: number }
 */
function NCA_Bridge_getSummary() {
  try {
    var results = NCA_Bridge_getResults();
    var generatedAt = results.length ? String(results[0].geradoEm || '') : null;

    return {
      count: results.length,
      generatedAt: generatedAt,
      results: results.map(function(r) {
        var d = NCA_Bridge_toFiniteNumber_(r.valor);
        var hasEffect = d !== null;
        var ceilingSignal = hasEffect && d >= 0.1;
        return {
          par: r.variavel_x + ' → ' + r.variavel_y,
          d: hasEffect ? d : null,
          nivel: hasEffect ? (d >= 0.3 ? 'grande' : (d >= 0.1 ? 'médio' : 'pequeno')) : null,
          // Compatibilidade com consumidores legados. O relatório não usa
          // este alias para afirmar que uma condição foi provada.
          necessaria: ceilingSignal,
          sinalNecessidade: ceilingSignal,
          tipoEvidencia: ceilingSignal ? 'padrao_compativel_com_necessidade' : 'sem_sinal_suficiente',
          escopoInterpretacao: 'necessidade_empirica_no_escopo_observado',
          causalidadeDemonstrada: false,
          interpretacao: r.interpretacao
        };
      })
    };
  } catch (error) {
    Logger.log("Erro em NCA_Bridge_getSummary: " + error.message);
    throw error;
  }
}

/** Converte valores do notebook sem deixar NaN, Infinity ou texto parcial chegar ao relatório. */
function NCA_Bridge_toFiniteNumber_(value) {
  if (value === null || typeof value === 'undefined') return null;
  var raw = String(value).trim();
  if (!raw) return null;
  var number = Number(raw.replace(',', '.'));
  return isFinite(number) ? number : null;
}

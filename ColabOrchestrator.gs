/**
 * ColabOrchestrator.gs — Dispara o notebook.py via Vertex AI Pipelines
 * ou Google Cloud Run e monitora o status da execução.
 *
 * ARQUITETURA:
 *   GAS → POST Vertex AI (trigger endpoint) → notebook.py executa →
 *   escreve Resultados_Analise → GAS lê via NCA_Bridge / SEM_Bridge.
 *
 * CONFIGURAÇÃO (Script Properties):
 *   COLAB_TRIGGER_URL  — URL do Cloud Run ou Vertex AI endpoint que
 *                        executa o notebook.py. Ex:
 *                        https://REGION-run.app/run-ncasem
 *   COLAB_AUTH_TOKEN   — Bearer token (service account) para autenticar.
 *   SPREADSHEETS_ID    — ID da planilha (já usado pelo restante do app).
 */

var COLAB_CFG = {
  MAX_ATTEMPTS : 3,
  BASE_DELAY_MS: 1000,
  TIMEOUT_MS   : 30000
};

/**
 * Dispara o notebook.py para executar NCA + SEM.
 * @return {Object} { ok, jobId, message }
 */
function ColabOrchestrator_dispatch() {
  try {
    var props = PropertiesService.getScriptProperties();
    var triggerUrl = props.getProperty('COLAB_TRIGGER_URL');
    var authToken  = props.getProperty('COLAB_AUTH_TOKEN');
    var spreadsheetId = Config_getSpreadsheetId();

    if (!triggerUrl) {
      return { ok: false, message: 'COLAB_TRIGGER_URL não configurado. Configure em Script Properties.' };
    }
    if (!spreadsheetId) {
      return { ok: false, message: 'SPREADSHEETS_ID não configurado.' };
    }

    var payload = {
      SPREADSHEETS_ID: spreadsheetId,
      triggeredAt: new Date().toISOString(),
      analyses: ['nca', 'sem']
    };

    var headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = 'Bearer ' + authToken;
    }

    var lastError = 'falha desconhecida';
    for (var attempt = 1; attempt <= COLAB_CFG.MAX_ATTEMPTS; attempt++) {
      try {
        var response = UrlFetchApp.fetch(triggerUrl, {
          method: 'post',
          headers: headers,
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        var code = response.getResponseCode();
        if (code >= 200 && code < 300) {
          var body = ColabOrchestrator_safeParse_(response.getContentText());
          return {
            ok: true,
            jobId: (body && body.jobId) ? body.jobId : null,
            message: 'Execução disparada com sucesso.'
          };
        }
        lastError = 'HTTP ' + code + ': ' + response.getContentText().substring(0, 200);
        if (code !== 429 && code < 500) break; // 4xx permanente — não tenta de novo
      } catch (e) {
        lastError = 'Rede: ' + (e.message || String(e));
      }
      if (attempt < COLAB_CFG.MAX_ATTEMPTS) {
        Utilities.sleep(COLAB_CFG.BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
    LoggerService.error('ColabOrchestrator_dispatch falhou: ' + lastError);
    return { ok: false, message: lastError };
  } catch (error) {
    Logger.log("Erro em ColabOrchestrator_dispatch: " + error.message);
    throw error;
  }
}

/**
 * Verifica se há resultados recentes na aba Resultados_Analise
 * (usado pela UI para saber se o notebook já terminou).
 * @return {Object} { hasResults, lastRunAt, ncaCount, semCount }
 */
function ColabOrchestrator_checkResults() {
  var ncaSummary = NCA_Bridge_getSummary();
  var semSummary = SEM_Bridge_getSummary();

  return {
    hasResults : ncaSummary.count > 0 || semSummary.status === 'pronto',
    lastRunAt  : ncaSummary.generatedAt || semSummary.generatedAt || null,
    ncaCount   : ncaSummary.count,
    semStatus  : semSummary.status
  };
}

/** JSON.parse defensivo. */
function ColabOrchestrator_safeParse_(text) {
  try {
    try {
      try { return JSON.parse(text); } catch (e) { return null; }
    } catch (error) {
      Logger.log("Erro em ColabOrchestrator_safeParse_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em ColabOrchestrator_safeParse_: " + error.message);
    throw error;
  }
}

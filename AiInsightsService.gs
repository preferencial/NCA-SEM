/**
 * ============================================================================
 * AiInsightsService.gs — Parecer Analítico via Google Gemini
 * ============================================================================
 *
 * MÓDULO: API / Análise
 * PROJETO: Preferencial - NCA-SEM
 *
 * DESCRIÇÃO:
 *   Gera um parecer pedagógico-metodológico sobre os RESULTADOS AGREGADOS dos
 *   estudantes e a prontidão das análises NCA/SEM, usando a API do Google
 *   Gemini. O prompt recebe apenas agregados (totais, médias, coberturas por
 *   dimensão, checks de prontidão e prioridades) — nenhum dado individual de
 *   aluno, professor ou escola é enviado à IA.
 *
 * ⚠️ LINGUAGEM DE ASSOCIAÇÃO (fundamentos.md 3.5.5.2):
 *   Prompts instruem o modelo a usar LINGUAGEM DE ASSOCIAÇÃO, NUNCA de causalidade.
 *   
 *   GARANTIAS IMPLEMENTADAS:
 *   1. Prompt com "REGRAS OBRIGATORIAS DE LINGUAGEM" (seção destacada)
 *   2. Instrução explícita: "o modelo identifica associacao", NUNCA "X causa Y"
 *   3. NCA: "padroes compativeis com condicao necessaria", não "X é necessário para Y"
 *   4. SEM: "relacoes estruturais do modelo", não "influência de X sobre Y"
 *   5. Qualificadores obrigatórios: "o modelo sugere", "dados compativeis com"
 *   6. Validação pedagógica: "equipe deve avaliar se corresponde à realidade observada"
 *   7. Proibição explícita: "NUNCA afirme causalidade direta"
 *
 * PADRÃO ENDURECIDO DA FROTA:
 *   - Retry com backoff exponencial + jitter para HTTP 429/5xx e exceções de
 *     rede; 4xx permanente falha imediatamente; parse defensivo do JSON.
 *   - Fallback determinístico local: sem GEMINI_API_KEY (ou com a IA fora do
 *     ar) o parecer é montado localmente a partir dos mesmos agregados.
 *
 * FRONTEIRA PÚBLICA (google.script.run):
 *   - ApiEndpoints_getAiInsights() → envelope ErrorHandling_execute
 *     { ok, data: { parecer, source: "gemini"|"local", model, basedOn,
 *       generatedAt }, error, meta }
 *
 * CONFIGURAÇÃO:
 *   - Propriedade de script GEMINI_API_KEY (script.google.com →
 *     Configurações do projeto → Propriedades do script). Opcional.
 *
 * INTEGRAÇÕES:
 *   - DashboardStats.gs (DashboardStats_get) — médias e totais dos alunos.
 *   - AnalysisService.gs (AnalysisService_getOverview) — prontidão NCA/SEM.
 *   - ErrorHandling.gs / PermissionManager.gs — envelope e acesso.
 * ============================================================================
 */

// FROTA-07: modelo lido da property do script, nunca hardcoded; cai no padrão local.
function ncaSemModel_() {
  try {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || 'gemini-2.0-flash';
  } catch (e) {
    LoggerService.info('NCA-SEM/FROTA-07 property indisponível: ' + e.message);
    return 'gemini-2.0-flash';
  }
}

var AI_INSIGHTS_CFG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 600
};

/**
 * Fronteira pública: parecer da IA sobre os resultados agregados dos
 * estudantes e a prontidão metodológica NCA/SEM.
 * @return {Object} Envelope { ok, data, error, meta }.
 */
function ApiEndpoints_getAiInsights(token) {
  try {
    return ErrorHandling_execute('analysis.aiInsights', function () {
      PermissionManager_assertAccess(token);
      var stats = DashboardStats_get();
      var overview = AnalysisService_getOverview();
      var generated = AiInsights_generate_(stats, overview);
      return {
        parecer: generated.text,
        source: generated.source,
        model: generated.source === 'gemini' ? ncaSemModel_() : 'local',
        basedOn: {
          alunos: overview.summary.alunos,
          escolas: overview.summary.escolas,
          professores: overview.summary.professores,
          coberturaMedia: overview.summary.averageCoverage,
          mediaMatematica: stats.mediaMatematica,
          mediaPortugues: stats.mediaPortugues,
          frequenciaMedia: stats.frequenciaMedia
        },
        generatedAt: new Date().toISOString()
      };
    });
  } catch (error) {
    Logger.log("Erro em ApiEndpoints_getAiInsights: " + error.message);
    throw error;
  }
}

/**
 * Gera o parecer: tenta o Gemini e degrada para o texto local sem lançar.
 * Normaliza resposta com GeminiResponseNormalizer para garantir segurança.
 * @param {Object} stats Saída de DashboardStats_get().
 * @param {Object} overview Saída de AnalysisService_getOverview().
 * @return {{text: string, source: string}}
 */
function AiInsights_generate_(stats, overview) {
  try {
    try {
      var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
      if (apiKey) {
        var text = AiInsights_callGemini_(apiKey, AiInsights_buildPrompt_(stats, overview));
        if (text) {
          // FROTA-XX: normalização defensiva de texto (trim, limite de tamanho)
          text = String(text || '').trim().substring(0, 3000);
          return { text: text, source: 'gemini' };
        }
      }
      return { text: AiInsights_fallback_(stats, overview), source: 'local' };
    } catch (error) {
      Logger.log("Erro em AiInsights_generate_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em AiInsights_generate_: " + error.message);
    throw error;
  }
}

/**
 * Prompt com APENAS agregados: médias da base de alunos, cobertura por
 * dimensão, status dos métodos NCA/SEM e prioridades já calculadas.
 * @param {Object} stats Estatísticas do dashboard.
 * @param {Object} overview Visão analítica.
 * @return {string}
 */
function AiInsights_buildPrompt_(stats, overview) {
  try {
    var dimensoes = (overview.dimensions || []).map(function (dim) {
      return '- ' + dim.label + ': cobertura de ' + dim.coverage + '% (' +
        dim.records + ' registros, status ' + dim.status + ')';
    }).join('\n');

    var metodos = (overview.methods || []).map(function (metodo) {
      var checks = (metodo.checks || []).map(function (check) {
        return '  * ' + check.label + ': ' + (check.passed ? 'OK' : 'pendente') +
          ' (' + check.detail + ')';
      }).join('\n');
      return '- ' + metodo.label + ' (' + metodo.description + '): ' +
        metodo.statusLabel + '\n' + checks;
    }).join('\n');

    var prioridades = (overview.priorities || []).map(function (item) {
      return '- ' + item;
    }).join('\n');

    return [
      'Voce e uma pesquisadora em metodos quantitativos aplicados a educacao,',
      'assessorando uma equipe escolar que prepara analises NCA (Necessary',
      'Condition Analysis) e SEM (Structural Equation Modeling) sobre fatores',
      'associados ao desempenho dos estudantes. Trate os constructos latentes',
      'como previamente especificados no modelo; não os apresente como fatores',
      'descobertos automaticamente.',
      '',
      'Resultados agregados dos estudantes (sem nenhum dado individual):',
      '- Alunos ativos: ' + overview.summary.alunos,
      '- Escolas: ' + overview.summary.escolas + ' | Professores: ' + overview.summary.professores,
      '- Media de matematica: ' + AiInsights_num_(stats.mediaMatematica),
      '- Media de portugues: ' + AiInsights_num_(stats.mediaPortugues),
      '- Frequencia media: ' + AiInsights_num_(stats.frequenciaMedia) + '%',
      '',
      'Cobertura de dados por dimensao:',
      dimensoes || '- (sem dimensoes)',
      '',
      'Prontidao metodologica (para exploracao inicial de padroes):',
      metodos || '- (sem metodos)',
      '',
      'Prioridades ja identificadas pelo sistema:',
      prioridades || '- (nenhuma)',
      '',
      'Escreva, em portugues do Brasil, um parecer de 4 a 6 frases que:',
      '(1) interprete o quadro geral do desempenho agregado dos estudantes;',
      '(2) avalie a prontidao tecnica para exploracao inicial de padroes NCA/SEM',
      '    (nao para inferencia causal), citando o principal gargalo;',
      '(3) recomende o proximo passo mais util para a equipe.',
      '',
      'REGRAS OBRIGATORIAS DE LINGUAGEM (fundamentos.md 3.5.5.2):',
      '─────────────────────────────────────────────────────────────────────',
      '⚠️ ASSOCIAÇÃO, NUNCA CAUSALIDADE:',
      '- Use SEMPRE "o modelo identifica associacao entre X e Y"',
      '  NUNCA use "X causa Y", "X produz Y", "X gera Y", "X determina Y"',
      '- Use SEMPRE "o modelo sugere relacao estrutural entre..."',
      '  NUNCA use "X leva a Y", "X resulta em Y", "X afeta Y"',
      '- Na NCA: descreva linhas de teto como "padroes compativeis com condicao',
      '  necessaria no escopo observado, cuja interpretacao causal requer validacao',
      '  adicional pela equipe pedagogica"',
      '  NUNCA use "X e condicao necessaria para Y" (afirmacao causal direta)',
      '- No SEM: descreva coeficientes como "relacoes estruturais do modelo"',
      '  NUNCA use "influencia de X sobre Y", "efeito de X em Y"',
      '- Sempre adicione: "a equipe deve avaliar se essas associacoes correspondem',
      '  a realidade pedagogica observada"',
      '- Qualifique SEMPRE: "o modelo sugere", "os dados sao compativeis com",',
      '  "o padrao observado e consistente com"',
      '- PROIBIDO afirmar causalidade direta mesmo que dados sejam fortes',
      '─────────────────────────────────────────────────────────────────────',
      '',
      'Tom tecnico, claro e honesto. Lembre que medias agregadas nao substituem a',
      'validacao estatistica do modelo. Nao invente numeros alem dos fornecidos.',
      'Nao use formatacao markdown, apenas texto corrido.'
    ].join('\n');
  } catch (error) {
    Logger.log("Erro em AiInsights_buildPrompt_: " + error.message);
    throw error;
  }
}

/**
 * Parecer determinístico local a partir dos mesmos agregados (sem LLM).
 * @param {Object} stats Estatísticas do dashboard.
 * @param {Object} overview Visão analítica.
 * @return {string}
 */
function AiInsights_fallback_(stats, overview) {
  try {
    var frases = [];
    frases.push('A base reune ' + overview.summary.alunos + ' alunos ativos em ' +
      overview.summary.escolas + ' escolas, com cobertura media de dados de ' +
      overview.summary.averageCoverage + '%.');

    if (stats.mediaMatematica !== null || stats.mediaPortugues !== null) {
      frases.push('As medias agregadas estao em ' + AiInsights_num_(stats.mediaMatematica) +
        ' (matematica) e ' + AiInsights_num_(stats.mediaPortugues) +
        ' (portugues), com frequencia media de ' + AiInsights_num_(stats.frequenciaMedia) + '%.');
    }

    (overview.methods || []).forEach(function (metodo) {
      frases.push('Metodo ' + metodo.label + ': ' + metodo.statusLabel + '.');
    });

    var prioridade = (overview.priorities || [])[0];
    if (prioridade) {
      frases.push('Proximo passo sugerido: ' + prioridade);
    }
    frases.push('Lembrete metodologico: medias agregadas nao substituem a validacao estatistica do modelo antes da execucao.');
    return frases.join(' ');
  } catch (error) {
    Logger.log("Erro em AiInsights_fallback_: " + error.message);
    throw error;
  }
}

/** Formata número agregado, tolerando null (campo sem dados). */
function AiInsights_num_(value) {
  try {
    return (value === null || value === undefined) ? 'sem dados' : String(value);
  } catch (error) {
    Logger.log("Erro em AiInsights_num_: " + error.message);
    throw error;
  }
}

/**
 * Ponto único de HTTP com o Gemini (generateContent), resiliente no padrão da
 * frota. Não lança: devolve null para o chamador degradar ao fallback local.
 * @param {string} apiKey Chave da API.
 * @param {string} prompt Prompt textual.
 * @return {?string} Texto gerado ou null.
 */
function AiInsights_callGemini_(apiKey, prompt) {
  try {
    var url = AI_INSIGHTS_CFG.BASE_URL + encodeURIComponent(ncaSemModel_()) +
      ':generateContent?key=' + encodeURIComponent(apiKey);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      }),
      muteHttpExceptions: true
    };

    var lastError = 'Falha desconhecida.';
    for (var attempt = 1; attempt <= AI_INSIGHTS_CFG.MAX_ATTEMPTS; attempt++) {
      try {
        var response = UrlFetchApp.fetch(url, options);
        var code = response.getResponseCode();
        if (code >= 200 && code < 300) {
          var json = AiInsights_safeParse_(response.getContentText());
          var text = json && json.candidates && json.candidates[0] &&
            json.candidates[0].content && json.candidates[0].content.parts &&
            json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
          if (text) {
            return String(text).trim();
          }
          lastError = 'Resposta do Gemini sem texto utilizavel.';
          break; // 2xx malformado não melhora com retry
        }
        lastError = 'Gemini HTTP ' + code;
        if (code !== 429 && code < 500) {
          break; // 4xx permanente (chave inválida, payload errado...)
        }
      } catch (error) {
        lastError = 'Rede: ' + (error && error.message ? error.message : error);
      }
      if (attempt < AI_INSIGHTS_CFG.MAX_ATTEMPTS) {
        Utilities.sleep(AI_INSIGHTS_CFG.BASE_DELAY_MS * Math.pow(2, attempt - 1) +
          Math.floor(Math.random() * AI_INSIGHTS_CFG.BASE_DELAY_MS));
      }
    }
    if (typeof LogManager_error === 'function') {
      LogManager_error('analysis.aiInsights.gemini', new Error(lastError), '');
    } else {
      LoggerService.error('AiInsights degradou para fallback local: ' + lastError);
    }
    return null;
  } catch (error) {
    Logger.log("Erro em AiInsights_callGemini_: " + error.message);
    throw error;
  }
}

/** JSON.parse defensivo: devolve null em vez de lançar SyntaxError cru. */
function AiInsights_safeParse_(text) {
  try {
    try {
      if (typeof text !== 'string' || !text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        return null;
      }
    } catch (error) {
      Logger.log("Erro em AiInsights_safeParse_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em AiInsights_safeParse_: " + error.message);
    throw error;
  }
}

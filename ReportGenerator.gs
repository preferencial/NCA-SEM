/**
 * ReportGenerator.gs — Consolida e formata os resultados NCA e SEM escritos
 * pelo notebook.py na aba Resultados_Analise.
 *
 * Gera dois artefatos a partir dos resultados disponíveis:
 *   1. Sumário estruturado (JSON) consumido pelo SemDashboard e NcaDashboard.
 *   2. Relatório textual em Markdown para exportação / e-mail.
 *
 * Não re-executa análise — lê o que o notebook.py já escreveu.
 *
 * ⚠️ AVISO METODOLÓGICO OBRIGATÓRIO (fundamentos.md 3.5.5.3):
 *   Relatórios incluem aviso explícito de que linhas de teto (NCA) e
 *   coeficientes estruturais (SEM) são PADRÕES ESTATÍSTICOS, NÃO mecanismos
 *   causais comprovados.
 *   
 *   GARANTIAS IMPLEMENTADAS:
 *   1. Markdown: seção "Aviso metodológico" destacada no final do relatório
 *   2. JSON NCA: campos 'escopoInterpretacao' e 'causalidadeDemonstrada: false'
 *   3. JSON SEM: campo 'causalInference: not_established'
 *   4. Cada resultado NCA: escopo explicita "necessidade empírica no escopo observado"
 *   5. Constructos SEM: campo 'latentConstructsSpecified' documenta origem (não descobertos)
 *   6. Aviso de validação obrigatória antes de decisões pedagógicas
 */

/**
 * Consolida NCA + SEM em um único objeto de apresentação.
 * Chamado por ApiEndpoints_getAnalysisReport.
 * @return {Object} { nca, sem, generatedAt, hasResults }
 */
function ReportGenerator_consolidate() {
  var ncaSummary  = NCA_Bridge_getSummary();
  var semSummary  = SEM_Bridge_getSummary();
  var hasResults  = ncaSummary.count > 0 || semSummary.status === 'pronto';

  return {
    hasResults  : hasResults,
    generatedAt : ncaSummary.generatedAt || semSummary.generatedAt || null,
    nca         : ReportGenerator_formatNca_(ncaSummary),
    sem         : ReportGenerator_formatSem_(semSummary)
  };
}

/**
 * Gera texto Markdown do relatório completo.
 * @return {string}
 */
function ReportGenerator_toMarkdown() {
  try {
    var report = ReportGenerator_consolidate();
    if (!report.hasResults) {
      return '# Relatório NCA-SEM\n\nNenhum resultado disponível. Execute o notebook.py primeiro.';
    }

    var lines = [
      '# Relatório NCA-SEM Educacional',
      '',
      '_Gerado em: ' + (report.generatedAt || new Date().toISOString()) + '_',
      '',
      '---',
      '',
      '## NCA — Necessary Condition Analysis',
      ''
    ];

    if (report.nca.resultados.length === 0) {
      lines.push('_Nenhum resultado NCA disponível._');
    } else {
      report.nca.resultados.forEach(function (r) {
        lines.push(
          '### ' + VariableMapper_label(r.x) + ' → ' + VariableMapper_label(r.y),
          '',
          '- **Efeito (d CE-FDH):** ' + (r.d !== null ? r.d : '—'),
          '- **Nível:** ' + (r.nivel || '—'),
          '- **Sinal de necessidade (limiar operacional):** ' + (r.sinalNecessidade ? 'Sim' : 'Não'),
          '- **Escopo:** necessidade empírica no escopo observado; **a linha de teto é um padrão estatístico, não demonstra causalidade direta.**',
          '- **Interpretação:** ' + (r.interpretacao || '—'),
          '',
          '> ⚠️ Este resultado indica *associação estrutural* compatível com condição necessária.',
          '> NÃO significa que ' + VariableMapper_label(r.x) + ' *causa* ' + VariableMapper_label(r.y) + '.',
          '> Validação pedagógica e controle de confundidores são obrigatórios.',
          ''
        );
      });
    }

    lines.push('---', '', '## SEM — Structural Equation Modeling', '');

    if (report.sem.status === 'bloqueado') {
      lines.push('> ⚠️ ' + (report.sem.mensagem || 'Análise bloqueada.'), '');
    } else if (report.sem.status === 'sem_dados') {
      lines.push('_Nenhum resultado SEM disponível._', '');
    } else {
      lines.push(
        '> ⚠️ **Coeficientes estruturais são PADRÕES DO MODELO, não efeitos causais comprovados.**',
        '> Ajuste estatístico (CFI, TLI, RMSEA) NÃO garante validade causal.',
        ''
      );
      
      lines.push('### Coeficientes de Caminho', '');
      if (report.sem.pathCoefficients.length === 0) {
        lines.push('_Nenhum coeficiente de caminho encontrado._', '');
      } else {
        lines.push('| Preditor | Resultado | Estimativa | Interpretação |');
        lines.push('|----------|-----------|-----------|---------------|');
        report.sem.pathCoefficients.forEach(function (c) {
          lines.push(
            '| ' + VariableMapper_label(c.preditor) +
            ' | ' + VariableMapper_label(c.resultado) +
            ' | ' + (c.estimativa !== null ? c.estimativa : '—') +
            ' | ' + (c.interpretacao || '—') + ' |'
          );
        });
        lines.push('');
      }

      lines.push('### Cargas de mensuração (constructos especificados)', '');
      if (report.sem.factorLoadings.length === 0) {
        lines.push('_Nenhuma carga fatorial encontrada._', '');
      } else {
        lines.push('| Constructo | Indicador | Carga |');
        lines.push('|------------|-----------|-------|');
        report.sem.factorLoadings.forEach(function (f) {
          lines.push(
            '| ' + VariableMapper_label(f.constructo) +
            ' | ' + VariableMapper_label(f.indicador) +
            ' | ' + (f.carga !== null ? f.carga : '—') + ' |'
          );
        });
        lines.push('');
      }
    }

    lines.push(
      '---',
      '',
      '## ⚠️ AVISO METODOLÓGICO OBRIGATÓRIO',
      '',
      '> **PADRÕES ESTATÍSTICOS, NÃO CAUSALIDADE COMPROVADA:**',
      '>',
      '> • **Linhas de teto (NCA):** são padrões empíricos compatíveis com',
      '>   condição necessária *no escopo observado*. NÃO demonstram que X',
      '>   *causa* Y ou que X é *condição necessária universal* para Y.',
      '>   Interpretação causal requer validação adicional pela equipe',
      '>   pedagógica considerando realidade local.',
      '>',
      '> • **Coeficientes estruturais (SEM):** são relações estruturais do',
      '>   modelo ajustado aos dados. NÃO demonstram que X *produz efeito* em Y.',
      '>   Ajuste estatístico (CFI, TLI, RMSEA) NÃO garante validade causal.',
      '>   Constructos latentes são os *especificados no modelo*, não fatores',
      '>   descobertos automaticamente.',
      '>',
      '> • **Validação obrigatória:** Antes de qualquer decisão pedagógica',
      '>   baseada nestes resultados, a equipe DEVE:',
      '>   1. Revisar poder estatístico (tamanho amostral adequado?)',
      '>   2. Verificar ajuste do modelo (índices dentro de critérios?)',
      '>   3. Avaliar plausibilidade pedagógica (padrão faz sentido na prática?)',
      '>   4. Considerar variáveis confundidoras (outros fatores omitidos?)',
      '>',
      '> • **Uso responsável:** Estes resultados são *indicativos para',
      '>   exploração*, não evidência conclusiva. Causalidade requer desenho',
      '>   experimental ou quase-experimental com controle de confundidores.',
      '',
      '_Data: ' + new Date().toISOString() + '_',
      ''
    );

    return lines.join('\n');
  } catch (error) {
    Logger.log("Erro em ReportGenerator_toMarkdown: " + error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Formatação interna
// ---------------------------------------------------------------------------

function ReportGenerator_formatNca_(ncaSummary) {
  try {
    return {
      count      : ncaSummary.count || 0,
      generatedAt: ncaSummary.generatedAt || null,
      resultados : (ncaSummary.results || []).map(function (r) {
        var parts = String(r.par || '').split(' → ');
        var signal = r.sinalNecessidade !== undefined ? r.sinalNecessidade : r.necessaria;
        return {
          x            : parts[0] || '',
          y            : parts[1] || '',
          xLabel       : VariableMapper_label(parts[0] || ''),
          yLabel       : VariableMapper_label(parts[1] || ''),
          d            : r.d,
          nivel        : r.nivel || null,
          necessaria   : Boolean(r.necessaria),
          sinalNecessidade: Boolean(signal),
          tipoEvidencia: r.tipoEvidencia || null,
          escopoInterpretacao: r.escopoInterpretacao || 'necessidade_empirica_no_escopo_observado',
          causalidadeDemonstrada: false,
          interpretacao: r.interpretacao || ''
        };
      })
    };
  } catch (error) {
    Logger.log("Erro em ReportGenerator_formatNca_: " + error.message);
    throw error;
  }
}

function ReportGenerator_formatSem_(semSummary) {
  try {
    var base = {
      status     : semSummary.status || 'sem_dados',
      mensagem   : semSummary.mensagem || null,
      generatedAt: semSummary.generatedAt || null,
      latentConstructsSpecified: semSummary.latentConstructsSpecified !== false,
      causalInference: semSummary.causalInference || 'not_established'
    };

    if (semSummary.status === 'bloqueado' || semSummary.status === 'sem_dados') {
      base.pathCoefficients = [];
      base.factorLoadings   = [];
      return base;
    }

    base.pathCoefficients = (semSummary.pathCoefficients || []).map(function (c) {
      return {
        preditor     : c.preditor,
        resultado    : c.resultado,
        preditorLabel: VariableMapper_label(c.preditor),
        resultadoLabel: VariableMapper_label(c.resultado),
        estimativa   : c.estimativa,
        interpretacao: c.interpretacao || ''
      };
    });

    base.factorLoadings = (semSummary.factorLoadings || []).map(function (f) {
      return {
        constructo     : f.constructo,
        indicador      : f.indicador,
        constructoLabel: VariableMapper_label(f.constructo),
        indicadorLabel : VariableMapper_label(f.indicador),
        carga          : f.carga,
        measurementRole: f.measurementRole || 'specified_construct_indicator_loading'
      };
    });

    return base;
  } catch (error) {
    Logger.log("Erro em ReportGenerator_formatSem_: " + error.message);
    throw error;
  }
}

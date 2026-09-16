/**
 * AnalysisService.gs — Análise de Viabilidade de Dados para NCA-SEM
 *
 * Pré-validação operacional da base para análises NCA e SEM.
 *
 * Os limiares indicam prontidão técnica de dados para iniciar a exploração
 * inicial de padrões estruturais; NÃO indicam "prontidão para inferência causal".
 * Não substituem validação metodológica, poder estatístico ou revisão humana.
 * 
 * ⚠️ TERMINOLOGIA CAUTELOSA (fundamentos.md 3.5.5.5):
 *   "Prontidão" refere-se a EXPLORAÇÃO INICIAL DE PADRÕES, não a inferência causal.
 *   
 *   GARANTIAS IMPLEMENTADAS:
 *   1. Disclaimer usa "Prontidão operacional", não "pronto para inferência causal"
 *   2. interpretationBoundaries explicita: NCA/SEM não demonstram causalidade
 *   3. Status 'ready' significa apenas "dados suficientes para executar cálculo"
 *   4. Evita linguagem como "pronto para concluir sobre causas"
 *   5. Clarifica: exploração de padrões ≠ estabelecimento de causalidade
 */

function AnalysisService_getOverview() {
  try {
    var alunos = SheetsDB_readAll('alunos').filter(function (record) {
      return record.status !== 'inativo';
    });
    var escolas = SheetsDB_readAll('escolas').filter(function (record) {
      return record.status !== 'inativo';
    });
    var professores = SheetsDB_readAll('professores');
    professores = professores.filter(function (record) {
      return record.status !== 'inativo';
    });

    var dimensions = [
      AnalysisService_dimension_(
        'desempenho',
        'Desempenho discente',
        alunos,
        ['notaMatematica', 'notaPortugues', 'frequencia']
      ),
      AnalysisService_dimension_(
        'contexto',
        'Contexto socioeconômico',
        alunos,
        ['rendaFamiliar']
      ),
      AnalysisService_dimension_(
        'docentes',
        'Valorização docente',
        professores,
        ['cargaHoraria', 'formacao', 'bolsa']
      ),
      AnalysisService_dimension_(
        'infraestrutura',
        'Infraestrutura escolar',
        escolas,
        ['totalSalas', 'temInternet', 'rede']
      )
    ];

    var performanceCoverage = dimensions[0].coverage;
    var contextCoverage = dimensions[1].coverage;
    var teacherCoverage = dimensions[2].coverage;
    var schoolCoverage = dimensions[3].coverage;

    var ncaChecks = [
      AnalysisService_condition_(
        'volume',
        'Ao menos 10 alunos ativos',
        alunos.length >= 10,
        alunos.length + ' alunos disponíveis'
      ),
      AnalysisService_condition_(
        'desempenho',
        'Cobertura de desempenho acima de 70%',
        performanceCoverage >= 70,
        performanceCoverage + '% de cobertura'
      )
    ];
    var semChecks = [
      AnalysisService_condition_(
        'volume',
        'Ao menos 30 alunos ativos',
        alunos.length >= 30,
        alunos.length + ' alunos disponíveis'
      ),
      AnalysisService_condition_(
        'rede',
        'Ao menos 3 escolas e 5 professores',
        escolas.length >= 3 && professores.length >= 5,
        escolas.length + ' escolas e ' + professores.length + ' professores'
      ),
      AnalysisService_condition_(
        'constructos',
        'Cobertura contextual, docente e escolar acima de 70%',
        contextCoverage >= 70 &&
          teacherCoverage >= 70 &&
          schoolCoverage >= 70,
        Math.min(contextCoverage, teacherCoverage, schoolCoverage) +
          '% na dimensão mais incompleta'
      )
    ];

    var methods = [
      AnalysisService_method_(
        'nca',
        'NCA',
        'Condições necessárias e gargalos',
        ncaChecks
      ),
      AnalysisService_method_(
        'sem',
        'SEM',
        'Relações entre contexto, docência e desempenho',
        semChecks
      )
    ];
    var priorities = AnalysisService_priorities_(
      alunos,
      escolas,
      professores,
      dimensions
    );

    return {
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Prontidão operacional para exploração inicial de padrões. A especificação do modelo, adequação estatística e interpretação causal devem ser validadas antes de decisões. "Pronto" indica viabilidade técnica de cálculo, não capacidade de inferência causal.',
      interpretationBoundaries: {
        nca: 'Linha de teto e padrão de necessidade no escopo observado; não demonstra causalidade direta. Exploração de padrões estruturais, não estabelecimento de causas.',
        sem: 'Relações estruturais e constructos especificados; não demonstram causalidade por si sós. Exploração de associações modeladas, não confirmação de mecanismos causais.',
        latentConstructs: 'Não são descobertos automaticamente pelo backend.'
      },
      summary: {
        alunos: alunos.length,
        escolas: escolas.length,
        professores: professores.length,
        averageCoverage: dimensions.length
          ? Math.round(
            dimensions.reduce(function (total, dimension) {
              return total + dimension.coverage;
            }, 0) / dimensions.length
          )
          : 0
      },
      dimensions: dimensions,
      methods: methods,
      priorities: priorities
    };
  } catch (error) {
    Logger.log("Erro em AnalysisService_getOverview: " + error.message);
    throw error;
  }
}

function AnalysisService_dimension_(id, label, records, fields) {
  try {
    var totalCells = records.length * fields.length;
    var filledCells = 0;
    records.forEach(function (record) {
      fields.forEach(function (field) {
        if (AnalysisService_hasValue_(record[field])) {
          filledCells += 1;
        }
      });
    });
    var coverage = totalCells
      ? Math.round((filledCells / totalCells) * 100)
      : 0;
    return {
      id: id,
      label: label,
      records: records.length,
      fields: fields,
      filledCells: filledCells,
      totalCells: totalCells,
      coverage: coverage,
      status: coverage >= 80
        ? 'strong'
        : (coverage >= 50 ? 'partial' : 'missing')
    };
  } catch (error) {
    Logger.log("Erro em AnalysisService_dimension_: " + error.message);
    throw error;
  }
}

function AnalysisService_condition_(id, label, passed, detail) {
  return {
    id: id,
    label: label,
    passed: Boolean(passed),
    detail: detail
  };
}

function AnalysisService_method_(id, label, description, checks) {
  try {
    var passed = checks.filter(function (check) {
      return check.passed;
    }).length;
    var ratio = checks.length ? passed / checks.length : 0;
    return {
      id: id,
      label: label,
      description: description,
      status: ratio === 1 ? 'ready' : (ratio > 0 ? 'partial' : 'blocked'),
      statusLabel: ratio === 1 ? 'Pronto para exploração' : (ratio > 0 ? 'Parcial' : 'Bloqueado'),
      checks: checks
    };
  } catch (error) {
    Logger.log("Erro em AnalysisService_method_: " + error.message);
    throw error;
  }
}

function AnalysisService_priorities_(alunos, escolas, professores, dimensions) {
  try {
    var priorities = [];
    if (!escolas.length) {
      priorities.push('Cadastre as escolas para estruturar os níveis de análise.');
    }
    if (!professores.length) {
      priorities.push('Cadastre professores e seus vínculos escolares.');
    }
    if (alunos.length < 10) {
      priorities.push('Amplie a base para pelo menos 10 alunos ativos antes da triagem NCA.');
    }
    dimensions
      .filter(function (dimension) {
        return dimension.coverage < 70;
      })
      .sort(function (left, right) {
        return left.coverage - right.coverage;
      })
      .forEach(function (dimension) {
        priorities.push(
          'Complete ' + dimension.label.toLowerCase() +
          ': cobertura atual de ' + dimension.coverage + '%.'
        );
      });
    if (!priorities.length) {
      priorities.push(
        'A base atingiu os limiares operacionais; revise a especificação do modelo antes de executar.'
      );
    }
    return priorities.slice(0, 6);
  } catch (error) {
    Logger.log("Erro em AnalysisService_priorities_: " + error.message);
    throw error;
  }
}

function AnalysisService_hasValue_(value) {
  if (value === null || typeof value === 'undefined') return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return isFinite(value);
  return true;
}

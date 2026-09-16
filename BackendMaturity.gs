/**
 * Diagnóstico de maturidade do backend.
 *
 * A análise lê o código do próprio projeto pela Apps Script API e produz um
 * relatório agregado. Nenhum arquivo-fonte completo é enviado ao frontend.
 */
var BACKEND_MATURITY_VERSION = '1.1.0';
var BACKEND_MATURITY_CACHE_KEY = 'backend-maturity:v1';
var BACKEND_MATURITY_CACHE_SECONDS = 300;

var BACKEND_MATURITY_CATEGORY_LABELS = Object.freeze({
  implementation: 'Implementação',
  architecture: 'Arquitetura',
  security: 'Segurança',
  reliability: 'Confiabilidade',
  data: 'Dados e performance',
  observability: 'Observabilidade',
  delivery: 'Testes e entrega',
  files: 'Drive e arquivos',
  userDemand: 'Demandas do usuário'
});

function BackendMaturity_getAssessment(options) {
  var forceRefresh = Boolean(options && options.force);
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(BACKEND_MATURITY_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        cache.remove(BACKEND_MATURITY_CACHE_KEY);
      }
    }
  }

  try {
    var project = BackendMaturity_loadProject_();
    var assessment = BackendMaturity_assessProject_(project.files);
    assessment.source = {
      mode: 'live',
      label: 'Análise ao vivo',
      message: 'Código HEAD do projeto lido pela Apps Script API.'
    };

    var serialized = JSON.stringify(assessment);
    if (serialized.length < 95000) {
      cache.put(
        BACKEND_MATURITY_CACHE_KEY,
        serialized,
        BACKEND_MATURITY_CACHE_SECONDS
      );
    }
    return assessment;
  } catch (error) {
    var snapshot = BackendMaturity_getSnapshot_();
    snapshot.source = {
      mode: 'snapshot',
      label: 'Snapshot local',
      message: BackendMaturity_sourceErrorMessage_(error)
    };
    return snapshot;
  }
}

function BackendMaturity_loadProject_() {
  try {
    try {
      var scriptId = ScriptApp.getScriptId();
      var endpoint =
        'https://script.googleapis.com/v1/projects/' +
        encodeURIComponent(scriptId) +
        '/content';
      var response = UrlFetchApp.fetch(endpoint, {
        method: 'get',
        headers: {
          Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
        },
        muteHttpExceptions: true
      });
      var statusCode = response.getResponseCode();
      var content = response.getContentText();

      if (statusCode < 200 || statusCode >= 300) {
        var apiError;
        try {
          apiError = JSON.parse(content);
        } catch (parseError) {
          apiError = null;
        }
        var message =
          apiError &&
          apiError.error &&
          apiError.error.message
            ? apiError.error.message
            : 'A Apps Script API respondeu com HTTP ' + statusCode + '.';
        var error = new Error(message);
        error.code = 'BACKEND_SOURCE_UNAVAILABLE';
        error.httpStatus = statusCode;
        throw error;
      }

      var payload = JSON.parse(content);
      return {
        scriptId: payload.scriptId || scriptId,
        files: payload.files || []
      };
    } catch (error) {
      Logger.log("Erro em BackendMaturity_loadProject_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em BackendMaturity_loadProject_: " + error.message);
    throw error;
  }
}

function BackendMaturity_assessProject_(projectFiles) {
  var inventory = BackendMaturity_createInventory_(projectFiles);
  var checks = BackendMaturity_evaluateChecks_(inventory);
  var categories = BackendMaturity_summarizeCategories_(checks);
  // Normaliza para 0-100: a soma dos pesos dos checks pode exceder 100, o que
  // antes permitia score > 100 e estourava a escala de niveis. Dividimos a soma
  // ponderada pela soma dos pesos para manter a pontuacao sempre em 0-100.
  var totalWeight = checks.reduce(function (total, check) {
    return total + check.weight;
  }, 0);
  var weightedScore = checks.reduce(function (total, check) {
    return total + check.score;
  }, 0);
  var score = totalWeight
    ? BackendMaturity_round_((weightedScore / totalWeight) * 100, 1)
    : 0;
  var level = BackendMaturity_levelForScore_(score);
  var priorities = checks
    .filter(function (check) {
      return check.gap > 0.15;
    })
    .sort(function (left, right) {
      if (right.gap !== left.gap) {
        return right.gap - left.gap;
      }
      return right.weight - left.weight;
    })
    .slice(0, 10)
    .map(function (check, index) {
      return {
        rank: index + 1,
        id: check.id,
        category: check.category,
        categoryLabel: check.categoryLabel,
        title: check.title,
        status: check.status,
        statusLabel: check.statusLabel,
        gap: check.gap,
        recommendation: check.recommendation
      };
    });

  return {
    toolVersion: BACKEND_MATURITY_VERSION,
    projectName: Config_get().appName,
    generatedAt: new Date().toISOString(),
    profile: 'Google Apps Script',
    score: score,
    level: level,
    inventory: {
      scannedFiles: inventory.files.length,
      sourceFiles: inventory.sourceFiles.length,
      implementedSourceFiles: inventory.implementedFiles.length,
      stubSourceFiles: inventory.stubFiles.length,
      implementationRate: inventory.sourceFiles.length
        ? BackendMaturity_round_(
          inventory.implementedFiles.length / inventory.sourceFiles.length,
          3
        )
        : 0
    },
    categories: categories,
    checks: checks,
    priorities: priorities
  };
}

function BackendMaturity_createInventory_(projectFiles) {
  var files = (projectFiles || []).map(function (file) {
    var extension = BackendMaturity_extensionForType_(file.type);
    return {
      name: String(file.name || 'sem-nome') + extension,
      type: String(file.type || ''),
      source: String(file.source || '')
    };
  });
  var sourceFiles = files.filter(function (file) {
    return file.type === 'SERVER_JS' &&
      !BackendMaturity_isTestFileName_(file.name);
  });
  var implementedFiles = sourceFiles.filter(function (file) {
    return BackendMaturity_isImplemented_(file.source);
  });
  var implementedNames = {};
  implementedFiles.forEach(function (file) {
    implementedNames[file.name] = true;
  });

  return {
    files: files,
    sourceFiles: sourceFiles,
    implementedFiles: implementedFiles,
    stubFiles: sourceFiles.filter(function (file) {
      return !implementedNames[file.name];
    })
  };
}

function BackendMaturity_extensionForType_(type) {
  if (type === 'SERVER_JS') {
    return '.gs';
  }
  if (type === 'HTML') {
    return '.html';
  }
  if (type === 'JSON') {
    return '.json';
  }
  return '';
}

function BackendMaturity_isImplemented_(source) {
  var stripped = BackendMaturity_stripComments_(source);
  var meaningful = stripped
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim();
    })
    .filter(function (line) {
      return line &&
        line !== '{' &&
        line !== '}' &&
        line !== '};' &&
        !/^(function\b|var\s+\w+\s*=\s*function\b)/.test(line);
    });
  var lowered = stripped.toLowerCase();
  var hasStubMarker = [
    'implementação inicial',
    'implementacao inicial',
    'not implemented',
    'todo: implement'
  ].some(function (marker) {
    return lowered.indexOf(marker) !== -1;
  });

  return meaningful.length >= 3 && !(meaningful.length <= 5 && hasStubMarker);
}

function BackendMaturity_stripComments_(source) {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function BackendMaturity_evaluateChecks_(inventory) {
  var checks = [];
  var sourceCount = inventory.sourceFiles.length;
  var implementedCount = inventory.implementedFiles.length;
  var implementationRatio = sourceCount
    ? implementedCount / sourceCount
    : 0;

  checks.push(BackendMaturity_makeCheck_(
    'implementation.sources',
    'implementation',
    'Fontes de backend detectadas',
    3,
    sourceCount ? 1 : 0,
    BackendMaturity_fileEvidence_(inventory.sourceFiles, 5),
    'Adicionar módulos executáveis do backend ao projeto.'
  ));
  checks.push(BackendMaturity_makeCheck_(
    'implementation.real_code',
    'implementation',
    'Módulos com lógica real',
    12,
    implementationRatio,
    BackendMaturity_fileEvidence_(inventory.implementedFiles, 5),
    'Substituir módulos placeholder por fluxos completos, começando por entrada, autenticação, dados e erros.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'implementation.entrypoints',
    'implementation',
    'Pontos de entrada executáveis',
    5,
    [/\bfunction\s+(doGet|doPost|onOpen|onEdit|onFormSubmit)\s*\(/],
    2,
    'Implementar e testar os pontos de entrada usados pela UI, webhooks e automações.'
  ));

  checks.push(BackendMaturity_namedImplementationCheck_(
    inventory,
    'architecture.separation',
    'architecture',
    'Separação de responsabilidades',
    5,
    /(service|repository|crud|router|endpoint|manager|orchestrator|bridge|validation|config)/i,
    5,
    'Separar entrada, regras de negócio, dados e integrações em módulos coesos.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'architecture.configuration',
    'architecture',
    'Configuração externa e centralizada',
    4,
    [
      /PropertiesService\.getScriptProperties\s*\(/,
      /getProperty\s*\(/,
      /\bAPP_CONFIG\b/
    ],
    2,
    'Centralizar configuração e manter IDs e segredos fora do código-fonte.'
  ));
  checks.push(BackendMaturity_namedImplementationCheck_(
    inventory,
    'architecture.services',
    'architecture',
    'Serviços e domínio explícitos',
    3,
    /(service|repository|crud|orchestrator|bridge|domain)/i,
    4,
    'Mover regras de negócio para serviços implementados e manter handlers finos.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'architecture.contracts',
    'architecture',
    'Contratos técnicos documentados',
    3,
    [
      /\bok\s*:\s*(true|false)/,
      /\brequestId\b/,
      /@param\b|@returns\b/,
      /Fachada pública|Envelope padrão|contrato/i
    ],
    3,
    'Documentar contratos, respostas, erros e dependências operacionais.'
  ));

  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'security.authentication',
    'security',
    'Autenticação implementada',
    5,
    [
      /Session\.getActiveUser\s*\(/,
      /getCurrentUser\s*\(/,
      /\bauthenticated\b/
    ],
    2,
    'Validar a identidade do usuário no backend antes de acessar dados protegidos.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'security.authorization',
    'security',
    'Autorização por operação',
    4,
    [
      /assertAccess\s*\(/,
      /require(Role|Permission)\s*\(/,
      /\bFORBIDDEN\b/,
      /allowedEmails/i
    ],
    3,
    'Aplicar autorização no backend em cada operação protegida, não apenas na interface.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'security.validation',
    'security',
    'Validação e sanitização de entrada',
    4,
    [
      /validate[A-Z_]\w*\s*\(/,
      /sanitize[A-Z_]\w*\s*\(/,
      /VALIDATION_ERROR/,
      /aria-invalid/
    ],
    3,
    'Validar tipo, formato, tamanho e domínio de todos os dados recebidos.'
  ));
  checks.push(BackendMaturity_secretCheck_(inventory));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'security.session',
    'security',
    'Sessão e proteção de requisições',
    3,
    [
      /Session\.getActiveUser\s*\(/,
      /ScriptApp\.getOAuthToken\s*\(/,
      /\brequestId\b/
    ],
    2,
    'Vincular operações à sessão e manter correlação por requisição.'
  ));

  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'reliability.errors',
    'reliability',
    'Tratamento consistente de erros',
    4,
    [
      /\btry\s*\{/,
      /\bcatch\s*\(/,
      /ErrorHandling_execute\s*\(/,
      /finally\s*\{/
    ],
    3,
    'Padronizar tratamento de erros, mensagens seguras e liberação de recursos.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'reliability.concurrency',
    'reliability',
    'Controle de concorrência',
    3,
    [
      /LockService\./,
      /waitLock\s*\(/,
      /tryLock\s*\(/
    ],
    2,
    'Proteger escritas concorrentes com locks e limites de espera.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'reliability.integrations',
    'reliability',
    'Resiliência em integrações',
    3,
    [
      /\bretry\b/i,
      /\bbackoff\b/i,
      /muteHttpExceptions/,
      /getResponseCode\s*\(/,
      /\bidempot/i
    ],
    4,
    'Adicionar timeout, retry com backoff, idempotência e tratamento de respostas externas.'
  ));
  checks.push(BackendMaturity_namedImplementationCheck_(
    inventory,
    'reliability.recovery',
    'reliability',
    'Backup, migração e integridade',
    3,
    /(backup|migration|schema|integrity)/i,
    3,
    'Implementar backup restaurável, migrações versionadas e verificações de integridade.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'reliability.triggers',
    'reliability',
    'Automações e triggers controlados',
    2,
    [
      /\bfunction\s+(onOpen|onEdit|onFormSubmit|doGet|doPost)\s*\(/,
      /ScriptApp\.newTrigger\s*\(/
    ],
    2,
    'Documentar e monitorar os gatilhos que alteram dados ou executam rotinas.'
  ));

  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'data.access',
    'data',
    'Camada de acesso a dados',
    3,
    [
      /SpreadsheetApp\./,
      /SheetsDB_/,
      /getRange\s*\(/
    ],
    3,
    'Concentrar acesso a dados em uma camada com contratos claros.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'data.batch',
    'data',
    'Operações em lote',
    3,
    [
      /getValues\s*\(/,
      /setValues\s*\(/,
      /appendRow\s*\(/
    ],
    2,
    'Preferir leituras e escritas em lote para reduzir chamadas ao Google Sheets.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'data.cache',
    'data',
    'Cache com estratégia explícita',
    2,
    [
      /CacheService\.get(Script|User|Document)Cache\s*\(/,
      /\.put\s*\([^,]+,[^,]+,\s*\d+/,
      /\.remove\s*\(/
    ],
    3,
    'Implementar cache apenas para leituras adequadas, com TTL e invalidação definidos.'
  ));
  checks.push(BackendMaturity_namedImplementationCheck_(
    inventory,
    'data.integrations',
    'data',
    'Integrações externas encapsuladas',
    2,
    /(integration|client|bridge|orchestrator|gateway)/i,
    3,
    'Centralizar clientes externos e seus contratos, limites e políticas de falha.'
  ));

  // --- Novas métricas de Sinergia de Planilhas e Fixtures ---
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'data.schema_v2',
    'data',
    'Uso do FLEET_AI_SCHEMA_V2',
    4,
    [
      /FLEET_AI_SCHEMA_V2/
    ],
    1,
    'O SchemaService deve utilizar o motor FLEET_AI_SCHEMA_V2 para consolidar declarações.'
  ));
  checks.push(BackendMaturity_analyticalEntitiesCheck_(inventory));


  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'observability.logging',
    'observability',
    'Logging centralizado',
    4,
    [
      /LogManager_(info|error)\s*\(/,
      /console\.(log|error|warn)\s*\(/,
      /\blevel\s*:/
    ],
    3,
    'Centralizar logs estruturados com nível, operação e contexto.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'observability.audit',
    'observability',
    'Trilha de auditoria',
    2,
    [
      /LogManager_audit\s*\(/,
      /\bactor\b/,
      /\bentityId\b/,
      /\bAUDIT\b/
    ],
    3,
    'Registrar alterações sensíveis com ator, ação, alvo, resultado e data.'
  ));
  checks.push(BackendMaturity_namedImplementationCheck_(
    inventory,
    'observability.health',
    'observability',
    'Diagnóstico de saúde',
    2,
    /(health|integrity|diagnostic|status)/i,
    2,
    'Criar diagnóstico verificável para configuração, dados, integrações e quotas.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'observability.metrics',
    'observability',
    'Métricas e correlação',
    2,
    [
      /\bdurationMs\b/,
      /\brequestId\b/,
      /\blatency\b/i,
      /\bquota\b/i
    ],
    3,
    'Medir latência, falhas, volume e quotas, correlacionando operações distribuídas.'
  ));


  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'files.drive_folder_config',
    'files',
    'Configuração de pastas Drive',
    3,
    [
      /DriveFolderConfig/,
      /INPUT_FOLDER_ID/,
      /OUTPUT_FOLDER_ID/,
      /BACKUP_FOLDER_ID/
    ],
    2,
    'Centralizar as pastas Drive realmente usadas em DriveFolderConfig.gs e Script Properties.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'files.input_output_backup',
    'files',
    'Fluxos de entrada, saída e backup',
    4,
    [
      /InputOutputFolderService/,
      /BackupFolderService/,
      /DriveApp\.(getFolderById|createFolder|createFile)/,
      /makeCopy\s*\(/
    ],
    3,
    'Conectar importações, artefatos gerados e backups às pastas INPUT/OUTPUT/BACKUP conforme a função real do projeto.'
  ));

  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'user_demand.core_requests',
    'userDemand',
    '3 ou 4 requisições centrais dos usuários',
    5,
    [
      /doPost|doGet|route|handler|endpoint/i,
      /import|upload|receive|csv|payload/i,
      /analysis|analise|analyze|process|score|rank|predict|classify/i,
      /report|dashboard|summary|export|pdf|csv/i
    ],
    4,
    'Identificar e manter handlers backend claros para os principais pedidos de processamento e análise dos usuários.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'user_demand.traceability',
    'userDemand',
    'Rastreabilidade das requisições principais',
    3,
    [
      /log|audit|requestId|trace|metric/i,
      /test|assert|expect|workflow/i,
      /snapshot|history|status/i
    ],
    3,
    'Adicionar logs, testes e histórico para os fluxos mais acionados.'
  ));
  checks.push(BackendMaturity_testCheck_(inventory));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'delivery.runner',
    'delivery',
    'Execução padronizada de testes',
    2,
    [
      /function\s+run(All)?Tests\s*\(/i,
      /npm\s+(run\s+)?test/i,
      /python\s+-m\s+(pytest|unittest)/i
    ],
    2,
    'Definir um comando ou função única e documentada para executar toda a suíte.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'delivery.ci',
    'delivery',
    'Integração contínua',
    2,
    [
      /github\/workflows/i,
      /\bCI\b.*\b(test|lint|deploy)/i,
      /fail-under/i
    ],
    2,
    'Executar análise, testes e limiar de maturidade automaticamente antes de publicar.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'delivery.deploy',
    'delivery',
    'Configuração e deploy documentados',
    2,
    [
      /appsscript\.json/,
      /\bversion\b/,
      /\bdeployment\b/i,
      /PropertiesService/
    ],
    3,
    'Documentar escopos, propriedades, publicação e procedimento de rollback.'
  ));

  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'delivery.ai_fixtures',
    'delivery',
    'Catálogo de Fixtures Analíticos',
    3,
    [
      /AiFixtureCatalog/,
      /acompanhamento prioritário/i,
      /evolução consistente/i
    ],
    3,
    'Implementar AiFixtureCatalog com cenários contrastantes de domínio.'
  ));
  checks.push(BackendMaturity_patternCheck_(
    inventory,
    'delivery.strict_seeder',
    'delivery',
    'Seeder rigoroso (DataSeeder)',
    3,
    [
      /DataSeeder/,
      /AiFixtureCatalog/,
      /cabeçalhos|headers?.*match|validação exata/i
    ],
    3,
    'O DataSeeder deve validar cabeçalhos exatos e semear apenas do catálogo, ignorando abas administrativas.'
  ));

  return checks;
}

function BackendMaturity_patternCheck_(
  inventory,
  id,
  category,
  title,
  weight,
  patterns,
  targetCount,
  recommendation
) {
  var evidence = BackendMaturity_findEvidence_(
    inventory.files,
    patterns,
    5
  );
  var ratio = Math.min(1, evidence.length / targetCount);
  return BackendMaturity_makeCheck_(
    id,
    category,
    title,
    weight,
    ratio,
    evidence,
    recommendation
  );
}

function BackendMaturity_namedImplementationCheck_(
  inventory,
  id,
  category,
  title,
  weight,
  namePattern,
  targetCount,
  recommendation
) {
  var matches = inventory.implementedFiles.filter(function (file) {
    return namePattern.test(file.name);
  });
  return BackendMaturity_makeCheck_(
    id,
    category,
    title,
    weight,
    Math.min(1, matches.length / targetCount),
    BackendMaturity_fileEvidence_(matches, 5),
    recommendation
  );
}

function BackendMaturity_secretCheck_(inventory) {
  var safeEvidence = BackendMaturity_findEvidence_(
    inventory.files,
    [
      /PropertiesService\.getScriptProperties\s*\(/,
      /getProperty\s*\(/
    ],
    5
  );
  var hardcoded = BackendMaturity_findEvidence_(
    inventory.sourceFiles,
    [
      /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{6,}['"]/i
    ],
    3
  );
  var ratio = safeEvidence.length
    ? (hardcoded.length ? 0.25 : 1)
    : (hardcoded.length ? 0 : 0.35);
  return BackendMaturity_makeCheck_(
    'security.secrets',
    'security',
    'Gestão de segredos e credenciais',
    4,
    ratio,
    hardcoded.length ? hardcoded : safeEvidence,
    'Remover credenciais e senhas do código; usar Script Properties e rotação de segredos.'
  );
}

// Reconhece nomes de teste com separadores (foo_test, test.bar) E camelCase
// (SchoolRealityWorkflowTest, AuthSpec), sem casar palavras como "Especie".
function BackendMaturity_isTestFileName_(name) {
  return /(^|[._\-])(test|spec)s?([._\-]|$)/i.test(name) ||
    /[a-z0-9](Test|Spec)s?([._\-]|[A-Z]|$)/.test(name);
}

function BackendMaturity_testCheck_(inventory) {
  var testFiles = inventory.files.filter(function (file) {
    // Detecta tambem assercoes customizadas (assertSchoolRealityWorkflow_X(...))
    // e funcoes de teste declaradas (function testFoo(...)), nao so assert()/expect().
    return BackendMaturity_isTestFileName_(file.name) ||
      /\b(assert|expect)\w*\s*\(/.test(file.source) ||
      /function\s+test\w*\s*\(/i.test(file.source);
  });
  return BackendMaturity_makeCheck_(
    'delivery.tests',
    'delivery',
    'Testes automatizados',
    4,
    Math.min(1, testFiles.length / 3),
    BackendMaturity_fileEvidence_(testFiles, 5),
    'Cobrir autenticação, permissões, validação, escrita de dados e falhas de integração.'
  );
}

function BackendMaturity_analyticalEntitiesCheck_(inventory) {
  var schemaFiles = inventory.files.filter(function (file) {
    return file.name.indexOf('SchemaService.gs') !== -1;
  });
  
  if (schemaFiles.length === 0) {
    return BackendMaturity_makeCheck_(
      'data.analytical_entities',
      'data',
      'Entidades Analíticas Comprovadas',
      5,
      0,
      [],
      'Nenhum SchemaService.gs encontrado. Defina o schema do domínio.'
    );
  }
  
  var source = schemaFiles[0].source;
  
  // Extrai declarações de abas/tabelas no esquema
  // Busca por nomes literais que parecem definir abas, ex: name: 'Config', name: 'Alunos'
  var tableNames = [];
  var match;
  var regex = /(?:name|tab|entity)\s*:\s*['"]([^'"]+)['"]/g;
  while ((match = regex.exec(source)) !== null) {
    tableNames.push(match[1]);
  }
  
  // Tentar encontrar as chaves de objetos que possam representar tabelas
  var keyRegex = /(?:\b([A-Z][a-zA-Z0-9_]*)\s*:\s*\{[^}]*columns)/g;
  while ((match = keyRegex.exec(source)) !== null) {
    tableNames.push(match[1]);
  }
  
  var admTerms = /^(Config|Settings|Users|Audit|Log|Admin|Roles|Permissions|Credentials)/i;
  var analyticalTables = tableNames.filter(function(name) {
    return !admTerms.test(name) && name.length > 2;
  });
  
  // Penalidade se existirem tabelas, mas nenhuma for analítica
  var hasAdmOnly = tableNames.length > 0 && analyticalTables.length === 0;
  // Bônus se tiver entidades analíticas comprovadas (pelo menos 2)
  var ratio = (hasAdmOnly || tableNames.length === 0) ? 0 : Math.min(1, analyticalTables.length / 2);
  
  return BackendMaturity_makeCheck_(
    'data.analytical_entities',
    'data',
    'Entidades Analíticas Comprovadas',
    5,
    ratio,
    BackendMaturity_fileEvidence_(schemaFiles, 1),
    'O esquema não pode expor apenas tabelas administrativas (Logs, Config). Deve comprovar entidades reais do domínio da aplicação.'
  );
}

function BackendMaturity_makeCheck_(
  id,
  category,
  title,
  weight,
  ratio,
  evidence,
  recommendation
) {
  var boundedRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  var score = BackendMaturity_round_(weight * boundedRatio, 2);
  var status = BackendMaturity_statusForRatio_(boundedRatio);
  return {
    id: id,
    category: category,
    categoryLabel: BACKEND_MATURITY_CATEGORY_LABELS[category],
    title: title,
    weight: weight,
    ratio: BackendMaturity_round_(boundedRatio, 3),
    score: score,
    gap: BackendMaturity_round_(weight - score, 2),
    status: status.code,
    statusLabel: status.label,
    evidence: evidence || [],
    recommendation: recommendation
  };
}

function BackendMaturity_findEvidence_(files, patterns, maxResults) {
  var evidence = [];
  var limit = maxResults || 5;

  (files || []).some(function (file) {
    var lines = String(file.source || '').split(/\r?\n/);
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      var line = lines[lineIndex];
      var matches = patterns.some(function (pattern) {
        pattern.lastIndex = 0;
        return pattern.test(line);
      });
      if (matches) {
        evidence.push({
          path: file.name,
          line: lineIndex + 1,
          excerpt: BackendMaturity_redactExcerpt_(line)
        });
        break;
      }
    }
    return evidence.length >= limit;
  });

  return evidence;
}

function BackendMaturity_fileEvidence_(files, maxResults) {
  return (files || []).slice(0, maxResults || 5).map(function (file) {
    return {
      path: file.name,
      line: 1,
      excerpt: 'Arquivo detectado'
    };
  });
}

function BackendMaturity_redactExcerpt_(line) {
  var compact = String(line || '').replace(/\s+/g, ' ').trim();
  compact = compact.replace(
    /((password|passwd|secret|api[_-]?key|token)\s*[:=]\s*)['"][^'"]+['"]/ig,
    '$1"[REDACTED]"'
  );
  if (compact.length > 180) {
    compact = compact.slice(0, 177) + '...';
  }
  return compact;
}

function BackendMaturity_summarizeCategories_(checks) {
  return Object.keys(BACKEND_MATURITY_CATEGORY_LABELS).map(function (category) {
    var categoryChecks = checks.filter(function (check) {
      return check.category === category;
    });
    var weight = categoryChecks.reduce(function (total, check) {
      return total + check.weight;
    }, 0);
    var score = categoryChecks.reduce(function (total, check) {
      return total + check.score;
    }, 0);
    return {
      id: category,
      label: BACKEND_MATURITY_CATEGORY_LABELS[category],
      score: BackendMaturity_round_(score, 2),
      weight: weight,
      ratio: weight
        ? BackendMaturity_round_(score / weight, 3)
        : 0
    };
  });
}

function BackendMaturity_statusForRatio_(ratio) {
  if (ratio >= 0.85) {
    return { code: 'strong', label: 'Forte' };
  }
  if (ratio >= 0.45) {
    return { code: 'partial', label: 'Parcial' };
  }
  if (ratio > 0) {
    return { code: 'initial', label: 'Inicial' };
  }
  return { code: 'missing', label: 'Ausente' };
}

function BackendMaturity_levelForScore_(score) {
  if (score <= 20) {
    return {
      number: 1,
      name: 'Inicial',
      description: 'Dependência de esforço manual e alto risco operacional.'
    };
  }
  if (score <= 40) {
    return {
      number: 2,
      name: 'Repetível',
      description: 'A estrutura existe, mas a execução ainda é inconsistente.'
    };
  }
  if (score <= 60) {
    return {
      number: 3,
      name: 'Definido',
      description: 'Práticas essenciais implementadas e documentadas.'
    };
  }
  if (score <= 80) {
    return {
      number: 4,
      name: 'Gerenciado',
      description: 'Qualidade medida, automatizada e controlada.'
    };
  }
  return {
    number: 5,
    name: 'Otimizado',
    description: 'Melhoria contínua orientada por métricas.'
  };
}

function BackendMaturity_round_(value, digits) {
  var factor = Math.pow(10, digits || 0);
  return Math.round((Number(value) || 0) * factor) / factor;
}

function BackendMaturity_sourceErrorMessage_(error) {
  var detail = error && error.message ? error.message : 'fonte indisponível';
  return (
    'Não foi possível ler o código ao vivo (' +
    detail +
    '). Exibindo o último snapshot conhecido. Habilite a Apps Script API e ' +
    'autorize os escopos script.projects.readonly e script.external_request.'
  );
}

function BackendMaturity_getSnapshot_() {
  var categoryValues = [
    ['implementation', 9.9, 20],
    ['architecture', 12.8, 15],
    ['security', 15.8, 20],
    ['reliability', 9.6, 15],
    ['data', 7.4, 10],
    ['observability', 6.7, 10],
    ['delivery', 2, 10]
  ];
  var snapshotChecks = [
    ['implementation.real_code', 'implementation', 'Módulos com lógica real', 12, 4.4, 'initial', 'Inicial', 'Substituir módulos placeholder por fluxos completos, começando por entrada, autenticação, dados e erros.'],
    ['security.secrets', 'security', 'Gestão de segredos e credenciais', 4, 0.8, 'initial', 'Inicial', 'Remover credenciais e senhas do código; usar Script Properties e rotação de segredos.'],
    ['implementation.entrypoints', 'implementation', 'Pontos de entrada executáveis', 5, 2.5, 'partial', 'Parcial', 'Implementar e testar os pontos de entrada usados pela UI, webhooks e automações.'],
    ['security.authorization', 'security', 'Autorização por operação', 4, 3, 'partial', 'Parcial', 'Aplicar autorização no backend em cada operação protegida, não apenas na interface.'],
    ['reliability.integrations', 'reliability', 'Resiliência em integrações', 3, 0, 'missing', 'Ausente', 'Adicionar timeout, retry com backoff, idempotência e tratamento de respostas externas.'],
    ['reliability.recovery', 'reliability', 'Backup, migração e integridade', 3, 0.6, 'initial', 'Inicial', 'Implementar backup restaurável, migrações versionadas e verificações de integridade.'],
    ['data.cache', 'data', 'Cache com estratégia explícita', 2, 0.4, 'initial', 'Inicial', 'Implementar cache apenas para leituras adequadas, com TTL e invalidação definidos.'],
    ['data.integrations', 'data', 'Integrações externas encapsuladas', 2, 1, 'partial', 'Parcial', 'Centralizar clientes externos e seus contratos, limites e políticas de falha.'],
    ['delivery.tests', 'delivery', 'Testes automatizados', 4, 0, 'missing', 'Ausente', 'Cobrir autenticação, permissões, validação, escrita de dados e falhas de integração.'],
    ['delivery.runner', 'delivery', 'Execução padronizada de testes', 2, 0, 'missing', 'Ausente', 'Definir um comando ou função única e documentada para executar toda a suíte.']
  ];
  var checks = snapshotChecks.map(function (item) {
    return {
      id: item[0],
      category: item[1],
      categoryLabel: BACKEND_MATURITY_CATEGORY_LABELS[item[1]],
      title: item[2],
      weight: item[3],
      score: item[4],
      ratio: BackendMaturity_round_(item[4] / item[3], 3),
      gap: BackendMaturity_round_(item[3] - item[4], 2),
      status: item[5],
      statusLabel: item[6],
      evidence: [],
      recommendation: item[7]
    };
  });
  var priorities = checks
    .slice()
    .sort(function (left, right) {
      return right.gap - left.gap;
    })
    .map(function (check, index) {
      return {
        rank: index + 1,
        id: check.id,
        category: check.category,
        categoryLabel: check.categoryLabel,
        title: check.title,
        status: check.status,
        statusLabel: check.statusLabel,
        gap: check.gap,
        recommendation: check.recommendation
      };
    });

  return {
    toolVersion: BACKEND_MATURITY_VERSION,
    projectName: Config_get().appName,
    generatedAt: '2026-06-05T15:24:36.000Z',
    profile: 'Google Apps Script',
    score: 64.1,
    level: BackendMaturity_levelForScore_(64.1),
    inventory: {
      scannedFiles: 41,
      sourceFiles: 41,
      implementedSourceFiles: 15,
      stubSourceFiles: 26,
      implementationRate: 0.366
    },
    categories: categoryValues.map(function (item) {
      return {
        id: item[0],
        label: BACKEND_MATURITY_CATEGORY_LABELS[item[0]],
        score: item[1],
        weight: item[2],
        ratio: BackendMaturity_round_(item[1] / item[2], 3)
      };
    }),
    checks: checks,
    priorities: priorities
  };
}



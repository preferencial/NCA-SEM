/**
 * Diagnóstico de maturidade e intuitividade do frontend.
 *
 * A análise lê os arquivos HTML do próprio projeto pela Apps Script API e
 * devolve somente métricas e trechos curtos de evidência.
 */
var FRONTEND_MATURITY_VERSION = '1.0.0';
var FRONTEND_MATURITY_CACHE_KEY = 'frontend-maturity:v1';
var FRONTEND_MATURITY_CACHE_SECONDS = 300;

var FRONTEND_MATURITY_CATEGORY_LABELS = Object.freeze({
  implementation: 'Implementação',
  intuition: 'Intuitividade',
  accessibility: 'Acessibilidade',
  responsive: 'Responsividade e consistência',
  feedback: 'Feedback e estados',
  performance: 'Performance',
  delivery: 'Testes e entrega'
});

function FrontendMaturity_getAssessment(options) {
  var forceRefresh = Boolean(options && options.force);
  var cache = CacheService.getScriptCache();

  if (!forceRefresh) {
    var cached = cache.get(FRONTEND_MATURITY_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        cache.remove(FRONTEND_MATURITY_CACHE_KEY);
      }
    }
  }

  try {
    var project = FrontendMaturity_loadProject_();
    var assessment = FrontendMaturity_assessProject_(project.files);
    assessment.source = {
      mode: 'live',
      label: 'Análise ao vivo',
      message: 'Interface HEAD do projeto lida pela Apps Script API.'
    };

    var serialized = JSON.stringify(assessment);
    if (serialized.length < 95000) {
      cache.put(
        FRONTEND_MATURITY_CACHE_KEY,
        serialized,
        FRONTEND_MATURITY_CACHE_SECONDS
      );
    }
    return assessment;
  } catch (error) {
    var snapshot = FrontendMaturity_getSnapshot_();
    snapshot.source = {
      mode: 'snapshot',
      label: 'Snapshot local',
      message: FrontendMaturity_sourceErrorMessage_(error)
    };
    return snapshot;
  }
}

function FrontendMaturity_loadProject_() {
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
        error.code = 'FRONTEND_SOURCE_UNAVAILABLE';
        error.httpStatus = statusCode;
        throw error;
      }

      var payload = JSON.parse(content);
      return {
        scriptId: payload.scriptId || scriptId,
        files: payload.files || []
      };
    } catch (error) {
      Logger.log("Erro em FrontendMaturity_loadProject_: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em FrontendMaturity_loadProject_: " + error.message);
    throw error;
  }
}

function FrontendMaturity_assessProject_(projectFiles) {
  var inventory = FrontendMaturity_createInventory_(projectFiles);
  var checks = FrontendMaturity_evaluateChecks_(inventory);
  var categories = FrontendMaturity_summarizeCategories_(checks);
  var score = FrontendMaturity_round_(
    checks.reduce(function (total, check) {
      return total + check.score;
    }, 0),
    1
  );
  var intuitionCategory = categories.filter(function (category) {
    return category.id === 'intuition';
  })[0];
  var intuitivenessScore = intuitionCategory
    ? FrontendMaturity_round_(intuitionCategory.ratio * 100, 1)
    : 0;
  var level = FrontendMaturity_levelForScore_(score);
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
    toolVersion: FRONTEND_MATURITY_VERSION,
    projectName: Config_get().appName,
    generatedAt: new Date().toISOString(),
    profile: 'Google Apps Script HTML',
    score: score,
    intuitivenessScore: intuitivenessScore,
    level: level,
    inventory: {
      scannedFiles: inventory.files.length,
      frontendFiles: inventory.frontendFiles.length,
      implementedFrontendFiles: inventory.implementedFiles.length,
      stubFrontendFiles: inventory.stubFiles.length,
      implementationRate: inventory.frontendFiles.length
        ? FrontendMaturity_round_(
          inventory.implementedFiles.length / inventory.frontendFiles.length,
          3
        )
        : 0,
      stats: inventory.stats
    },
    categories: categories,
    checks: checks,
    priorities: priorities
  };
}

function FrontendMaturity_createInventory_(projectFiles) {
  var files = (projectFiles || []).map(function (file) {
    return {
      name: String(file.name || 'sem-nome') +
        FrontendMaturity_extensionForType_(file.type),
      type: String(file.type || ''),
      source: String(file.source || '')
    };
  });
  var frontendFiles = files.filter(function (file) {
    return file.type === 'HTML' &&
      !/(^|[._-])(test|spec)([._-]|$)/i.test(file.name);
  });
  var implementedFiles = frontendFiles.filter(function (file) {
    return FrontendMaturity_isImplemented_(file);
  });
  var implementedNames = {};
  implementedFiles.forEach(function (file) {
    implementedNames[file.name] = true;
  });

  return {
    files: files,
    frontendFiles: frontendFiles,
    implementedFiles: implementedFiles,
    stubFiles: frontendFiles.filter(function (file) {
      return !implementedNames[file.name];
    }),
    stats: FrontendMaturity_collectStats_(implementedFiles)
  };
}

function FrontendMaturity_extensionForType_(type) {
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

function FrontendMaturity_isImplemented_(file) {
  var source = String(file.source || '');
  var stripped = FrontendMaturity_stripComments_(source);
  var lowered = stripped.toLowerCase();
  var placeholder = [
    'implementação inicial',
    'implementacao inicial',
    'not implemented',
    'todo: implement',
    'coming soon'
  ].some(function (marker) {
    return lowered.indexOf(marker) !== -1;
  });
  var tags = stripped.match(
    /<(main|section|article|form|table|dialog|nav|button|input|select|textarea|canvas|svg)\b/gi
  ) || [];
  var behavior = (
    stripped.match(
      /(addEventListener\s*\(|google\.script\.run|async\s+function|function\s+\w+\s*\()/g
    ) || []
  ).length;
  var styleRules = (
    stripped.match(/[.#][\w-]+\s*(?:,[^{]+)?\{/g) || []
  ).length;
  var text = stripped
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return !placeholder &&
    (tags.length >= 2 || behavior >= 2 || styleRules >= 4) &&
    (text.length >= 24 || behavior >= 3 || styleRules >= 8);
}

function FrontendMaturity_stripComments_(source) {
  return String(source || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function FrontendMaturity_collectStats_(files) {
  var combined = (files || []).map(function (file) {
    return file.source;
  }).join('\n');
  return {
    completeDocuments: FrontendMaturity_count_(
      combined,
      /<!doctype\s+html\b/gi
    ),
    forms: FrontendMaturity_count_(combined, /<form\b/gi),
    controls: FrontendMaturity_count_(
      combined,
      /<(input|select|textarea)\b/gi
    ),
    interactiveElements: FrontendMaturity_count_(
      combined,
      /<(button|a)\b|onclick\s*=|addEventListener\s*\(/gi
    ),
    navigationItems: FrontendMaturity_count_(
      combined,
      /<nav\b|data-view-target\s*=|aria-current\s*=/gi
    ),
    images: FrontendMaturity_count_(
      combined,
      /<(img|svg|canvas)\b/gi
    )
  };
}

function FrontendMaturity_count_(source, pattern) {
  return (String(source || '').match(pattern) || []).length;
}

function FrontendMaturity_evaluateChecks_(inventory) {
  var checks = [];
  var implementationRatio = inventory.frontendFiles.length
    ? inventory.implementedFiles.length / inventory.frontendFiles.length
    : 0;

  checks.push(FrontendMaturity_makeCheck_(
    'implementation.sources',
    'implementation',
    'Fontes frontend detectadas',
    2,
    inventory.frontendFiles.length ? 1 : 0,
    FrontendMaturity_fileEvidence_(inventory.frontendFiles, 5),
    'Adicionar componentes frontend versionados e identificáveis.'
  ));
  checks.push(FrontendMaturity_makeCheck_(
    'implementation.real_ui',
    'implementation',
    'Interfaces com conteúdo real',
    8,
    implementationRatio,
    FrontendMaturity_fileEvidence_(inventory.implementedFiles, 5),
    'Substituir páginas placeholder por conteúdo, controles e fluxos efetivamente utilizáveis.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'implementation.client',
    'implementation',
    'Comportamento e integração do cliente',
    3,
    [
      /addEventListener\s*\(/,
      /google\.script\.run/,
      /document\.(getElementById|querySelector)/,
      /async\s+function/
    ],
    3,
    'Implementar comportamento real, integração assíncrona e atualização consistente da interface.'
  ));
  checks.push(FrontendMaturity_namedImplementationCheck_(
    inventory,
    'implementation.foundation',
    'implementation',
    'Fundação visual e componentes compartilhados',
    2,
    /(style|script|navbar|sidebar|header|footer|layout|component)/i,
    2,
    'Implementar estilos, layout e componentes compartilhados para evitar experiências divergentes.'
  ));

  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'intuition.hierarchy',
    'intuition',
    'Hierarquia e orientação da página',
    4,
    [
      /<h1\b|<title\b/i,
      /<main\b|role\s*=\s*["']main/i,
      /<h2\b|<section\b|<article\b/i,
      /aria-current\s*=|class\s*=\s*["'][^"']*is-active/i
    ],
    4,
    'Usar título claro, um H1 por contexto, landmarks e indicação de localização.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'intuition.navigation',
    'intuition',
    'Navegação previsível',
    4,
    [
      /<nav\b/i,
      /data-view-target\s*=|href\s*=\s*["']#/i,
      /aria-current\s*=/i,
      /aria-label\s*=\s*["'][^"']*(menu|navega|fechar|voltar)/i
    ],
    4,
    'Criar navegação semântica, rotular destinos e destacar claramente a seção ativa.'
  ));
  checks.push(FrontendMaturity_formsCheck_(
    inventory,
    'intuition.forms',
    'intuition',
    'Formulários compreensíveis',
    5,
    'Associar rótulos persistentes, exemplos, obrigatoriedade e ajuda contextual a cada campo.'
  ));
  checks.push(FrontendMaturity_actionsCheck_(inventory));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'intuition.cognitive_load',
    'intuition',
    'Carga cognitiva controlada',
    4,
    [
      /<fieldset\b|<legend\b/i,
      /<details\b|<summary\b/i,
      /class\s*=\s*["'][^"']*(panel|card|grid|toolbar)/i,
      /hidden\b|aria-expanded\s*=/
    ],
    4,
    'Agrupar tarefas complexas, limitar opções simultâneas e revelar detalhes progressivamente.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'intuition.recovery',
    'intuition',
    'Ajuda, prevenção e recuperação',
    4,
    [
      /fieldset-help|aria-describedby|<small\b/i,
      /cancelar|voltar|fechar/i,
      /empty-state|nenhum[a-z ]*(dado|registro|resultado)/i,
      /tente novamente|desfazer|confirm/i
    ],
    4,
    'Oferecer ajuda contextual, retorno seguro, desfazer e próximos passos em estados vazios ou falhas.'
  ));

  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'accessibility.semantics',
    'accessibility',
    'Metadados e estrutura semântica',
    4,
    [
      /<html\b[^>]*lang\s*=/i,
      /<title\b/i,
      /<main\b/i,
      /<(nav|header|footer|section|article)\b/i
    ],
    4,
    'Definir idioma, título e landmarks semânticos nos documentos e layouts principais.'
  ));
  checks.push(FrontendMaturity_formsCheck_(
    inventory,
    'accessibility.forms',
    'accessibility',
    'Nome acessível dos campos',
    4,
    'Relacionar cada controle a um label ou nome acessível programático.'
  ));
  checks.push(FrontendMaturity_accessibleNamesCheck_(inventory));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'accessibility.keyboard',
    'accessibility',
    'Teclado e foco visível',
    3,
    [
      /:focus-visible/,
      /tabindex\s*=\s*["']0["']/,
      /keydown|keyup|event\.key/,
      /<button\b/i
    ],
    4,
    'Garantir navegação completa por teclado e indicador de foco que não seja removido.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'accessibility.status',
    'accessibility',
    'Anúncio de status e erros',
    2,
    [
      /aria-live\s*=/,
      /role\s*=\s*["'](status|alert)["']/,
      /aria-invalid\s*=/
    ],
    2,
    'Anunciar carregamentos, confirmações e erros dinâmicos com regiões live apropriadas.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'accessibility.visual',
    'accessibility',
    'Movimento, contraste e foco',
    3,
    [
      /prefers-reduced-motion/,
      /:focus-visible/,
      /--(ink|text|color|focus|danger|success)/,
      /color-scheme\s*:/
    ],
    3,
    'Definir tokens de cor contrastantes, foco visível e alternativa para movimento reduzido.'
  ));

  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'responsive.viewport',
    'responsive',
    'Viewport móvel',
    3,
    [/<meta\b[^>]*name\s*=\s*["']viewport/i],
    1,
    'Adicionar meta viewport em cada documento completo servido ao navegador.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'responsive.layout',
    'responsive',
    'Layouts fluidos e adaptáveis',
    4,
    [
      /display\s*:\s*(grid|flex)/,
      /minmax\s*\(|clamp\s*\(/,
      /@media\s*\(/,
      /max-width\s*:|width\s*:\s*min\(/
    ],
    4,
    'Usar Grid/Flex, unidades fluidas e breakpoints orientados pelo conteúdo.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'responsive.mobile',
    'responsive',
    'Adaptação de navegação e conteúdo',
    3,
    [
      /@media\s*\([^)]*max-width/,
      /mobile-only|sidebar-toggle/,
      /flex-direction\s*:\s*column/,
      /overflow-x\s*:\s*auto/
    ],
    3,
    'Definir comportamento explícito para navegação, formulários e painéis em telas estreitas.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'responsive.touch',
    'responsive',
    'Alvos de toque adequados',
    2,
    [
      /min-height\s*:\s*(4[4-9]|[5-9]\d)px/,
      /width\s*:\s*(4[4-9]|[5-9]\d)px/,
      /height\s*:\s*(4[4-9]|[5-9]\d)px/
    ],
    2,
    'Manter áreas clicáveis próximas de 44x44 px e espaçamento suficiente entre ações.'
  ));
  checks.push(FrontendMaturity_denseContentCheck_(inventory));

  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'feedback.loading',
    'feedback',
    'Estado de carregamento',
    3,
    [
      /loading|carregando|setBusy/i,
      /disabled\s*=\s*true/,
      /aria-busy\s*=|role\s*=\s*["']status["']/
    ],
    3,
    'Mostrar progresso, bloquear ações duplicadas e preservar contexto durante operações assíncronas.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'feedback.errors',
    'feedback',
    'Erros e validação acionáveis',
    3,
    [
      /role\s*=\s*["']alert["']|error-notice|form-error/i,
      /aria-invalid/,
      /showError|applyFormErrors|reportValidity/
    ],
    3,
    'Exibir erros próximos da causa, explicar a correção e manter os dados já preenchidos.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'feedback.outcomes',
    'feedback',
    'Sucesso e estado vazio',
    2,
    [
      /success|sucesso/i,
      /empty-state|nenhum[a-z ]*(dado|registro|resultado)/i
    ],
    2,
    'Confirmar resultados e transformar estados vazios em orientação para a próxima ação.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'feedback.safety',
    'feedback',
    'Prevenção de duplicidade e confirmação',
    2,
    [
      /\.disabled\s*=\s*true|button:disabled/,
      /window\.confirm\s*\(|confirmed/
    ],
    2,
    'Desabilitar ações durante envio e confirmar operações destrutivas ou irreversíveis.'
  ));

  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'performance.assets',
    'performance',
    'Estratégia de estilos e scripts',
    2,
    [
      /include\s*\(\s*['"]Styles['"]\s*\)/,
      /include\s*\(\s*['"]Scripts['"]\s*\)/,
      /(Styles|Scripts|Navbar|Sidebar)\.html/
    ],
    2,
    'Centralizar recursos compartilhados e reduzir CSS ou JavaScript duplicado entre páginas.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'performance.loading',
    'performance',
    'Carregamento não bloqueante',
    2,
    [
      /async\s+function/,
      /Promise\s*\(/,
      /defer\b|async\b[^>]*src\s*=|loading\s*=\s*["']lazy/
    ],
    3,
    'Carregar scripts e mídia de forma não bloqueante e priorizar apenas recursos críticos.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'performance.events',
    'performance',
    'Eventos e animações eficientes',
    2,
    [
      /setTimeout\s*\(/,
      /clearTimeout\s*\(/,
      /transform\s*:|opacity\s*:/,
      /prefers-reduced-motion/
    ],
    4,
    'Limitar eventos frequentes, limpar listeners e animar preferencialmente transform e opacity.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'performance.rendering',
    'performance',
    'Renderização e listas escaláveis',
    2,
    [
      /\.map\s*\(/,
      /\.join\s*\(\s*['"]{0,2}\s*\)/,
      /DocumentFragment|requestAnimationFrame/,
      /page(Size|Number)|pagination|virtual/i
    ],
    3,
    'Atualizar o DOM em lote e paginar ou virtualizar listas potencialmente grandes.'
  ));

  checks.push(FrontendMaturity_testCheck_(inventory));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'delivery.quality_tools',
    'delivery',
    'Testes E2E e acessibilidade',
    2,
    [
      /\bplaywright\b/i,
      /\baxe(-core)?\b/i,
      /accessibility_checker|ux_audit/i
    ],
    2,
    'Automatizar ao menos um fluxo E2E e uma verificação de acessibilidade.'
  ));
  checks.push(FrontendMaturity_patternCheck_(
    inventory,
    'delivery.pipeline',
    'delivery',
    'Qualidade automatizada no pipeline',
    2,
    [
      /github\/workflows/i,
      /frontend_maturity\.py|fail-intuitiveness-under/i,
      /\b(lint|test|audit)\b.*\b(CI|pipeline|push)/i
    ],
    2,
    'Executar lint, testes, auditoria frontend e gate de pontuação antes da publicação.'
  ));

  return checks;
}

function FrontendMaturity_patternCheck_(
  inventory,
  id,
  category,
  title,
  weight,
  patterns,
  targetCount,
  recommendation
) {
  var evidence = FrontendMaturity_findEvidence_(
    inventory.files,
    patterns,
    5
  );
  return FrontendMaturity_makeCheck_(
    id,
    category,
    title,
    weight,
    Math.min(1, evidence.length / targetCount),
    evidence,
    recommendation
  );
}

function FrontendMaturity_namedImplementationCheck_(
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
  return FrontendMaturity_makeCheck_(
    id,
    category,
    title,
    weight,
    Math.min(1, matches.length / targetCount),
    FrontendMaturity_fileEvidence_(matches, 5),
    recommendation
  );
}

function FrontendMaturity_formsCheck_(
  inventory,
  id,
  category,
  title,
  weight,
  recommendation
) {
  var controls = 0;
  var labeled = 0;
  var evidence = [];

  inventory.implementedFiles.forEach(function (file) {
    var source = file.source;
    var controlMatches = source.match(/<(input|select|textarea)\b[^>]*>/gi) || [];
    controls += controlMatches.length;
    controlMatches.forEach(function (control) {
      var idMatch = control.match(/\bid\s*=\s*["']([^"']+)["']/i);
      var hasAccessibleName =
        /\baria-label\s*=|\baria-labelledby\s*=|\btitle\s*=/i.test(control) ||
        (idMatch &&
          new RegExp(
            "<label\\b[^>]*for\\s*=\\s*[\"']" +
              FrontendMaturity_escapeRegex_(idMatch[1]) +
              "[\"']",
            'i'
          ).test(source));
      if (hasAccessibleName) {
        labeled += 1;
      }
    });
    if (controlMatches.length && evidence.length < 5) {
      evidence.push({
        path: file.name,
        line: FrontendMaturity_firstLine_(source, /<(input|select|textarea)\b/i),
        excerpt: labeled + ' de ' + controls + ' controles com nome acessível'
      });
    }
  });

  var ratio = controls ? labeled / controls : (inventory.implementedFiles.length ? 1 : 0);
  return FrontendMaturity_makeCheck_(
    id,
    category,
    title,
    weight,
    ratio,
    evidence,
    recommendation
  );
}

function FrontendMaturity_actionsCheck_(inventory) {
  var actions = 0;
  var named = 0;
  var evidence = [];

  inventory.implementedFiles.forEach(function (file) {
    var matches = file.source.match(/<(button|a)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];
    matches.forEach(function (element) {
      actions += 1;
      var text = element
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length >= 2 || /aria-label\s*=/i.test(element)) {
        named += 1;
      }
    });
    if (matches.length && evidence.length < 5) {
      evidence.push({
        path: file.name,
        line: FrontendMaturity_firstLine_(file.source, /<(button|a)\b/i),
        excerpt: 'Ações textuais ou rotuladas detectadas'
      });
    }
  });

  return FrontendMaturity_makeCheck_(
    'intuition.actions',
    'intuition',
    'Ações com propósito explícito',
    4,
    actions ? named / actions : (inventory.implementedFiles.length ? 1 : 0),
    evidence,
    'Usar verbos específicos em botões e links; evitar ações representadas apenas por ícones.'
  );
}

function FrontendMaturity_accessibleNamesCheck_(inventory) {
  var imageEvidence = FrontendMaturity_findEvidence_(
    inventory.implementedFiles,
    [
      /<img\b[^>]*alt\s*=/i,
      /<svg\b[^>]*(aria-label|aria-labelledby|role\s*=\s*["']img)/i,
      /aria-label\s*=\s*["'][^"']+["']/i
    ],
    5
  );
  var actionCheck = FrontendMaturity_actionsCheck_(inventory);
  var ratio = Math.min(
    1,
    actionCheck.ratio * 0.75 + (imageEvidence.length ? 0.25 : 0.25)
  );
  return FrontendMaturity_makeCheck_(
    'accessibility.names',
    'accessibility',
    'Nome de ações e conteúdo visual',
    4,
    ratio,
    actionCheck.evidence.concat(imageEvidence).slice(0, 5),
    'Fornecer texto alternativo e nomes acessíveis para imagens, ícones, links e botões.'
  );
}

function FrontendMaturity_denseContentCheck_(inventory) {
  var tables = FrontendMaturity_findEvidence_(
    inventory.implementedFiles,
    [/<table\b/i],
    5
  );
  if (!tables.length) {
    return FrontendMaturity_makeCheck_(
      'responsive.dense_content',
      'responsive',
      'Tabelas e conteúdo denso adaptáveis',
      3,
      inventory.implementedFiles.length ? 1 : 0,
      [],
      'Oferecer rolagem, cartões alternativos ou priorização de colunas para conteúdo denso.'
    );
  }
  var overflow = FrontendMaturity_findEvidence_(
    inventory.implementedFiles,
    [/overflow-x\s*:\s*auto|table-scroll/i],
    5
  );
  return FrontendMaturity_makeCheck_(
    'responsive.dense_content',
    'responsive',
    'Tabelas e conteúdo denso adaptáveis',
    3,
    overflow.length ? 1 : 0,
    overflow.length ? overflow : tables,
    'Oferecer rolagem, cartões alternativos ou priorização de colunas para conteúdo denso.'
  );
}

function FrontendMaturity_testCheck_(inventory) {
  var testFiles = inventory.files.filter(function (file) {
    return /(^|[._-])(test|spec)([._-]|$)/i.test(file.name) ||
      /\b(assert|expect)\s*\(/.test(file.source);
  });
  return FrontendMaturity_makeCheck_(
    'delivery.tests',
    'delivery',
    'Testes automatizados da interface',
    3,
    Math.min(1, testFiles.length / 3),
    FrontendMaturity_fileEvidence_(testFiles, 5),
    'Cobrir navegação, formulários, estados de erro, responsividade e fluxos críticos.'
  );
}

function FrontendMaturity_makeCheck_(
  id,
  category,
  title,
  weight,
  ratio,
  evidence,
  recommendation
) {
  var boundedRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  var score = FrontendMaturity_round_(weight * boundedRatio, 2);
  var status = FrontendMaturity_statusForRatio_(boundedRatio);
  return {
    id: id,
    category: category,
    categoryLabel: FRONTEND_MATURITY_CATEGORY_LABELS[category],
    title: title,
    weight: weight,
    ratio: FrontendMaturity_round_(boundedRatio, 3),
    score: score,
    gap: FrontendMaturity_round_(weight - score, 2),
    status: status.code,
    statusLabel: status.label,
    evidence: evidence || [],
    recommendation: recommendation
  };
}

function FrontendMaturity_findEvidence_(files, patterns, maxResults) {
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
          excerpt: FrontendMaturity_excerpt_(line)
        });
        break;
      }
    }
    return evidence.length >= limit;
  });

  return evidence;
}

function FrontendMaturity_fileEvidence_(files, maxResults) {
  return (files || []).slice(0, maxResults || 5).map(function (file) {
    return {
      path: file.name,
      line: 1,
      excerpt: 'Arquivo detectado'
    };
  });
}

function FrontendMaturity_excerpt_(line) {
  var compact = String(line || '').replace(/\s+/g, ' ').trim();
  if (compact.length > 180) {
    compact = compact.slice(0, 177) + '...';
  }
  return compact;
}

function FrontendMaturity_firstLine_(source, pattern) {
  var lines = String(source || '').split(/\r?\n/);
  for (var index = 0; index < lines.length; index += 1) {
    pattern.lastIndex = 0;
    if (pattern.test(lines[index])) {
      return index + 1;
    }
  }
  return 1;
}

function FrontendMaturity_escapeRegex_(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function FrontendMaturity_summarizeCategories_(checks) {
  return Object.keys(FRONTEND_MATURITY_CATEGORY_LABELS).map(function (category) {
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
      label: FRONTEND_MATURITY_CATEGORY_LABELS[category],
      score: FrontendMaturity_round_(score, 2),
      weight: weight,
      ratio: weight
        ? FrontendMaturity_round_(score / weight, 3)
        : 0
    };
  });
}

function FrontendMaturity_statusForRatio_(ratio) {
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

function FrontendMaturity_levelForScore_(score) {
  if (score <= 20) {
    return {
      number: 1,
      name: 'Inicial',
      description: 'Telas incompletas e experiência ainda não verificável.'
    };
  }
  if (score <= 40) {
    return {
      number: 2,
      name: 'Repetível',
      description: 'Padrões existem, mas são parciais ou inconsistentes.'
    };
  }
  if (score <= 60) {
    return {
      number: 3,
      name: 'Definido',
      description: 'Fluxos essenciais utilizáveis, responsivos e documentados.'
    };
  }
  if (score <= 80) {
    return {
      number: 4,
      name: 'Gerenciado',
      description: 'Experiência testada e qualidade acompanhada.'
    };
  }
  return {
    number: 5,
    name: 'Otimizado',
    description: 'Melhoria contínua orientada por métricas de uso.'
  };
}

function FrontendMaturity_round_(value, digits) {
  var factor = Math.pow(10, digits || 0);
  return Math.round((Number(value) || 0) * factor) / factor;
}

function FrontendMaturity_sourceErrorMessage_(error) {
  var detail = error && error.message ? error.message : 'fonte indisponível';
  return (
    'Não foi possível ler a interface ao vivo (' +
    detail +
    '). Exibindo o último snapshot conhecido. Habilite a Apps Script API e ' +
    'autorize os escopos script.projects.readonly e script.external_request.'
  );
}

function FrontendMaturity_getSnapshot_() {
  var categoryValues = [
    ['implementation', 9.3, 15],
    ['intuition', 24, 25],
    ['accessibility', 19, 20],
    ['responsive', 14, 15],
    ['feedback', 10, 10],
    ['performance', 2, 8],
    ['delivery', 0, 7]
  ];
  var snapshotChecks = [
    ['implementation.real_ui', 'implementation', 'Interfaces com conteúdo real', 8, 2.4, 'initial', 'Inicial', 'Substituir páginas placeholder por conteúdo, controles e fluxos efetivamente utilizáveis.'],
    ['intuition.recovery', 'intuition', 'Ajuda, prevenção e recuperação', 4, 3, 'partial', 'Parcial', 'Oferecer ajuda contextual, retorno seguro, desfazer e próximos passos em estados vazios ou falhas.'],
    ['accessibility.keyboard', 'accessibility', 'Teclado e foco visível', 3, 2, 'partial', 'Parcial', 'Garantir navegação completa por teclado e indicador de foco que não seja removido.'],
    ['responsive.touch', 'responsive', 'Alvos de toque adequados', 2, 1, 'partial', 'Parcial', 'Manter áreas clicáveis próximas de 44x44 px e espaçamento suficiente entre ações.'],
    ['performance.assets', 'performance', 'Estratégia de estilos e scripts', 2, 0, 'missing', 'Ausente', 'Centralizar recursos compartilhados e reduzir CSS ou JavaScript duplicado entre páginas.'],
    ['performance.loading', 'performance', 'Carregamento não bloqueante', 2, 1, 'partial', 'Parcial', 'Carregar scripts e mídia de forma não bloqueante e priorizar apenas recursos críticos.'],
    ['performance.events', 'performance', 'Eventos e animações eficientes', 2, 0, 'missing', 'Ausente', 'Limitar eventos frequentes, limpar listeners e animar preferencialmente transform e opacity.'],
    ['performance.rendering', 'performance', 'Renderização e listas escaláveis', 2, 1, 'partial', 'Parcial', 'Atualizar o DOM em lote e paginar ou virtualizar listas potencialmente grandes.'],
    ['delivery.tests', 'delivery', 'Testes automatizados da interface', 3, 0, 'missing', 'Ausente', 'Cobrir navegação, formulários, estados de erro, responsividade e fluxos críticos.'],
    ['delivery.quality_tools', 'delivery', 'Testes E2E e acessibilidade', 2, 0, 'missing', 'Ausente', 'Automatizar ao menos um fluxo E2E e uma verificação de acessibilidade.'],
    ['delivery.pipeline', 'delivery', 'Qualidade automatizada no pipeline', 2, 0, 'missing', 'Ausente', 'Executar lint, testes, auditoria frontend e gate de pontuação antes da publicação.']
  ];
  var checks = snapshotChecks.map(function (item) {
    return {
      id: item[0],
      category: item[1],
      categoryLabel: FRONTEND_MATURITY_CATEGORY_LABELS[item[1]],
      title: item[2],
      weight: item[3],
      score: item[4],
      ratio: FrontendMaturity_round_(item[4] / item[3], 3),
      gap: FrontendMaturity_round_(item[3] - item[4], 2),
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
    toolVersion: FRONTEND_MATURITY_VERSION,
    projectName: Config_get().appName,
    generatedAt: '2026-06-05T15:24:36.000Z',
    profile: 'Google Apps Script HTML',
    score: 78.3,
    intuitivenessScore: 96,
    level: FrontendMaturity_levelForScore_(78.3),
    inventory: {
      scannedFiles: 34,
      frontendFiles: 34,
      implementedFrontendFiles: 10,
      stubFrontendFiles: 24,
      implementationRate: 0.294,
      stats: {
        completeDocuments: 1,
        forms: 1,
        controls: 12,
        interactiveElements: 16,
        navigationItems: 5,
        images: 0
      }
    },
    categories: categoryValues.map(function (item) {
      return {
        id: item[0],
        label: FRONTEND_MATURITY_CATEGORY_LABELS[item[0]],
        score: item[1],
        weight: item[2],
        ratio: FrontendMaturity_round_(item[1] / item[2], 3)
      };
    }),
    checks: checks,
    priorities: priorities
  };
}

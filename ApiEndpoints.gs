/**
 * Fachada pública consumida por google.script.run.
 */

function ApiEndpoints_getBootstrap(token) {
  try {
    return ErrorHandling_execute('bootstrap', function () {
      var session = PermissionManager_assertAccess(token);
      EnvironmentSetup_initialize();
      return {
        app: Config_getPublic(),
        user: session,
        stats: DashboardStats_get(),
        references: {
          escolas: CRUD_Escolas_options()
        },
        alunos: CRUD_Alunos_list({
          status: 'ativo'
        }),
        escolas: CRUD_Escolas_list({
          status: 'ativo'
        }),
        professores: CRUD_Professores_list({
          status: 'ativo'
        }),
        analysis: AnalysisService_getOverview(),
        recent: CRUD_Alunos_list({
          status: 'ativo'
        }).slice(0, 5)
      };
    });
  } catch (error) {
    Logger.log("Erro em ApiEndpoints_getBootstrap: " + error.message);
    throw error;
  }
}

function ApiEndpoints_listAlunos(filters, token) {
  try {
    return ErrorHandling_execute('alunos.list', function () {
      PermissionManager_assertAccess(token);
      return {
        items: CRUD_Alunos_list(filters),
        stats: DashboardStats_get(),
        references: {
          escolas: CRUD_Escolas_options()
        },
        recent: CRUD_Alunos_list({
          status: 'ativo'
        }).slice(0, 5)
      };
    });
  } catch (error) {
    Logger.log("Erro em ApiEndpoints_listAlunos: " + error.message);
    throw error;
  }
}

function ApiEndpoints_getAluno(id, token) {
  return ErrorHandling_execute('alunos.get', function () {
    PermissionManager_assertAccess(token);
    return CRUD_Alunos_getById(id);
  });
}

function ApiEndpoints_listEscolas(filters, token) {
  return ErrorHandling_execute('escolas.list', function () {
    PermissionManager_assertAccess(token);
    return {
      items: CRUD_Escolas_list(filters),
      references: {
        escolas: CRUD_Escolas_options()
      },
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_saveEscola(payload, token) {
  return ErrorHandling_execute('escolas.save', function () {
    PermissionManager_assertAccess(token);
    var escola = CRUD_Escolas_save(payload);
    return {
      escola: escola,
      items: CRUD_Escolas_list({ status: 'ativo' }),
      references: {
        escolas: CRUD_Escolas_options()
      },
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_archiveEscola(id, token) {
  return ErrorHandling_execute('escolas.archive', function () {
    PermissionManager_assertAccess(token);
    var escola = CRUD_Escolas_archive(id);
    return {
      escola: escola,
      references: {
        escolas: CRUD_Escolas_options()
      },
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_listProfessores(filters, token) {
  return ErrorHandling_execute('professores.list', function () {
    PermissionManager_assertAccess(token);
    return {
      items: CRUD_Professores_list(filters),
      references: {
        escolas: CRUD_Escolas_options()
      },
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_saveProfessor(payload, token) {
  return ErrorHandling_execute('professores.save', function () {
    PermissionManager_assertAccess(token);
    var professor = CRUD_Professores_save(payload);
    return {
      professor: professor,
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_archiveProfessor(id, token) {
  return ErrorHandling_execute('professores.archive', function () {
    PermissionManager_assertAccess(token);
    var professor = CRUD_Professores_archive(id);
    return {
      professor: professor,
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_getAnalysisOverview(token) {
  return ErrorHandling_execute('analysis.overview', function () {
    PermissionManager_assertAccess(token);
    return AnalysisService_getOverview();
  });
}

function ApiEndpoints_saveAluno(payload, token) {
  return ErrorHandling_execute('alunos.save', function () {
    PermissionManager_assertAccess(token);
    var aluno = CRUD_Alunos_save(payload);
    return {
      aluno: aluno,
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_archiveAluno(id, token) {
  return ErrorHandling_execute('alunos.archive', function () {
    PermissionManager_assertAccess(token);
    var aluno = CRUD_Alunos_archive(id);
    return {
      aluno: aluno,
      stats: DashboardStats_get()
    };
  });
}

function ApiEndpoints_getBackendMaturity(options, token) {
  return ErrorHandling_execute('backend.maturity', function () {
    PermissionManager_assertAccess(token);
    return BackendMaturity_getAssessment(options || {});
  });
}

function ApiEndpoints_getFrontendMaturity(options, token) {
  return ErrorHandling_execute('frontend.maturity', function () {
    PermissionManager_assertAccess(token);
    return FrontendMaturity_getAssessment(options || {});
  });
}

/**
 * Dispara o notebook.py via ColabOrchestrator e devolve o status do disparo.
 * @param {string} token Token de sessão.
 * @return {Object} Envelope { ok, data: { ok, jobId, message } }
 */
function ApiEndpoints_dispatchAnalysis(token) {
  return ErrorHandling_execute('analysis.dispatch', function () {
    PermissionManager_assertAccess(token);
    return ColabOrchestrator_dispatch();
  });
}

/**
 * Verifica se há resultados recentes na aba Resultados_Analise.
 * @param {string} token Token de sessão.
 * @return {Object} Envelope { ok, data: { hasResults, lastRunAt, ncaCount, semStatus } }
 */
function ApiEndpoints_checkAnalysisResults(token) {
  return ErrorHandling_execute('analysis.results.check', function () {
    PermissionManager_assertAccess(token);
    return ColabOrchestrator_checkResults();
  });
}

/**
 * Relatório consolidado NCA + SEM para exibição nos dashboards.
 * @param {string} token Token de sessão.
 * @return {Object} Envelope { ok, data: { nca, sem, hasResults, generatedAt } }
 */
function ApiEndpoints_getAnalysisReport(token) {
  return ErrorHandling_execute('analysis.report', function () {
    PermissionManager_assertAccess(token);
    return ReportGenerator_consolidate();
  });
}

/**
 * Relatório em Markdown para exportação.
 * @param {string} token Token de sessão.
 * @return {Object} Envelope { ok, data: { markdown } }
 */
function ApiEndpoints_getAnalysisMarkdown(token) {
  return ErrorHandling_execute('analysis.report.markdown', function () {
    PermissionManager_assertAccess(token);
    return { markdown: ReportGenerator_toMarkdown() };
  });
}

/**
 * @file ApiEndpoints.gs
 * Endpoints públicos chamáveis via google.script.run no frontend.
 * Gerado por codex_integrate_frontend_backend.py — pode ser customizado.
 */

/**
 * Carrega dados iniciais do dashboard.
 * Aceita o token via parâmetro (frota usa loginWithToken → ?page=app#tok= na URL).
 * @param {string} [tok] Token da sessão.
 * @return {{success:boolean, currentUser?:Object, appData?:Object, message?:string}}
 */
function getInitialAppData(tok) {
  var session = null;
  if (tok && typeof isAuthenticatedByToken === 'function' && isAuthenticatedByToken(tok)) {
    session = (typeof getSessionUser === 'function') ? getSessionUser(tok) : null;
  }
  if (!session) {
    return { success: false, message: 'Sessão inválida. Faça login novamente.' };
  }
  var currentUser = {
    id:       session.userId   || session.id       || session.username || 'unknown',
    username: session.username || session.name     || 'Usuário',
    name:     session.nome     || session.name     || session.username || 'Usuário',
    role:     session.role     || 'USER',
    email:    session.email    || ''
  };
  return { success: true, currentUser: currentUser, appData: {} };
}

/**
 * Valida se a sessão corrente ainda é válida (heartbeat do frontend).
 * @param {string} tok
 */
function pingSession(tok) {
  if (!tok) return { ok: false };
  try {
    return { ok: typeof isAuthenticatedByToken === 'function' && isAuthenticatedByToken(tok) };
  } catch (e) {
    return { ok: false };
  }
}

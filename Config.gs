/**
 * Configuração central da aplicação.
 *
 * Mantenha apenas valores públicos neste objeto. IDs e credenciais devem ser
 * lidos de PropertiesService.
 */
var APP_CONFIG = Object.freeze({
  appName: 'NCA-SEM Educacional',
  version: '1.4.0',
  spreadsheetProperty: 'SPREADSHEETS_ID',
  allowedEmailsProperty: 'ALLOWED_EMAILS',
  sessionDurationMs: 8 * 60 * 60 * 1000,
  defaultPageSize: 100,
  sheets: {
    authSessions: {
      name: 'SessoesAuth',
      headers: [
        'token',
        'userId',
        'username',
        'nome',
        'email',
        'role',
        'createdAt',
        'expiresAt'
      ]
    },
    alunos: {
      name: 'DB_Educacional',
      headers: [
        'id',
        'nome',
        'escola',
        'serie',
        'turma',
        'idade',
        'rendaFamiliar',
        'notaMatematica',
        'notaPortugues',
        'frequencia',
        'status',
        'createdAt',
        'updatedAt',
        'escolaId'
      ]
    },
    escolas: {
      name: 'DB_Escolas',
      headers: [
        'id',
        'nome',
        'codigoInep',
        'municipio',
        'uf',
        'rede',
        'etapas',
        'totalSalas',
        'temInternet',
        'status',
        'createdAt',
        'updatedAt'
      ]
    },
    professores: {
      name: 'DB_Professores',
      headers: [
        'id',
        'nome',
        'email',
        'escolaId',
        'escola',
        'disciplina',
        'cargaHoraria',
        'formacao',
        'bolsa',
        'status',
        'createdAt',
        'updatedAt'
      ]
    }
  }
});

function Config_get() {
  return APP_CONFIG;
}

function Config_getPublic() {
  return {
    appName: APP_CONFIG.appName,
    version: APP_CONFIG.version,
    accessMode: Config_getAllowedEmails().length ? 'allowlist' : 'deployment'
  };
}

function Config_getSheet(key) {
  var definition = APP_CONFIG.sheets[key];
  if (!definition) {
    throw new Error('Tabela não configurada: ' + key);
  }
  return definition;
}

function Config_getSpreadsheetId() {
  try {
    return PropertiesService.getScriptProperties()
      .getProperty(APP_CONFIG.spreadsheetProperty);
  } catch (error) {
    Logger.log("Erro em Config_getSpreadsheetId: " + error.message);
    throw error;
  }
}

function Config_setSpreadsheetId(spreadsheetId) {
  try {
    var normalizedId = String(spreadsheetId || '').trim();
    if (!normalizedId) {
      throw new Error('Informe um ID de planilha válido.');
    }
    PropertiesService.getScriptProperties()
      .setProperty(APP_CONFIG.spreadsheetProperty, normalizedId);
    return normalizedId;
  } catch (error) {
    Logger.log("Erro em Config_setSpreadsheetId: " + error.message);
    throw error;
  }
}

function Config_getAllowedEmails() {
  try {
    var rawValue = PropertiesService.getScriptProperties()
      .getProperty(APP_CONFIG.allowedEmailsProperty);
    if (!rawValue) {
      return [];
    }
    return rawValue
      .split(',')
      .map(function (email) {
        return email.trim().toLowerCase();
      })
      .filter(Boolean);
  } catch (error) {
    Logger.log("Erro em Config_getAllowedEmails: " + error.message);
    throw error;
  }
}

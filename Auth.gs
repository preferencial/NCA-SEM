/**
 * Fachada de autenticação compatível com a identidade do Apps Script.
 */

function Auth_getSession() {
  return UserSession_getCurrentUser();
}

function Auth_assertAccess() {
  return PermissionManager_assertAccess();
}

/**
 * Login por usuario/senha em TEXTO PURO contra a aba 'Usuarios'.
 * Complementa a identidade do Apps Script com credenciais proprias, permitindo
 * autenticar os administradores sinteticos (senha 'admin123').
 * @param {string} username Usuario ou e-mail.
 * @param {string} password Senha em texto puro.
 * @return {{success:boolean, user?:Object, message?:string}}
 */
function Auth_loginWithPassword(username, password) {
  try {
    var u = String(username || '').trim().toLowerCase();
    var p = String(password || '');
    if (!u || !p) return { success: false, message: 'Informe usuario e senha.' };

    var sheet = SheetsDB_getSpreadsheet().getSheetByName('Usuarios');
    if (!sheet || sheet.getLastRow() < 2) return { success: false, message: 'Credenciais invalidas.' };

    var values = sheet.getDataRange().getValues();
    var headers = values[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
    var iUser = headers.indexOf('username');
    var iPass = headers.indexOf('password');
    var iRole = headers.indexOf('role');
    var iNome = headers.indexOf('nome');
    var iEmail = headers.indexOf('email');
    var iId = headers.indexOf('id');
    var iStatus = headers.indexOf('status');
    if (iUser < 0 || iPass < 0) return { success: false, message: 'Aba de usuarios sem colunas username/password.' };

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var rowUser = String(row[iUser] || '').trim().toLowerCase();
      var rowEmail = iEmail >= 0 ? String(row[iEmail] || '').trim().toLowerCase() : '';
      if (rowUser !== u && rowEmail !== u) continue;
      if (String(row[iPass]) !== p) return { success: false, message: 'Credenciais invalidas.' };
      if (iStatus >= 0 && String(row[iStatus]).trim().toLowerCase() === 'inativo') {
        return { success: false, message: 'Usuario inativo.' };
      }
      return {
        success: true,
        user: {
          id: iId >= 0 ? row[iId] : rowUser,
          username: row[iUser],
          nome: iNome >= 0 ? row[iNome] : row[iUser],
          email: iEmail >= 0 ? row[iEmail] : '',
          role: iRole >= 0 ? row[iRole] : 'admin'
        }
      };
    }
    return { success: false, message: 'Credenciais invalidas.' };
  } catch (error) {
    Logger.log("Erro em Auth_loginWithPassword: " + error.message);
    throw error;
  }
}

/**
 * Bridges publicas consumidas por Scripts.html.
 *
 * A tela principal ainda usa os nomes historicos Auth_login/Auth_verifySession/
 * Auth_logout. Antes estes nomes nao existiam e o transporte falhava antes de
 * chegar ao servico de autenticacao por token. As bridges abaixo preservam o
 * contrato da tela e delegam ao caminho canonico de AuthHelpers.gs.
 */
function Auth_login(username, password) {
  var result = loginWithToken(username, password);
  if (!result || !result.success) {
    return {
      success: false,
      message: result && result.message ? result.message : 'Credenciais invalidas.'
    };
  }

  var principal = getSessionUser(result.token) || result.user || {};
  return {
    success: true,
    session: {
      token: result.token,
      userId: principal.userId || principal.id || '',
      username: principal.username || '',
      nome: principal.nome || principal.username || '',
      email: principal.email || '',
      role: principal.role || 'professor',
      valid: true
    }
  };
}

function Auth_verifySession(token) {
  if (!isAuthenticatedByToken(token)) return { valid: false };
  var principal = getSessionUser(token);
  if (!principal) return { valid: false };
  return {
    valid: true,
    token: token,
    userId: principal.userId || principal.id || '',
    username: principal.username || '',
    nome: principal.nome || principal.username || '',
    email: principal.email || '',
    role: principal.role || 'professor'
  };
}

function Auth_logout(token) {
  return logoutWithToken(token);
}

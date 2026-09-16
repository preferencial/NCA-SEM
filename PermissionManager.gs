/**
 * Autorização opcional por allowlist.
 *
 * Quando ALLOWED_EMAILS não está configurado, o acesso é controlado pelas
 * opções de publicação do próprio Web App. Quando configurado, a propriedade
 * deve conter e-mails separados por vírgula.
 */

function PermissionManager_assertAccess(token) {
  try {
    var allowedEmails = Config_getAllowedEmails();
    var user = Auth_verifySession(token);

    if (!user.valid) {
      var authError = new Error('Sessão inválida ou expirada. Faça login novamente.');
      authError.code = 'UNAUTHORIZED';
      throw authError;
    }

    if (!allowedEmails.length) {
      return user;
    }

    var email = String(user.email || '').toLowerCase();
    if (!email || allowedEmails.indexOf(email) === -1) {
      var error = new Error('Seu usuário não possui acesso a esta aplicação.');
      error.code = 'FORBIDDEN';
      throw error;
    }

    return user;
  } catch (error) {
    Logger.log("Erro em PermissionManager_assertAccess: " + error.message);
    throw error;
  }
}

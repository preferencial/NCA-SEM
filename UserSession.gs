/**
 * Informações públicas da sessão atual.
 */

function UserSession_getCurrentUser() {
  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
  } catch (error) {
    email = '';
  }

  return {
    email: email,
    displayName: email ? email.split('@')[0] : 'Usuário',
    authenticated: Boolean(email)
  };
}

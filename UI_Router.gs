/**
 * Renderização segura de templates HTML.
 */
var UI_ROUTER_ALLOWED_FILES = Object.freeze([
  'Index',
  'AuthGate',
  'SharedTokens',
  'Styles',
  'Scripts',
  'Navbar',
  'Sidebar',
  'AlunoList',
  'AlunoForm',
  'EscolaList',
  'EscolaForm',
  'ProfessorList',
  'ProfessorForm',
  'AnaliseRequest',
  'BackendMaturityHtml',
  'FrontendMaturityHtml',
  'LoadingState',
  'ErrorPage',
  'SuccessModal',
  'ClientCall',
  'ApiClient',
  'LoadingSpinner',
  'Alert',
  'BrandLogoBase64'
]);

function UI_Router_createTemplate() {
  try {
    return HtmlService.createTemplateFromFile('Index');
  } catch (error) {
    Logger.log("Erro em UI_Router_createTemplate: " + error.message);
    throw error;
  }
}

function UI_Router_include(filename) {
  try {
    if (UI_ROUTER_ALLOWED_FILES.indexOf(filename) === -1) {
      throw new Error('Componente HTML não permitido: ' + filename);
    }
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log("Erro em UI_Router_include: " + error.message);
    throw error;
  }
}

/**
 * Compacta dados estáticos para uso em data URLs (como logos base64)
 * Remove todos os espaços em branco para otimizar o tamanho
 */
function includeInlineData(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent().replace(/\s+/g, '');
}


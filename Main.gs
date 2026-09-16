/**
 * Entradas do aplicativo Google Apps Script.
 */

function doGet(e) {
  // FLEET_FRAGMENT_BOOTSTRAP: o token fica no fragmento (#tok=), que não é
  // enviado ao servidor. O shell valida o token antes de chamar qualquer API.
  var fleetBootstrapPage = e && e.parameter && String(e.parameter.page || '') === 'app';
  var fleetBootstrapToken = e && e.parameter && e.parameter.tok;
  if (fleetBootstrapPage && !fleetBootstrapToken) {
    var fleetTemplates = ['Index', 'index', 'Dashboard'];
    for (var fleetI = 0; fleetI < fleetTemplates.length; fleetI++) {
      try {
        var fleetTemplate = HtmlService.createTemplateFromFile(fleetTemplates[fleetI]);
        fleetTemplate.authToken = '';
        fleetTemplate.tok = '';
        fleetTemplate.sessionUser = {};
        fleetTemplate.data = { scriptUrl: ScriptApp.getService().getUrl() };
        return fleetTemplate.evaluate()
          .setTitle('Preferencial - NCA-SEM')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      } catch (fleetTemplateError) {}
    }
    return HtmlService.createHtmlOutput('Aplicação indisponível.');
  }
  try {
    var params = {};
    if (e && e.parameter) {
      params = e.parameter;
    }
    var tok = params.tok || '';

    // DEBUG: Log das tentativas
    Logger.log('=== doGet NCA-SEM INICIADO ===');
    Logger.log('params.page: ' + params.page);
    var tokenStatus = 'ausente';
    if (tok) {
      tokenStatus = 'presente';
    }
    Logger.log('tok: ' + tokenStatus);

    if (params.page === 'features') {
      return HtmlService.createTemplateFromFile('AdminFeatures').evaluate()
        .setTitle('Funcionalidades')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    if (params.page === 'login' || !isAuthenticatedByToken(tok)) {
      Logger.log('Redirecionando para Login');
      return HtmlService.createTemplateFromFile('Login').evaluate()
        .setTitle(Config_get().appName + ' | Login')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    Logger.log('Tentando carregar Index.html...');
  
    // DEBUG: Testar se Index.html existe
    try {
      var testHtml = HtmlService.createHtmlOutputFromFile('Index');
      Logger.log('✅ Index.html encontrado no Apps Script');
    } catch (err) {
      Logger.log('❌ ERRO: Index.html NAO encontrado no Apps Script!');
      Logger.log('Mensagem: ' + err.message);
      return HtmlService.createHtmlOutput(
        '<h1>Erro ao carregar o sistema.</h1>' +
        '<p style="color:red"><strong>Index.html não encontrado no Apps Script!</strong></p>' +
        '<p>Execute: clasp push</p>' +
        '<pre>Erro: ' + err.message + '</pre>'
      );
    }

    var template = UI_Router_createTemplate();
    template.authToken = tok;
    template.sessionUser = getSessionUser(tok) || {};
  
    Logger.log('Tentando avaliar template...');
    var result = template.evaluate()
      .setTitle(Config_get().appName)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  
    Logger.log('✅ Index.html carregado com sucesso!');
    Logger.log('=== doGet CONCLUIDO ===');
    return result;
  } catch (error) {
    Logger.log("Erro em doGet: " + error.message);
    throw error;
  }
}


function include(filename) {
  return UI_Router_include(filename);
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('NCA-SEM')
      .addItem('Preparar banco de dados', 'EnvironmentSetup_initialize')
      .addItem('Abrir painel lateral', 'Main_showSidebar')
      .addToUi();
  } catch (error) {
    Logger.log("Erro em onOpen: " + error.message);
    throw error;
  }
}

function Main_showSidebar() {
  try {
    var template = UI_Router_createTemplate();
    SpreadsheetApp.getUi().showSidebar(
      template
        .evaluate()
        .setTitle(Config_get().appName)
    );
  } catch (error) {
    Logger.log("Erro em Main_showSidebar: " + error.message);
    throw error;
  }
}


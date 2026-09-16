/**
 * TestAuthBug.gs - Script de teste para identificar bug de autenticação
 * 
 * INSTRUÇÕES:
 * 1. Copie este arquivo para o projeto do Google Apps Script
 * 2. Execute a função testCompleteAuthFlow()
 * 3. Veja os logs em "Execuções"
 * 4. Analise os resultados
 */

/**
 * Teste completo do fluxo de autenticação
 */
function testCompleteAuthFlow() {
  Logger.log('========================================');
  Logger.log('TESTE COMPLETO DE AUTENTICAÇÃO');
  Logger.log('========================================');
  
  // Limpar sessões antigas
  clearAllAuthSessions();
  
  // Teste 1: Verificar variáveis globais
  Logger.log('\n--- TESTE 1: Variáveis Globais ---');
  testGlobalVariables();
  
  // Teste 2: Testar ScriptProperties
  Logger.log('\n--- TESTE 2: ScriptProperties ---');
  testScriptProperties();
  
  // Teste 3: Testar login com usuário de teste
  Logger.log('\n--- TESTE 3: Login ---');
  var loginResult = testLogin();
  
  if (!loginResult) {
    Logger.log('❌ Login falhou. Verifique se existe um usuário de teste.');
    Logger.log('Crie um usuário na aba "Usuarios" com:');
    Logger.log('  username: teste');
    Logger.log('[LGPD] Evento registrado; detalhes sensíveis omitidos.');
    return;
  }
  
  // Teste 4: Verificar sessão imediatamente
  Logger.log('\n--- TESTE 4: Verificar Sessão (Imediato) ---');
  testVerifySession(loginResult.token);
  
  // Teste 5: Verificar sessão após 1 segundo
  Logger.log('\n--- TESTE 5: Verificar Sessão (Após 1s) ---');
  Utilities.sleep(1000);
  testVerifySession(loginResult.token);
  
  // Teste 6: Listar todas as sessões salvas
  Logger.log('\n--- TESTE 6: Sessões Salvas ---');
  listAllAuthSessions();
  
  Logger.log('\n========================================');
  Logger.log('TESTE COMPLETO FINALIZADO');
  Logger.log('========================================');
}

/**
 * Teste 1: Verificar se as variáveis globais estão definidas
 */
function testGlobalVariables() {
  try {
    Logger.log('AUTH_TOK_PREFIX_: ' + (typeof AUTH_TOK_PREFIX_ !== 'undefined' ? AUTH_TOK_PREFIX_ : 'UNDEFINED'));
    Logger.log('AUTH_TOK_TTL_MS_: ' + (typeof AUTH_TOK_TTL_MS_ !== 'undefined' ? AUTH_TOK_TTL_MS_ : 'UNDEFINED'));
    
    if (typeof AUTH_TOK_PREFIX_ === 'undefined') {
      Logger.log('❌ AUTH_TOK_PREFIX_ não está definido!');
      return false;
    }
    
    if (typeof AUTH_TOK_TTL_MS_ === 'undefined') {
      Logger.log('❌ AUTH_TOK_TTL_MS_ não está definido!');
      return false;
    }
    
    Logger.log('✅ Variáveis globais OK');
    return true;
  } catch (e) {
    Logger.log('❌ Erro ao verificar variáveis: ' + e);
    return false;
  }
}

/**
 * Teste 2: Verificar se ScriptProperties está funcionando
 */
function testScriptProperties() {
  try {
    try {
      try {
        var testKey = 'TEST_AUTH_BUG_KEY';
        var testValue = 'TEST_VALUE_' + new Date().getTime();
    
        Logger.log('Salvando chave de teste: ' + testKey);
        Logger.log('Valor de teste: ' + testValue);
    
        PropertiesService.getScriptProperties().setProperty(testKey, testValue);
    
        var retrieved = PropertiesService.getScriptProperties().getProperty(testKey);
        Logger.log('Valor recuperado: ' + retrieved);
    
        if (retrieved === testValue) {
          Logger.log('✅ ScriptProperties funcionando corretamente');
          PropertiesService.getScriptProperties().deleteProperty(testKey);
          return true;
        } else {
          Logger.log('❌ ScriptProperties NÃO está salvando corretamente!');
          Logger.log('Esperado: ' + testValue);
          Logger.log('Recebido: ' + retrieved);
          return false;
        }
      } catch (e) {
        Logger.log('❌ Erro ao testar ScriptProperties: ' + e);
        Logger.log('Stack: ' + e.stack);
        return false;
      }
    } catch (error) {
      Logger.log("Erro em testScriptProperties: " + error.message);
      throw error; // Re-lança para tratamento superior
    }
  } catch (error) {
    Logger.log("Erro em testScriptProperties: " + error.message);
    throw error;
  }
}

/**
 * Teste 3: Testar login
 */
function testLogin() {
  try {
    try {
      try {
        // Tente com usuário de teste padrão
        var username = 'teste';
        var password = 'teste123';
    
        Logger.log('Tentando login com usuário: ' + username);
    
        var result = Auth_login(username, password);
    
        Logger.log('Resultado do login: ' + JSON.stringify(result));
    
        if (result.success) {
          Logger.log('✅ Login bem-sucedido');
          Logger.log('[LGPD] Evento registrado; detalhes sensíveis omitidos.');
          Logger.log('Username: ' + result.session.username);
          Logger.log('ExpiresAt: ' + result.session.expiresAt);
      
          return {
            token: result.session.token,
            session: result.session
          };
        } else {
          Logger.log('❌ Login falhou: ' + result.message);
      
          // Tentar encontrar o primeiro usuário disponível
          Logger.log('Tentando encontrar primeiro usuário disponível...');
          var firstUser = findFirstUser();
      
          if (firstUser) {
            Logger.log('Usuário encontrado: ' + firstUser.username);
            Logger.log('⚠️  Mas não sabemos a senha. Crie um usuário "teste" com senha "teste123"');
          }
      
          return null;
        }
      } catch (e) {
        Logger.log('❌ Erro no login: ' + e);
        Logger.log('Stack: ' + e.stack);
        return null;
      }
    } catch (error) {
      Logger.log("Erro em testLogin: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em testLogin: " + error.message);
    throw error;
  }
}

/**
 * Teste 4: Verificar sessão
 */
function testVerifySession(token) {
  try {
    try {
      try {
        Logger.log('[LGPD] Evento registrado; detalhes sensíveis omitidos.');
    
        var result = Auth_verifySession(token);
    
        Logger.log('Resultado da verificação: ' + JSON.stringify(result));
    
        if (result && result.valid) {
          Logger.log('✅ Sessão válida');
          Logger.log('Username: ' + result.username);
          Logger.log('Role: ' + result.role);
      
          var now = new Date().getTime();
          var remaining = (result.expiresAt - now) / 1000;
          Logger.log('Tempo restante: ' + remaining + ' segundos');
      
          return true;
        } else {
          Logger.log('❌ Sessão INVÁLIDA');
      
          // Verificar se está salva no ScriptProperties
          var key = AUTH_TOK_PREFIX_ + token;
          var raw = PropertiesService.getScriptProperties().getProperty(key);
      
          if (raw) {
            Logger.log('⚠️  Sessão EXISTE no ScriptProperties mas foi considerada inválida!');
            Logger.log('Dados salvos: ' + raw);
          } else {
            Logger.log('⚠️  Sessão NÃO EXISTE no ScriptProperties');
          }
      
          return false;
        }
      } catch (e) {
        Logger.log('❌ Erro ao verificar sessão: ' + e);
        Logger.log('Stack: ' + e.stack);
        return false;
      }
    } catch (error) {
      Logger.log("Erro em testVerifySession: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em testVerifySession: " + error.message);
    throw error;
  }
}

/**
 * Listar todas as sessões de autenticação salvas
 */
function listAllAuthSessions() {
  try {
    try {
      var props = PropertiesService.getScriptProperties();
      var allKeys = props.getKeys();
    
      Logger.log('Total de chaves: ' + allKeys.length);
    
      var authKeys = allKeys.filter(function(key) {
        return key.indexOf('AUTH_TOK_') === 0;
      });
    
      Logger.log('Sessões de autenticação: ' + authKeys.length);
    
      authKeys.forEach(function(key) {
        var data = props.getProperty(key);
        Logger.log('  - ' + key);
        if (data) {
          try {
            var session = JSON.parse(data);
            var now = new Date().getTime();
            var remaining = (session.expiresAt - now) / 1000;
            Logger.log('    Username: ' + session.username);
            Logger.log('    Expira em: ' + remaining + ' segundos');
            Logger.log('    Válida: ' + (remaining > 0 ? 'SIM' : 'NÃO (expirada)'));
          } catch (e) {
            Logger.log('    ❌ Erro ao parsear: ' + e);
          }
        }
      });
    
      if (authKeys.length === 0) {
        Logger.log('⚠️  Nenhuma sessão encontrada! Este é o PROBLEMA!');
      }
    } catch (e) {
      Logger.log('❌ Erro ao listar sessões: ' + e);
    }
  } catch (error) {
    Logger.log("Erro em listAllAuthSessions: " + error.message);
    throw error;
  }
}

/**
 * Limpar todas as sessões de autenticação
 */
function clearAllAuthSessions() {
  try {
    try {
      var props = PropertiesService.getScriptProperties();
      var allKeys = props.getKeys();
    
      var authKeys = allKeys.filter(function(key) {
        return key.indexOf('AUTH_TOK_') === 0;
      });
    
      Logger.log('Limpando ' + authKeys.length + ' sessões antigas...');
    
      authKeys.forEach(function(key) {
        props.deleteProperty(key);
      });
    
      Logger.log('✅ Sessões limpas');
    } catch (e) {
      Logger.log('❌ Erro ao limpar sessões: ' + e);
    }
  } catch (error) {
    Logger.log("Erro em clearAllAuthSessions: " + error.message);
    throw error;
  }
}

/**
 * Encontrar o primeiro usuário disponível (para debug)
 */
function findFirstUser() {
  try {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var possibleNames = ['Usuarios', 'Usuarios', 'Users', 'Usuários'];
    
      for (var i = 0; i < possibleNames.length; i++) {
        var sheet = ss.getSheetByName(possibleNames[i]);
        if (sheet && sheet.getLastRow() >= 2) {
          var values = sheet.getDataRange().getValues();
          var headers = values[0];
        
          var usernameCol = -1;
          for (var j = 0; j < headers.length; j++) {
            if (String(headers[j]).toLowerCase().trim() === 'username') {
              usernameCol = j;
              break;
            }
          }
        
          if (usernameCol >= 0 && values.length > 1) {
            return {
              username: values[1][usernameCol],
              sheet: possibleNames[i]
            };
          }
        }
      }
    
      return null;
    } catch (e) {
      Logger.log('Erro ao buscar usuário: ' + e);
      return null;
    }
  } catch (error) {
    Logger.log("Erro em findFirstUser: " + error.message);
    throw error;
  }
}

/**
 * Teste rápido - Execute este para um teste simples
 */
function quickTest() {
  try {
    try {
      try {
        Logger.log('=== TESTE RÁPIDO ===\n');
  
        // Testar variáveis
        Logger.log('AUTH_TOK_PREFIX_ = ' + (typeof AUTH_TOK_PREFIX_ !== 'undefined' ? AUTH_TOK_PREFIX_ : 'UNDEFINED'));
        Logger.log('AUTH_TOK_TTL_MS_ = ' + (typeof AUTH_TOK_TTL_MS_ !== 'undefined' ? AUTH_TOK_TTL_MS_ : 'UNDEFINED'));
  
        // Testar ScriptProperties
        var testKey = 'QUICK_TEST';
        PropertiesService.getScriptProperties().setProperty(testKey, 'OK');
        var test = PropertiesService.getScriptProperties().getProperty(testKey);
        Logger.log('\nScriptProperties: ' + (test === 'OK' ? '✅ OK' : '❌ FALHOU'));
        PropertiesService.getScriptProperties().deleteProperty(testKey);
  
        Logger.log('\n=== FIM ===');
      } catch (error) {
        Logger.log("Erro em quickTest: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em quickTest: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em quickTest: " + error.message);
    throw error;
  }
}

/**
 * Logging estruturado para o console de execução do Apps Script.
 */

function LogManager_info(operation, context) {
  try {
    console.log(
      JSON.stringify({
        level: 'INFO',
        operation: operation,
        context: context || {},
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    Logger.log("Erro em LogManager_info: " + error.message);
    throw error;
  }
}

function LogManager_error(operation, error, requestId) {
  try {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        operation: operation,
        requestId: requestId || null,
        code: error && error.code ? error.code : 'INTERNAL_ERROR',
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    Logger.log("Erro em LogManager_error: " + error.message);
    throw error;
  }
}

function LogManager_audit(action, entityId, context) {
  try {
    console.log(
      JSON.stringify({
        level: 'AUDIT',
        action: action,
        entityId: entityId || null,
        actor: UserSession_getCurrentUser().email,
        context: context || {},
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    Logger.log("Erro em LogManager_audit: " + error.message);
    throw error;
  }
}

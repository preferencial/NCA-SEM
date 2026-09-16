/**
 * Envelope padrão para toda comunicação frontend/backend.
 */

function ErrorHandling_execute(operation, callback) {
  var requestId = Utilities.getUuid();
  var startedAt = new Date().getTime();

  try {
    var data = callback();
    return {
      ok: true,
      data: data,
      error: null,
      meta: {
        operation: operation,
        requestId: requestId,
        durationMs: new Date().getTime() - startedAt
      }
    };
  } catch (error) {
    if (typeof LogManager_error === 'function') {
      LogManager_error(operation, error, requestId);
    }
    return {
      ok: false,
      data: null,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: ErrorHandling_safeMessage(error),
        details: error.details || null
      },
      meta: {
        operation: operation,
        requestId: requestId,
        durationMs: new Date().getTime() - startedAt
      }
    };
  }
}

function ErrorHandling_safeMessage(error) {
  if (error && error.code === 'VALIDATION_ERROR') {
    return error.message;
  }
  if (error && error.code === 'NOT_FOUND') {
    return error.message;
  }
  if (error && error.code === 'FORBIDDEN') {
    return error.message;
  }
  if (error && error.code === 'CONFIG_ERROR') {
    return error.message;
  }
  if (error && error.code === 'CONFLICT') {
    return error.message;
  }
  if (error && error.code === 'BACKEND_SOURCE_UNAVAILABLE') {
    return error.message;
  }
  if (error && error.code === 'FRONTEND_SOURCE_UNAVAILABLE') {
    return error.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

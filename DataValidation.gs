/**
 * Sanitização e validação de dados recebidos da interface.
 */

function DataValidation_validateAluno(payload) {
  try {
    var input = payload || {};
    var errors = {};
    var normalized = {
      id: DataValidation_text(input.id, 80),
      nome: DataValidation_requiredText(input.nome, 'nome', 140, errors),
      escolaId: DataValidation_text(input.escolaId, 80),
      escola: DataValidation_requiredText(input.escola, 'escola', 160, errors),
      serie: DataValidation_requiredText(input.serie, 'serie', 60, errors),
      turma: DataValidation_requiredText(input.turma, 'turma', 60, errors),
      idade: DataValidation_optionalNumber(input.idade, 'idade', 3, 120, errors),
      rendaFamiliar: DataValidation_optionalNumber(
        input.rendaFamiliar,
        'rendaFamiliar',
        0,
        100000000,
        errors
      ),
      notaMatematica: DataValidation_optionalNumber(
        input.notaMatematica,
        'notaMatematica',
        0,
        10,
        errors
      ),
      notaPortugues: DataValidation_optionalNumber(
        input.notaPortugues,
        'notaPortugues',
        0,
        10,
        errors
      ),
      frequencia: DataValidation_optionalNumber(
        input.frequencia,
        'frequencia',
        0,
        100,
        errors
      ),
      status: input.status === 'inativo' ? 'inativo' : 'ativo'
    };

    if (Object.keys(errors).length) {
      var error = new Error('Revise os campos destacados e tente novamente.');
      error.code = 'VALIDATION_ERROR';
      error.details = errors;
      throw error;
    }

    return normalized;
  } catch (error) {
    Logger.log("Erro em DataValidation_validateAluno: " + error.message);
    throw error;
  }
}

function DataValidation_validateEscola(payload) {
  try {
    var input = payload || {};
    var errors = {};
    var normalized = {
      id: DataValidation_text(input.id, 80),
      nome: DataValidation_requiredText(input.nome, 'nome', 160, errors),
      codigoInep: DataValidation_text(input.codigoInep, 30),
      municipio: DataValidation_requiredText(
        input.municipio,
        'municipio',
        120,
        errors
      ),
      uf: DataValidation_requiredText(input.uf, 'uf', 2, errors).toUpperCase(),
      rede: DataValidation_requiredText(input.rede, 'rede', 40, errors),
      etapas: DataValidation_text(input.etapas, 180),
      totalSalas: DataValidation_optionalNumber(
        input.totalSalas,
        'totalSalas',
        0,
        10000,
        errors
      ),
      temInternet: DataValidation_boolean(input.temInternet),
      status: input.status === 'inativo' ? 'inativo' : 'ativo'
    };

    if (normalized.uf && !/^[A-Z]{2}$/.test(normalized.uf)) {
      errors.uf = 'Informe a sigla da UF com duas letras.';
    }

    DataValidation_throwIfErrors(errors);
    return normalized;
  } catch (error) {
    Logger.log("Erro em DataValidation_validateEscola: " + error.message);
    throw error;
  }
}

function DataValidation_validateProfessor(payload) {
  try {
    var input = payload || {};
    var errors = {};
    var normalized = {
      id: DataValidation_text(input.id, 80),
      nome: DataValidation_requiredText(input.nome, 'nome', 140, errors),
      email: DataValidation_email(input.email, 'email', errors),
      escolaId: DataValidation_requiredText(
        input.escolaId,
        'escolaId',
        80,
        errors
      ),
      escola: DataValidation_text(input.escola, 160),
      disciplina: DataValidation_requiredText(
        input.disciplina,
        'disciplina',
        100,
        errors
      ),
      cargaHoraria: DataValidation_optionalNumber(
        input.cargaHoraria,
        'cargaHoraria',
        0,
        168,
        errors
      ),
      formacao: DataValidation_text(input.formacao, 160),
      bolsa: DataValidation_boolean(input.bolsa),
      status: input.status === 'inativo' ? 'inativo' : 'ativo'
    };

    DataValidation_throwIfErrors(errors);
    return normalized;
  } catch (error) {
    Logger.log("Erro em DataValidation_validateProfessor: " + error.message);
    throw error;
  }
}

function DataValidation_text(value, maxLength) {
  try {
    var text = String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, maxLength || 500);
  } catch (error) {
    Logger.log("Erro em DataValidation_text: " + error.message);
    throw error;
  }
}

function DataValidation_requiredText(value, field, maxLength, errors) {
  try {
    var text = DataValidation_text(value, maxLength);
    if (!text) {
      errors[field] = 'Campo obrigatório.';
    }
    return text;
  } catch (error) {
    Logger.log("Erro em DataValidation_requiredText: " + error.message);
    throw error;
  }
}

function DataValidation_optionalNumber(value, field, min, max, errors) {
  try {
    if (value === '' || value === null || typeof value === 'undefined') {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    if (typeof value !== 'number' && typeof value !== 'string') {
      errors[field] = 'Informe um número entre ' + min + ' e ' + max + '.';
      return null;
    }
    var normalizedValue = typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value;
    var number = Number(normalizedValue);
    if (!isFinite(number) || number < min || number > max) {
      errors[field] = 'Informe um número entre ' + min + ' e ' + max + '.';
      return null;
    }
    return number;
  } catch (error) {
    Logger.log("Erro em DataValidation_optionalNumber: " + error.message);
    throw error;
  }
}

function DataValidation_email(value, field, errors) {
  var email = DataValidation_text(value, 180).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors[field] = 'Informe um e-mail válido.';
  }
  return email;
}

function DataValidation_boolean(value) {
  try {
    var normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return value === true ||
      value === 1 ||
      value === '1' ||
      normalized === 'true' ||
      normalized === 'sim' ||
      normalized === 'on';
  } catch (error) {
    Logger.log("Erro em DataValidation_boolean: " + error.message);
    throw error;
  }
}

function DataValidation_throwIfErrors(errors) {
  try {
    if (!Object.keys(errors).length) {
      return;
    }
    var error = new Error('Revise os campos destacados e tente novamente.');
    error.code = 'VALIDATION_ERROR';
    error.details = errors;
    throw error;
  } catch (error) {
    Logger.log("Erro em DataValidation_throwIfErrors: " + error.message);
    throw error;
  }
}

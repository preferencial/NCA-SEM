/**
 * Regras de negócio para alunos e indicadores educacionais básicos.
 */

function CRUD_Alunos_list(filters) {
  try {
    var options = filters || {};
    var search = DataValidation_text(options.search, 120).toLowerCase();
    var status = options.status === 'inativo' ? 'inativo' : options.status;
    var records = SheetsDB_readAll('alunos');

    var filtered = records.filter(function (record) {
      if (status && status !== 'todos' && record.status !== status) {
        return false;
      }
      if (!search) {
        return true;
      }
      var haystack = [
        record.nome,
        record.escola,
        record.serie,
        record.turma
      ]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(search) !== -1;
    });

    filtered.sort(function (left, right) {
      return String(right.updatedAt || '').localeCompare(
        String(left.updatedAt || '')
      );
    });

    return filtered.slice(0, Config_get().defaultPageSize);
  } catch (error) {
    Logger.log("Erro em CRUD_Alunos_list: " + error.message);
    throw error;
  }
}

function CRUD_Alunos_getById(id) {
  var aluno = SheetsDB_findById('alunos', id);
  if (!aluno) {
    var error = new Error('Aluno não encontrado.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return aluno;
}

function CRUD_Alunos_save(payload) {
  try {
    var aluno = DataValidation_validateAluno(payload);
    var existing = aluno.id
      ? SheetsDB_findById('alunos', aluno.id)
      : null;
    if (!aluno.escolaId && existing && existing.escolaId) {
      aluno.escolaId = existing.escolaId;
    }
    if (aluno.escolaId) {
      var escola = CRUD_Escolas_getById(aluno.escolaId);
      if (escola.status === 'inativo') {
        var schoolError = new Error('Selecione uma escola ativa.');
        schoolError.code = 'VALIDATION_ERROR';
        schoolError.details = {
          escolaId: 'A escola selecionada está arquivada.'
        };
        throw schoolError;
      }
      aluno.escola = escola.nome;
    }
    var now = new Date().toISOString();

    aluno.id = aluno.id || Utilities.getUuid();
    aluno.createdAt = existing && existing.createdAt
      ? existing.createdAt
      : now;
    aluno.updatedAt = now;

    var saved = SheetsDB_upsert('alunos', aluno);
    LogManager_audit(existing ? 'ALUNO_ATUALIZADO' : 'ALUNO_CRIADO', saved.id, {
      nome: saved.nome
    });
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Alunos_save: " + error.message);
    throw error;
  }
}

function CRUD_Alunos_archive(id) {
  try {
    var aluno = CRUD_Alunos_getById(id);
    aluno.status = 'inativo';
    aluno.updatedAt = new Date().toISOString();
    var saved = SheetsDB_upsert('alunos', aluno);
    LogManager_audit('ALUNO_ARQUIVADO', saved.id, {
      nome: saved.nome
    });
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Alunos_archive: " + error.message);
    throw error;
  }
}

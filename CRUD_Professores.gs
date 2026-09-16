/**
 * Regras de negócio para professores e vínculos escolares.
 */

function CRUD_Professores_list(filters) {
  try {
    var options = filters || {};
    var search = DataValidation_text(options.search, 120).toLowerCase();
    var status = options.status === 'inativo' ? 'inativo' : options.status;
    var escolaId = DataValidation_text(options.escolaId, 80);

    return SheetsDB_readAll('professores')
      .filter(function (record) {
        if (status && status !== 'todos' && record.status !== status) {
          return false;
        }
        if (escolaId && String(record.escolaId) !== escolaId) {
          return false;
        }
        if (!search) {
          return true;
        }
        return [
          record.nome,
          record.email,
          record.escola,
          record.disciplina,
          record.formacao
        ].join(' ').toLowerCase().indexOf(search) !== -1;
      })
      .sort(function (left, right) {
        return String(left.nome || '').localeCompare(String(right.nome || ''));
      })
      .slice(0, Config_get().defaultPageSize);
  } catch (error) {
    Logger.log("Erro em CRUD_Professores_list: " + error.message);
    throw error;
  }
}

function CRUD_Professores_getById(id) {
  var professor = SheetsDB_findById('professores', id);
  if (!professor) {
    var error = new Error('Professor não encontrado.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return professor;
}

function CRUD_Professores_save(payload) {
  try {
    var professor = DataValidation_validateProfessor(payload);
    var escola = CRUD_Escolas_getById(professor.escolaId);
    if (escola.status === 'inativo') {
      var schoolError = new Error('Selecione uma escola ativa.');
      schoolError.code = 'VALIDATION_ERROR';
      schoolError.details = {
        escolaId: 'A escola selecionada está arquivada.'
      };
      throw schoolError;
    }
    professor.escola = escola.nome;

    var existing = professor.id
      ? SheetsDB_findById('professores', professor.id)
      : null;
    var now = new Date().toISOString();
    professor.id = professor.id || Utilities.getUuid();
    professor.createdAt = existing && existing.createdAt
      ? existing.createdAt
      : now;
    professor.updatedAt = now;

    var saved = SheetsDB_upsert('professores', professor);
    LogManager_audit(
      existing ? 'PROFESSOR_ATUALIZADO' : 'PROFESSOR_CRIADO',
      saved.id,
      {
        nome: saved.nome,
        escolaId: saved.escolaId
      }
    );
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Professores_save: " + error.message);
    throw error;
  }
}

function CRUD_Professores_archive(id) {
  try {
    var professor = CRUD_Professores_getById(id);
    professor.status = 'inativo';
    professor.updatedAt = new Date().toISOString();
    var saved = SheetsDB_upsert('professores', professor);
    LogManager_audit('PROFESSOR_ARQUIVADO', saved.id, {
      nome: saved.nome
    });
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Professores_archive: " + error.message);
    throw error;
  }
}

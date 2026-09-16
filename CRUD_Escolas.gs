/**
 * Regras de negócio para unidades escolares.
 */

function CRUD_Escolas_list(filters) {
  try {
    var options = filters || {};
    var search = DataValidation_text(options.search, 120).toLowerCase();
    var status = options.status === 'inativo' ? 'inativo' : options.status;
    var records = SheetsDB_readAll('escolas');
    var alunos = SheetsDB_readAll('alunos');
    var professores = SheetsDB_readAll('professores');

    return records
      .filter(function (record) {
        if (status && status !== 'todos' && record.status !== status) {
          return false;
        }
        if (!search) {
          return true;
        }
        return [
          record.nome,
          record.codigoInep,
          record.municipio,
          record.uf,
          record.rede
        ].join(' ').toLowerCase().indexOf(search) !== -1;
      })
      .map(function (record) {
        record.totalAlunos = CRUD_Escolas_countLinked_(
          alunos,
          record,
          'escolaId'
        );
        record.totalProfessores = CRUD_Escolas_countLinked_(
          professores,
          record,
          'escolaId'
        );
        return record;
      })
      .sort(function (left, right) {
        return String(left.nome || '').localeCompare(String(right.nome || ''));
      })
      .slice(0, Config_get().defaultPageSize);
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_list: " + error.message);
    throw error;
  }
}

function CRUD_Escolas_options() {
  try {
    return CRUD_Escolas_list({
      status: 'ativo'
    }).map(function (escola) {
      return {
        id: escola.id,
        nome: escola.nome,
        municipio: escola.municipio,
        uf: escola.uf
      };
    });
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_options: " + error.message);
    throw error;
  }
}

function CRUD_Escolas_getById(id) {
  var escola = SheetsDB_findById('escolas', id);
  if (!escola) {
    var error = new Error('Escola não encontrada.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return escola;
}

function CRUD_Escolas_save(payload) {
  try {
    var escola = DataValidation_validateEscola(payload);
    var records = SheetsDB_readAll('escolas');
    var duplicate = records.filter(function (record) {
      if (String(record.id) === String(escola.id)) {
        return false;
      }
      var sameName = String(record.nome || '').toLowerCase() ===
        escola.nome.toLowerCase();
      var sameCode = escola.codigoInep &&
        String(record.codigoInep || '') === escola.codigoInep;
      return sameName || sameCode;
    })[0];

    if (duplicate) {
      var duplicateError = new Error('Já existe uma escola com o mesmo nome ou código INEP.');
      duplicateError.code = 'VALIDATION_ERROR';
      duplicateError.details = {
        nome: 'Revise o nome e o código INEP.'
      };
      throw duplicateError;
    }

    var existing = escola.id
      ? SheetsDB_findById('escolas', escola.id)
      : null;
    var now = new Date().toISOString();
    escola.id = escola.id || Utilities.getUuid();
    escola.createdAt = existing && existing.createdAt
      ? existing.createdAt
      : now;
    escola.updatedAt = now;

    var saved = SheetsDB_upsert('escolas', escola);
    LogManager_audit(
      existing ? 'ESCOLA_ATUALIZADA' : 'ESCOLA_CRIADA',
      saved.id,
      { nome: saved.nome }
    );
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_save: " + error.message);
    throw error;
  }
}

function CRUD_Escolas_archive(id) {
  try {
    var escola = CRUD_Escolas_getById(id);
    var activeLinks = CRUD_Escolas_linkCount_(escola);
    if (activeLinks.alunos || activeLinks.professores) {
      var error = new Error(
        'A escola possui vínculos ativos. Arquive ou transfira alunos e professores antes.'
      );
      error.code = 'CONFLICT';
      error.details = activeLinks;
      throw error;
    }

    escola.status = 'inativo';
    escola.updatedAt = new Date().toISOString();
    var saved = SheetsDB_upsert('escolas', escola);
    LogManager_audit('ESCOLA_ARQUIVADA', saved.id, {
      nome: saved.nome
    });
    return saved;
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_archive: " + error.message);
    throw error;
  }
}

function CRUD_Escolas_linkCount_(escola) {
  try {
    var alunos = SheetsDB_readAll('alunos').filter(function (record) {
      return record.status !== 'inativo';
    });
    var professores = SheetsDB_readAll('professores').filter(function (record) {
      return record.status !== 'inativo';
    });
    return {
      alunos: CRUD_Escolas_countLinked_(alunos, escola, 'escolaId'),
      professores: CRUD_Escolas_countLinked_(
        professores,
        escola,
        'escolaId'
      )
    };
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_linkCount_: " + error.message);
    throw error;
  }
}

function CRUD_Escolas_countLinked_(records, escola, idField) {
  try {
    return records.filter(function (record) {
      return String(record[idField] || '') === String(escola.id) ||
        (
          !record[idField] &&
          String(record.escola || '').toLowerCase() ===
            String(escola.nome || '').toLowerCase()
        );
    }).length;
  } catch (error) {
    Logger.log("Erro em CRUD_Escolas_countLinked_: " + error.message);
    throw error;
  }
}

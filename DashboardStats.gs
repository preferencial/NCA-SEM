/**
 * Indicadores rápidos usados pelo dashboard.
 */

function DashboardStats_get() {
  try {
    var alunos = SheetsDB_readAll('alunos');
    var escolas = SheetsDB_readAll('escolas');
    var professores = SheetsDB_readAll('professores');
    var ativos = alunos.filter(function (aluno) {
      return aluno.status !== 'inativo';
    });
    var escolasAtivas = escolas.filter(function (escola) {
      return escola.status !== 'inativo';
    });
    var professoresAtivos = professores.filter(function (professor) {
      return professor.status !== 'inativo';
    });

    return {
      totalAlunos: ativos.length,
      totalEscolas: escolasAtivas.length,
      totalProfessores: professoresAtivos.length,
      mediaMatematica: DashboardStats_average(ativos, 'notaMatematica'),
      mediaPortugues: DashboardStats_average(ativos, 'notaPortugues'),
      frequenciaMedia: DashboardStats_average(ativos, 'frequencia'),
      escolasAtendidas: escolasAtivas.length ||
        DashboardStats_uniqueCount(ativos, 'escola'),
      atualizadosEm: new Date().toISOString()
    };
  } catch (error) {
    Logger.log("Erro em DashboardStats_get: " + error.message);
    throw error;
  }
}

function DashboardStats_average(records, field) {
  try {
    var values = records
      .map(function (record) {
        var rawValue = record[field];
        if (rawValue === '' || rawValue === null || typeof rawValue === 'undefined') {
          return null;
        }
        return Utils_toNumber(rawValue, null);
      })
      .filter(function (value) {
        return value !== null && isFinite(value);
      });

    if (!values.length) {
      return null;
    }

    var total = values.reduce(function (sum, value) {
      return sum + value;
    }, 0);
    return Math.round((total / values.length) * 10) / 10;
  } catch (error) {
    Logger.log("Erro em DashboardStats_average: " + error.message);
    throw error;
  }
}

function DashboardStats_uniqueCount(records, field) {
  try {
    var values = {};
    records.forEach(function (record) {
      var value = String(record[field] || '').trim().toLowerCase();
      if (value) {
        values[value] = true;
      }
    });
    return Object.keys(values).length;
  } catch (error) {
    Logger.log("Erro em DashboardStats_uniqueCount: " + error.message);
    throw error;
  }
}

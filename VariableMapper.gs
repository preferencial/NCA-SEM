/**
 * VariableMapper.gs — Mapeamento canônico entre colunas da planilha e rótulos
 * legíveis usados no relatório e nas UIs de NCA e SEM.
 *
 * Centraliza qualquer renomeação de coluna: altere aqui e toda a camada de
 * apresentação (ReportGenerator, NcaDashboard, SemDashboard) se adapta.
 */

var VARIABLE_MAP = Object.freeze({
  // DB_Educacional
  notaMatematica : 'Nota de Matemática',
  notaPortugues  : 'Nota de Português',
  frequencia     : 'Frequência (%)',
  rendaFamiliar  : 'Renda Familiar',
  serie          : 'Série',
  turma          : 'Turma',
  idade          : 'Idade',
  // DB_Professores
  cargaHoraria   : 'Carga Horária',
  formacao       : 'Formação',
  bolsa          : 'Bolsa',
  disciplina     : 'Disciplina',
  // DB_Escolas
  totalSalas     : 'Total de Salas',
  temInternet    : 'Tem Internet',
  rede           : 'Rede de Ensino',
  codigoInep     : 'Código INEP',
  municipio      : 'Município',
  uf             : 'UF',
  etapas         : 'Etapas',
  // Constructo latente definido no SEM
  Desempenho     : 'Desempenho Escolar (latente)'
});

/**
 * Retorna o rótulo legível de uma variável, ou a própria chave se não mapeada.
 * @param {string} key Nome da coluna ou variável.
 * @return {string}
 */
function VariableMapper_label(key) {
  try {
    return VARIABLE_MAP[key] || String(key || '');
  } catch (error) {
    Logger.log("Erro em VariableMapper_label: " + error.message);
    throw error;
  }
}

/**
 * Converte um array de chaves em array de rótulos.
 * @param {string[]} keys
 * @return {string[]}
 */
function VariableMapper_labels(keys) {
  try {
    return (keys || []).map(VariableMapper_label);
  } catch (error) {
    Logger.log("Erro em VariableMapper_labels: " + error.message);
    throw error;
  }
}

/**
 * Retorna o mapa completo para uso no front-end (ex: tooltips).
 * @return {Object}
 */
function VariableMapper_getMap() {
  return VARIABLE_MAP;
}

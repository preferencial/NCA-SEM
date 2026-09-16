/**
 * Setup idempotente do ambiente da aplicação.
 */

function EnvironmentSetup_initialize() {
  var alunoSheet = SheetsDB_ensureSheet('alunos');
  var escolaSheet = SheetsDB_ensureSheet('escolas');
  var professorSheet = SheetsDB_ensureSheet('professores');
  var sheet = alunoSheet.sheet;

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidths(4, 11, 120);

  escolaSheet.sheet.setColumnWidth(1, 220);
  escolaSheet.sheet.setColumnWidth(2, 260);
  escolaSheet.sheet.setColumnWidths(3, 10, 130);

  professorSheet.sheet.setColumnWidth(1, 220);
  professorSheet.sheet.setColumnWidth(2, 240);
  professorSheet.sheet.setColumnWidths(3, 10, 140);

  return {
    spreadsheetId: SheetsDB_getSpreadsheet().getId(),
    sheets: [
      {
        key: 'alunos',
        name: alunoSheet.name,
        created: alunoSheet.created
      },
      {
        key: 'escolas',
        name: escolaSheet.name,
        created: escolaSheet.created
      },
      {
        key: 'professores',
        name: professorSheet.name,
        created: professorSheet.created
      }
    ]
  };
}

function EnvironmentSetup_setSpreadsheetId(spreadsheetId) {
  Config_setSpreadsheetId(spreadsheetId);
  return EnvironmentSetup_initialize();
}

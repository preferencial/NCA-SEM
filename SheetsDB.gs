/**
 * Repositório tabular sobre Google Sheets.
 */

function SheetsDB_getSpreadsheet() {
  try {
    var spreadsheetId = Config_getSpreadsheetId();
    if (spreadsheetId) {
      return SpreadsheetApp.openById(spreadsheetId);
    }

    return getBoundSpreadsheet_();
  } catch (error) {
    Logger.log("Erro em SheetsDB_getSpreadsheet: " + error.message);
    throw error;
  }
}

function SheetsDB_ensureSheet(tableKey) {
  try {
    try {
      try {
        var definition = Config_getSheet(tableKey);
        var spreadsheet = SheetsDB_getSpreadsheet();
        var sheet = spreadsheet.getSheetByName(definition.name);
        var created = false;

        if (!sheet) {
          sheet = spreadsheet.insertSheet(definition.name);
          created = true;
        }

        var currentHeaders = [];
        if (sheet.getLastColumn() > 0) {
          currentHeaders = sheet
            .getRange(1, 1, 1, sheet.getLastColumn())
            .getValues()[0]
            .map(String);
        }

        if (!SheetsDB_arraysEqual(currentHeaders, definition.headers)) {
          sheet
            .getRange(1, 1, 1, definition.headers.length)
            .setValues([definition.headers]);
        }

        sheet.setFrozenRows(1);
        sheet
          .getRange(1, 1, 1, definition.headers.length)
          .setFontWeight('bold')
          .setBackground('#172033')
          .setFontColor('#ffffff');

        return {
          sheet: sheet,
          created: created,
          name: definition.name
        };
      } catch (error) {
        Logger.log("Erro em SheetsDB_ensureSheet: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em SheetsDB_ensureSheet: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em SheetsDB_ensureSheet: " + error.message);
    throw error;
  }
}

function SheetsDB_readAll(tableKey) {
  try {
    try {
      var definition = Config_getSheet(tableKey);
      var ensured = SheetsDB_ensureSheet(tableKey);
      var sheet = ensured.sheet;
      var lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return [];
      }

      var values = sheet
        .getRange(2, 1, lastRow - 1, definition.headers.length)
        .getValues();

      return values.map(function (row) {
        return SheetsDB_rowToRecord(definition.headers, row);
      });
    } catch (error) {
      Logger.log("Erro em SheetsDB_readAll: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em SheetsDB_readAll: " + error.message);
    throw error;
  }
}

function SheetsDB_findById(tableKey, id) {
  try {
    var targetId = String(id || '');
    if (!targetId) {
      return null;
    }

    var records = SheetsDB_readAll(tableKey);
    for (var index = 0; index < records.length; index += 1) {
      if (String(records[index].id) === targetId) {
        return records[index];
      }
    }
    return null;
  } catch (error) {
    Logger.log("Erro em SheetsDB_findById: " + error.message);
    throw error;
  }
}

function SheetsDB_upsert(tableKey, record) {
  try {
    try {
      try {
        var definition = Config_getSheet(tableKey);
        var ensured = SheetsDB_ensureSheet(tableKey);
        var sheet = ensured.sheet;
        var lock = LockService.getScriptLock();

        lock.waitLock(20000);
        try {
          var lastRow = sheet.getLastRow();
          var targetRow = lastRow + 1;

          if (lastRow > 1) {
            var ids = sheet
              .getRange(2, 1, lastRow - 1, 1)
              .getValues();
            for (var index = 0; index < ids.length; index += 1) {
              if (String(ids[index][0]) === String(record.id)) {
                targetRow = index + 2;
                break;
              }
            }
          }

          var row = definition.headers.map(function (header) {
            var value = record[header];
            return value === null || typeof value === 'undefined' ? '' : value;
          });

          sheet
            .getRange(targetRow, 1, 1, definition.headers.length)
            .setValues([row]);

          return SheetsDB_rowToRecord(definition.headers, row);
        } finally {
          lock.releaseLock();
        }
      } catch (error) {
        Logger.log("Erro em SheetsDB_upsert: " + error.message);
        throw error; // Re-lança para tratamento superior
      }
    } catch (error) {
      Logger.log("Erro em SheetsDB_upsert: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em SheetsDB_upsert: " + error.message);
    throw error;
  }
}

function SheetsDB_rowToRecord(headers, row) {
  try {
    var record = {};
    headers.forEach(function (header, index) {
      record[header] = SheetsDB_normalizeCell(row[index]);
    });
    return record;
  } catch (error) {
    Logger.log("Erro em SheetsDB_rowToRecord: " + error.message);
    throw error;
  }
}

function SheetsDB_normalizeCell(value) {
  try {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return value.toISOString();
    }
    return value;
  } catch (error) {
    Logger.log("Erro em SheetsDB_normalizeCell: " + error.message);
    throw error;
  }
}

function SheetsDB_arraysEqual(left, right) {
  try {
    if (left.length !== right.length) {
      return false;
    }
    for (var index = 0; index < left.length; index += 1) {
      if (String(left[index]) !== String(right[index])) {
        return false;
      }
    }
    return true;
  } catch (error) {
    Logger.log("Erro em SheetsDB_arraysEqual: " + error.message);
    throw error;
  }
}

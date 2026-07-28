function getDatabase_() {
  return SpreadsheetApp.openById(
    APP_CONFIG.SPREADSHEET_ID
  );
}

function getSheet_(sheetName) {
  const sheet = getDatabase_().getSheetByName(
    sheetName
  );

  if (!sheet) {
    throw new Error(
      'Missing required sheet: ' + sheetName
    );
  }

  return sheet;
}

function getSheetValues_(sheetName) {
  return getSheet_(sheetName)
    .getDataRange()
    .getDisplayValues();
}

function appendSheetRow_(sheetName, values) {
  getSheet_(sheetName).appendRow(values);
}
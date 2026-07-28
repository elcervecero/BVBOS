/**
 * BVBOS BREWING VALIDATION SYNC
 *
 * Synchronizes the Brewing Batches sheet's Current Stage
 * dropdown with APP_CONFIG.BREWING.STAGES.
 *
 * Safe to run repeatedly.
 */


/**
 * Updates the Current Stage data validation for all brewing rows.
 */
function syncBrewingStageValidation() {
  const sheet =
    getSheet_(
      APP_CONFIG.SHEETS.BREWING_BATCHES
    );

  const headerRow =
    APP_CONFIG.HEADERS.HEADER_ROW;

  const dataRow =
    APP_CONFIG.HEADERS.DATA_ROW;

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 1) {
    throw new Error(
      'Brewing Batches sheet has no columns.'
    );
  }

  const headers =
    sheet
      .getRange(
        headerRow,
        1,
        1,
        lastColumn
      )
      .getDisplayValues()[0];

  const headerMap =
    buildHeaderMap_(
      headers
    );

  if (
    headerMap['Current Stage'] ===
    undefined
  ) {
    throw new Error(
      'Current Stage column was not found in the Brewing Batches sheet.'
    );
  }

  const stageColumn =
    headerMap['Current Stage'] + 1;

  const stages =
    APP_CONFIG.BREWING.STAGES;

  if (
    !Array.isArray(stages) ||
    !stages.length
  ) {
    throw new Error(
      'APP_CONFIG.BREWING.STAGES is empty or unavailable.'
    );
  }

  const maxRows =
    Math.max(
      sheet.getMaxRows() -
      dataRow +
      1,
      1
    );

  const rule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        stages,
        true
      )
      .setAllowInvalid(false)
      .setHelpText(
        'Select a valid BVBOS brewing stage.'
      )
      .build();

  sheet
    .getRange(
      dataRow,
      stageColumn,
      maxRows,
      1
    )
    .setDataValidation(
      rule
    );

  const migrationResult =
    migrateLegacyBrewingStages_(
      sheet,
      dataRow,
      stageColumn,
      maxRows
    );

  const result = {
    success: true,
    sheet:
      APP_CONFIG.SHEETS
        .BREWING_BATCHES,

    column:
      'Current Stage',

    stageCount:
      stages.length,

    stages:
      stages,

    migratedRows:
      migrationResult.migratedRows
  };

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}


/**
 * Converts legacy stage names to the current BVBOS stage names.
 */
function migrateLegacyBrewingStages_(
  sheet,
  dataRow,
  stageColumn,
  rowCount
) {
  const range =
    sheet.getRange(
      dataRow,
      stageColumn,
      rowCount,
      1
    );

  const values =
    range.getValues();

  let migratedRows = 0;

  values.forEach(function(row) {
    const currentValue =
      String(
        row[0] || ''
      ).trim();

    if (currentValue === 'Mash') {
      row[0] = 'Mash In';
      migratedRows++;
    }
  });

  if (migratedRows > 0) {
    range.setValues(values);
  }

  return {
    migratedRows:
      migratedRows
  };
}


/**
 * Acceptance test.
 */
function testBrewingStageValidationSync() {
  return syncBrewingStageValidation();
}

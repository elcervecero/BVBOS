/**
 * BVBOS v0.7 RC7 — BREWING ENGINE CLEANUP
 *
 * Canonical workflow:
 * Planned → In Progress → Brew Complete closeout → Completed
 *
 * Canonical audit marker:
 * Stage Readings Saved
 *
 * Legacy reading markers remain supported by BusinessLayer.gs.
 */

/**
 * RC6.3.1 HOTFIX
 *
 * Brew Complete remains In Progress until:
 * 1. Brew Complete stage readings are saved.
 * 2. Brew Closeout & Cellar Handoff is submitted.
 */

/**
 * BVBOS BREWING MODULE
 *
 * Handles:
 * - Brewing batch creation
 * - Brew-day event logging
 * - Stage advancement
 * - Active batch status
 * - Brewing dashboard data
 */


/**
 * Creates a new brewing batch.
 */
function createBrewingBatch(batchData) {
  batchData = batchData || {};

  if (!batchData.batchNumber) {
    throw new Error(
      'Batch Number is required.'
    );
  }

  if (!batchData.product) {
    throw new Error(
      'Product is required.'
    );
  }

  const batchId =
    batchData.batchId ||
    createBvbosId_('BAT');

  const brewDate =
    batchData.brewDate
      ? new Date(batchData.brewDate)
      : new Date();

  const status =
    batchData.status ||
    'Planned';

  const currentStage =
    batchData.currentStage ||
    'Planned';

  appendSheetRow_(
    APP_CONFIG.SHEETS.BREWING_BATCHES,
    [
      batchId,
      batchData.batchNumber || '',
      brewDate,
      batchData.product || '',
      batchData.recipeId || '',
      batchData.brewer || '',
      batchData.plannedVolumeBbl || '',
      batchData.actualKettleVolumeBbl || '',
      batchData.fermenter || '',
      status,
      currentStage,
      batchData.startDateTime || '',
      batchData.completedDateTime || '',
      batchData.originalGravity || '',
      batchData.finalNotes || ''
    ]
  );

  logBvbosEvent({
    module: 'Brewing',
    eventType: 'Batch Created',
    title:
      'Batch ' +
      batchData.batchNumber +
      ' created — ' +
      batchData.product,

    batchId: batchId,
    product: batchData.product,
    employee: batchData.brewer || '',
    status: status,
    sourceRecordId: batchId,
    createdAutomatically: false
  });

  return {
    success: true,
    batchId: batchId,
    batchNumber: batchData.batchNumber,
    product: batchData.product,
    status: status,
    currentStage: currentStage
  };
}


/**
 * Logs one brew-day event.
 */
function logBrewDayEvent(eventData) {
  eventData = eventData || {};

  if (!eventData.batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  if (!eventData.stage) {
    throw new Error(
      'Brew stage is required.'
    );
  }

  if (!eventData.action) {
    throw new Error(
      'Brew action is required.'
    );
  }

  const eventId =
    eventData.eventId ||
    createBvbosId_('BRW');

  const eventDateTime =
    eventData.eventDateTime
      ? new Date(eventData.eventDateTime)
      : new Date();

  const status =
    eventData.status ||
    'Completed';

  appendSheetRow_(
    APP_CONFIG.SHEETS.BREW_DAY_EVENTS,
    [
      eventId,
      eventData.batchId,
      eventDateTime,
      eventData.stage || '',
      eventData.action || '',
      eventData.temperatureF || '',
      eventData.volumeGal || '',
      eventData.gravity || '',
      eventData.durationMin || '',
      eventData.employee || '',
      status,
      eventData.notes || '',
      eventData.createdAutomatically === false
        ? 'No'
        : 'Yes'
    ]
  );

  logBvbosEvent({
    module: 'Brewing',
    eventType: eventData.action,
    title:
      eventData.stage +
      ': ' +
      eventData.action,

    description: eventData.notes || '',
    batchId: eventData.batchId,
    employee: eventData.employee || '',
    status: status,
    sourceRecordId: eventId,
    createdAutomatically:
      eventData.createdAutomatically !== false
  });

  return {
    success: true,
    eventId: eventId,
    batchId: eventData.batchId,
    stage: eventData.stage,
    action: eventData.action,
    status: status
  };
}


/**
 * Starts one planned batch.
 *
 * Rules:
 * - Only a Planned batch may be started.
 * - Only one active brewing batch may exist at a time.
 * - Starting a batch moves it to Water Preparation.
 */
function startBrewingBatch(
  batchId,
  employee,
  notes
) {
  if (!batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  const existingActiveBatch =
    getActiveBrewingBatch_();

  if (
    existingActiveBatch &&
    existingActiveBatch.batchId !== batchId
  ) {
    throw new Error(
      'Another brewing batch is already active: Batch ' +
      existingActiveBatch.batchNumber +
      '. Complete or place that batch on hold before starting another.'
    );
  }

  const sheet = getSheet_(
    APP_CONFIG.SHEETS.BREWING_BATCHES
  );

  const values = sheet
    .getDataRange()
    .getDisplayValues();

  if (values.length < 4) {
    throw new Error(
      'No brewing batches were found.'
    );
  }

  const headerMap =
    buildHeaderMap_(values[2]);

  const rows = values.slice(3);

  let matchedRow = 0;
  let batchNumber = '';
  let product = '';
  let currentStatus = '';
  let currentStage = '';

  rows.some(function(row, index) {
    const currentBatchId =
      safeValue_(
        row,
        headerMap,
        'Batch ID'
      );

    if (currentBatchId === batchId) {
      matchedRow =
        APP_CONFIG.HEADERS.DATA_ROW +
        index;

      batchNumber =
        safeValue_(
          row,
          headerMap,
          'Batch Number'
        );

      product =
        safeValue_(
          row,
          headerMap,
          'Product'
        );

      currentStatus =
        safeValue_(
          row,
          headerMap,
          'Status'
        );

      currentStage =
        safeValue_(
          row,
          headerMap,
          'Current Stage'
        );

      return true;
    }

    return false;
  });

  if (!matchedRow) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  if (
    normalizeStatus_(currentStatus) !==
    'planned'
  ) {
    throw new Error(
      'Only a Planned batch can be started. Current status: ' +
      currentStatus
    );
  }

  if (
    currentStage &&
    currentStage !== 'Planned'
  ) {
    throw new Error(
      'Only a batch at the Planned stage can be started. Current stage: ' +
      currentStage
    );
  }

  const statusColumn =
    headerMap['Status'] + 1;

  const stageColumn =
    headerMap['Current Stage'] + 1;

  const startColumn =
    headerMap['Start Date / Time'] + 1;

  const startedAt = new Date();

  sheet
    .getRange(
      matchedRow,
      statusColumn
    )
    .setValue('In Progress');

  sheet
    .getRange(
      matchedRow,
      stageColumn
    )
    .setValue('Water Preparation');

  sheet
    .getRange(
      matchedRow,
      startColumn
    )
    .setValue(startedAt);

  logBrewDayEvent({
    batchId: batchId,
    stage: 'Water Preparation',
    action: 'Brew Started',
    employee: employee || '',
    status: 'In Progress',
    notes:
      notes ||
      'Batch started and moved to Water Preparation.',
    createdAutomatically: false
  });

  return {
    success: true,
    batchId: batchId,
    batchNumber: batchNumber,
    product: product,
    currentStage: 'Water Preparation',
    status: 'In Progress',
    startDateTime: startedAt
  };
}


/**
 * Advances a batch to a new brew stage.
 */
function advanceBrewingStage(
  batchId,
  newStage,
  employee,
  notes
) {
  if (!batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  if (!newStage) {
    throw new Error(
      'New stage is required.'
    );
  }

  if (
    APP_CONFIG.BREWING.STAGES
      .indexOf(newStage) === -1
  ) {
    throw new Error(
      'Invalid brewing stage: ' +
      newStage
    );
  }

  const sheet = getSheet_(
    APP_CONFIG.SHEETS.BREWING_BATCHES
  );

  const values = sheet
    .getDataRange()
    .getDisplayValues();

  const headerMap =
    buildHeaderMap_(values[2]);

  const rows =
    values.slice(3);

  let matchedRow = 0;
  let batchNumber = '';
  let product = '';

  rows.some(function(row, index) {
    const currentBatchId =
      safeValue_(
        row,
        headerMap,
        'Batch ID'
      );

    if (currentBatchId === batchId) {
      matchedRow =
        APP_CONFIG.HEADERS.DATA_ROW +
        index;

      batchNumber =
        safeValue_(
          row,
          headerMap,
          'Batch Number'
        );

      product =
        safeValue_(
          row,
          headerMap,
          'Product'
        );

      return true;
    }

    return false;
  });

  if (!matchedRow) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  const stageColumn =
    headerMap['Current Stage'] + 1;

  const statusColumn =
    headerMap['Status'] + 1;

  const startColumn =
    headerMap['Start Date / Time'] + 1;

  const completedColumn =
    headerMap['Completed Date / Time'] + 1;

  sheet
    .getRange(
      matchedRow,
      stageColumn
    )
    .setValue(newStage);

  if (
    newStage !== 'Planned' &&
    !sheet
      .getRange(
        matchedRow,
        startColumn
      )
      .getValue()
  ) {
    sheet
      .getRange(
        matchedRow,
        startColumn
      )
      .setValue(new Date());
  }

  let batchStatus = 'In Progress';

  if (newStage === 'Planned') {
    batchStatus = 'Planned';
  }

  if (
    newStage ===
    'Brew Complete'
  ) {
    /*
     * Brew Complete is now the closeout stage.
     * The batch remains active until the dedicated
     * Brew Closeout & Cellar Handoff form is submitted.
     */
    batchStatus = 'In Progress';

    sheet
      .getRange(
        matchedRow,
        completedColumn
      )
      .clearContent();
  }

  sheet
    .getRange(
      matchedRow,
      statusColumn
    )
    .setValue(batchStatus);

  logBrewDayEvent({
    batchId: batchId,
    stage: newStage,
    action: 'Stage Advanced',
    employee: employee || '',
    status:
      'In Progress',

    notes:
      notes ||
      (
        'Batch advanced to ' +
        newStage
      ),

    createdAutomatically: false
  });

  return {
    success: true,
    batchId: batchId,
    batchNumber: batchNumber,
    product: product,
    currentStage: newStage,
    status: batchStatus
  };
}


/**
 * Returns all brewing batches.
 */
function getBrewingBatches_() {
  const values = getSheetValues_(
    APP_CONFIG.SHEETS.BREWING_BATCHES
  );

  if (values.length < 4) {
    return [];
  }

  const headerMap =
    buildHeaderMap_(values[2]);

  const rows =
    nonEmptyRows_(
      values.slice(3),
      0
    );

  return rows.map(function(row) {
    return {
      batchId: safeValue_(
        row,
        headerMap,
        'Batch ID'
      ),

      batchNumber: safeValue_(
        row,
        headerMap,
        'Batch Number'
      ),

      brewDate: safeValue_(
        row,
        headerMap,
        'Brew Date'
      ),

      product: safeValue_(
        row,
        headerMap,
        'Product'
      ),

      recipeId: safeValue_(
        row,
        headerMap,
        'Recipe ID'
      ),

      brewer: safeValue_(
        row,
        headerMap,
        'Brewer'
      ),

      plannedVolumeBbl: safeValue_(
        row,
        headerMap,
        'Planned Volume BBL'
      ),

      actualKettleVolumeBbl: safeValue_(
        row,
        headerMap,
        'Actual Kettle Volume BBL'
      ),

      fermenter: safeValue_(
        row,
        headerMap,
        'Fermenter'
      ),

      status: safeValue_(
        row,
        headerMap,
        'Status'
      ),

      currentStage: safeValue_(
        row,
        headerMap,
        'Current Stage'
      ),

      startDateTime: safeValue_(
        row,
        headerMap,
        'Start Date / Time'
      ),

      completedDateTime: safeValue_(
        row,
        headerMap,
        'Completed Date / Time'
      ),

      originalGravity: safeValue_(
        row,
        headerMap,
        'Original Gravity'
      ),

      finalNotes: safeValue_(
        row,
        headerMap,
        'Final Notes'
      )
    };
  });
}






/* =========================================================
   RC8.2 BREW RECORD PDF & PRINT CENTER
   ========================================================= */

function getBrewReportFolder_() {
  const folderName =
    'BVBOS Brew Reports';

  const folders =
    DriveApp.getFoldersByName(
      folderName
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(
    folderName
  );
}


function formatBrewReportValue_(
  value,
  fallback
) {
  const text =
    String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();

  return text || fallback || '';
}


function appendBrewReportHeading_(
  body,
  text,
  level
) {
  const paragraph =
    body.appendParagraph(
      text
    );

  paragraph.setHeading(
    level ||
    DocumentApp.ParagraphHeading
      .HEADING2
  );

  return paragraph;
}


function appendBrewReportKeyValueTable_(
  body,
  rows
) {
  const filtered =
    rows.filter(function(row) {
      return (
        row[1] !== null &&
        row[1] !== undefined &&
        String(row[1]).trim() !== ''
      );
    });

  if (!filtered.length) {
    return null;
  }

  const table =
    body.appendTable(
      filtered.map(function(row) {
        return [
          String(row[0]),
          String(row[1])
        ];
      })
    );

  table.setBorderWidth(1);

  for (
    let index = 0;
    index < table.getNumRows();
    index++
  ) {
    const row =
      table.getRow(index);

    row
      .getCell(0)
      .setBackgroundColor(
        '#E8EEF3'
      );

    row
      .getCell(0)
      .editAsText()
      .setBold(true);
  }

  return table;
}


function buildBrewReportEventRows_(
  events
) {
  const rows = [[
    'Date / Time',
    'Stage',
    'Action',
    'Readings',
    'Employee',
    'Status',
    'Notes'
  ]];

  events.forEach(function(event) {
    const readings = [
      event.temperatureF
        ? (
            event.temperatureF +
            ' F'
          )
        : '',

      event.volumeGal
        ? (
            event.volumeGal +
            ' gal'
          )
        : '',

      event.gravity
        ? (
            'Gravity ' +
            event.gravity
          )
        : '',

      event.durationMin
        ? (
            event.durationMin +
            ' min'
          )
        : ''
    ]
      .filter(Boolean)
      .join(' | ');

    rows.push([
      formatBrewReportValue_(
        event.eventDateTime,
        ''
      ),

      formatBrewReportValue_(
        event.stage,
        ''
      ),

      formatBrewReportValue_(
        event.action,
        ''
      ),

      readings,

      formatBrewReportValue_(
        event.employee,
        ''
      ),

      formatBrewReportValue_(
        event.status,
        ''
      ),

      formatBrewReportValue_(
        event.notes,
        ''
      )
    ]);
  });

  return rows;
}


function styleBrewReportEventTable_(
  table
) {
  if (!table) {
    return;
  }

  table.setBorderWidth(1);

  if (table.getNumRows() > 0) {
    const header =
      table.getRow(0);

    for (
      let index = 0;
      index < header.getNumCells();
      index++
    ) {
      header
        .getCell(index)
        .setBackgroundColor(
          '#F28C28'
        );

      header
        .getCell(index)
        .editAsText()
        .setBold(true)
        .setForegroundColor(
          '#111111'
        );
    }
  }

  for (
    let rowIndex = 1;
    rowIndex < table.getNumRows();
    rowIndex++
  ) {
    if (rowIndex % 2 === 0) {
      const row =
        table.getRow(rowIndex);

      for (
        let cellIndex = 0;
        cellIndex < row.getNumCells();
        cellIndex++
      ) {
        row
          .getCell(cellIndex)
          .setBackgroundColor(
            '#F7F9FA'
          );
      }
    }
  }
}


function createBrewingRecordPdf_(
  batch,
  handoff,
  events,
  generatedBy
) {
  const documentName =
    'Brew Record - ' +
    (
      batch.batchNumber ||
      batch.batchId
    ) +
    ' - ' +
    (
      batch.product ||
      'Unnamed Product'
    );

  const document =
    DocumentApp.create(
      documentName
    );

  const body =
    document.getBody();

  body.clear();

  const title =
    body.appendParagraph(
      'BUENA VISTA BREWING CO.'
    );

  title
    .setAlignment(
      DocumentApp.HorizontalAlignment
        .CENTER
    )
    .editAsText()
    .setBold(true)
    .setFontSize(18)
    .setForegroundColor(
      '#F28C28'
    );

  const subtitle =
    body.appendParagraph(
      'Official Brew Record'
    );

  subtitle
    .setAlignment(
      DocumentApp.HorizontalAlignment
        .CENTER
    )
    .editAsText()
    .setBold(true)
    .setFontSize(14);

  body.appendParagraph('');

  appendBrewReportHeading_(
    body,
    'Batch Summary',
    DocumentApp.ParagraphHeading
      .HEADING2
  );

  appendBrewReportKeyValueTable_(
    body,
    [
      [
        'Batch Number',
        batch.batchNumber
      ],
      [
        'Batch ID',
        batch.batchId
      ],
      [
        'Product',
        batch.product
      ],
      [
        'Recipe',
        batch.recipeId
      ],
      [
        'Brew Date',
        batch.brewDate
      ],
      [
        'Completed',
        batch.completedDateTime
      ],
      [
        'Brewer',
        batch.brewer
      ],
      [
        'Fermenter',
        batch.fermenter
      ],
      [
        'Planned Volume',
        batch.plannedVolumeBbl
          ? (
              batch.plannedVolumeBbl +
              ' BBL'
            )
          : ''
      ],
      [
        'Actual Kettle Volume',
        batch.actualKettleVolumeBbl
          ? (
              batch.actualKettleVolumeBbl +
              ' BBL'
            )
          : ''
      ],
      [
        'Final Transfer Volume',
        batch.finalVolumeGal
          ? (
              batch.finalVolumeGal +
              ' gal'
            )
          : ''
      ],
      [
        'Original Gravity',
        batch.originalGravity
      ],
      [
        'Estimated Brew-Day Loss',
        batch.estimatedLossGal
          ? (
              batch.estimatedLossGal +
              ' gal'
            )
          : ''
      ],
      [
        'Total Recorded Events',
        batch.eventCount
      ]
    ]
  );

  if (
    handoff &&
    handoff.handoffId
  ) {
    body.appendParagraph('');

    appendBrewReportHeading_(
      body,
      'Cellar Handoff',
      DocumentApp.ParagraphHeading
        .HEADING2
    );

    appendBrewReportKeyValueTable_(
      body,
      [
        [
          'Handoff ID',
          handoff.handoffId
        ],
        [
          'Handoff Date / Time',
          handoff.handoffDateTime
        ],
        [
          'Fermenter',
          handoff.fermenter
        ],
        [
          'Final Volume',
          handoff.finalVolumeGal
            ? (
                handoff.finalVolumeGal +
                ' gal'
              )
            : ''
        ],
        [
          'Original Gravity',
          handoff.originalGravity
        ],
        [
          'Knockout Temperature',
          handoff.knockoutTemperatureF
            ? (
                handoff.knockoutTemperatureF +
                ' F'
              )
            : ''
        ],
        [
          'Estimated Loss',
          handoff.estimatedLossGal
            ? (
                handoff.estimatedLossGal +
                ' gal'
              )
            : ''
        ],
        [
          'Handoff Confirmed',
          handoff.handoffConfirmed
        ],
        [
          'Status',
          handoff.status
        ],
        [
          'Final Notes',
          handoff.finalNotes
        ]
      ]
    );
  }

  body.appendParagraph('');

  appendBrewReportHeading_(
    body,
    'Brew-Day Timeline & Event Log',
    DocumentApp.ParagraphHeading
      .HEADING2
  );

  if (events.length) {
    const eventTable =
      body.appendTable(
        buildBrewReportEventRows_(
          events
        )
      );

    styleBrewReportEventTable_(
      eventTable
    );
  } else {
    body.appendParagraph(
      'No brew-day events were recorded.'
    );
  }

  body.appendParagraph('');

  const certification =
    body.appendParagraph(
      'Generated by BVBOS on ' +
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        'MM/dd/yyyy h:mm a'
      ) +
      (
        generatedBy
          ? (
              ' for ' +
              generatedBy
            )
          : ''
      ) +
      '.'
    );

  certification
    .editAsText()
    .setFontSize(9)
    .setForegroundColor(
      '#666666'
    );

  body.appendParagraph('');
  body.appendParagraph(
    'Brewer Signature: ______________________________'
  );
  body.appendParagraph(
    'Review Date: __________________________________'
  );

  document.saveAndClose();

  const documentFile =
    DriveApp.getFileById(
      document.getId()
    );

  const folder =
    getBrewReportFolder_();

  const pdfBlob =
    documentFile
      .getAs(
        MimeType.PDF
      )
      .setName(
        documentName +
        '.pdf'
      );

  const pdfFile =
    folder.createFile(
      pdfBlob
    );

  documentFile.setTrashed(
    true
  );

  return {
    fileId:
      pdfFile.getId(),

    fileName:
      pdfFile.getName(),

    fileUrl:
      pdfFile.getUrl(),

    folderId:
      folder.getId(),

    folderUrl:
      folder.getUrl(),

    generatedAt:
      new Date()
  };
}


/* =========================================================
   RC8.1 BREW HISTORY DATA
   ========================================================= */

/**
 * Returns every completed brewing batch, newest first.
 */
function getCompletedBrewingHistory_() {
  return getBrewingBatches_()
    .filter(function(batch) {
      return (
        normalizeStatus_(
          batch.status
        ) === 'completed'
      );
    })
    .reverse();
}


/**
 * Returns all brew-day events for one batch, oldest first.
 */
function getBrewDayEventsForBatch_(
  batchId
) {
  if (!batchId) {
    return [];
  }

  const values =
    getSheetValues_(
      APP_CONFIG.SHEETS.BREW_DAY_EVENTS
    );

  if (values.length < 4) {
    return [];
  }

  const headerMap =
    buildHeaderMap_(
      values[2]
    );

  return nonEmptyRows_(
    values.slice(3),
    0
  )
    .filter(function(row) {
      return (
        String(
          safeValue_(
            row,
            headerMap,
            'Batch ID'
          ) || ''
        ).trim() ===
        String(batchId).trim()
      );
    })
    .map(function(row) {
      return {
        eventId:
          safeValue_(
            row,
            headerMap,
            'Event ID'
          ),

        batchId:
          safeValue_(
            row,
            headerMap,
            'Batch ID'
          ),

        eventDateTime:
          safeValue_(
            row,
            headerMap,
            'Event Date / Time'
          ),

        stage:
          safeValue_(
            row,
            headerMap,
            'Stage'
          ),

        action:
          safeValue_(
            row,
            headerMap,
            'Action'
          ),

        temperatureF:
          safeValue_(
            row,
            headerMap,
            'Temperature °F'
          ),

        volumeGal:
          safeValue_(
            row,
            headerMap,
            'Volume gal'
          ),

        gravity:
          safeValue_(
            row,
            headerMap,
            'Gravity'
          ),

        durationMin:
          safeValue_(
            row,
            headerMap,
            'Duration min'
          ),

        employee:
          safeValue_(
            row,
            headerMap,
            'Employee'
          ),

        status:
          safeValue_(
            row,
            headerMap,
            'Status'
          ),

        notes:
          safeValue_(
            row,
            headerMap,
            'Notes'
          )
      };
    });
}


/**
 * Returns the Cellar Handoff associated with one batch.
 */
function getCellarHandoffForBatch_(
  batchId
) {
  const spreadsheet =
    getDatabase_();

  const sheet =
    spreadsheet.getSheetByName(
      'Cellar Handoffs'
    );

  if (!sheet) {
    return null;
  }

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  if (values.length < 4) {
    return null;
  }

  const headerMap =
    buildHeaderMap_(
      values[2]
    );

  const rows =
    nonEmptyRows_(
      values.slice(3),
      0
    );

  const row =
    rows
      .filter(function(item) {
        return (
          String(
            safeValue_(
              item,
              headerMap,
              'Batch ID'
            ) || ''
          ).trim() ===
          String(batchId).trim()
        );
      })
      .slice(-1)[0];

  if (!row) {
    return null;
  }

  return {
    handoffId:
      safeValue_(
        row,
        headerMap,
        'Handoff ID'
      ),

    batchId:
      safeValue_(
        row,
        headerMap,
        'Batch ID'
      ),

    batchNumber:
      safeValue_(
        row,
        headerMap,
        'Batch Number'
      ),

    product:
      safeValue_(
        row,
        headerMap,
        'Product'
      ),

    handoffDateTime:
      safeValue_(
        row,
        headerMap,
        'Handoff Date / Time'
      ),

    fermenter:
      safeValue_(
        row,
        headerMap,
        'Fermenter'
      ),

    finalVolumeGal:
      safeValue_(
        row,
        headerMap,
        'Final Volume gal'
      ),

    originalGravity:
      safeValue_(
        row,
        headerMap,
        'Original Gravity'
      ),

    knockoutTemperatureF:
      safeValue_(
        row,
        headerMap,
        'Knockout Temperature °F'
      ),

    estimatedLossGal:
      safeValue_(
        row,
        headerMap,
        'Estimated Loss gal'
      ),

    brewer:
      safeValue_(
        row,
        headerMap,
        'Brewer'
      ),

    handoffConfirmed:
      safeValue_(
        row,
        headerMap,
        'Cellar Handoff Confirmed'
      ),

    finalNotes:
      safeValue_(
        row,
        headerMap,
        'Final Notes'
      ),

    status:
      safeValue_(
        row,
        headerMap,
        'Status'
      )
  };
}


/**
 * Returns the current active brewing batch.
 */
function getActiveBrewingBatch_() {
  const batches =
    getBrewingBatches_();

  const active =
    batches
      .filter(function(batch) {
        const status =
          normalizeStatus_(
            batch.status
          );

        return (
          status === 'in progress' ||
          status === 'active'
        );
      })
      .reverse();

  return active.length
    ? active[0]
    : null;
}


/**
 * Returns recent brew-day events.
 */
function getRecentBrewDayEvents_(
  limit
) {
  const values = getSheetValues_(
    APP_CONFIG.SHEETS.BREW_DAY_EVENTS
  );

  if (values.length < 4) {
    return [];
  }

  const headerMap =
    buildHeaderMap_(values[2]);

  const rows =
    nonEmptyRows_(
      values.slice(3),
      0
    );

  const maxRows =
    Number(limit) ||
    APP_CONFIG.LIMITS
      .RECENT_BREW_EVENTS;

  return rows
    .slice(-maxRows)
    .reverse()
    .map(function(row) {
      return {
        eventId: safeValue_(
          row,
          headerMap,
          'Event ID'
        ),

        batchId: safeValue_(
          row,
          headerMap,
          'Batch ID'
        ),

        eventDateTime: safeValue_(
          row,
          headerMap,
          'Event Date / Time'
        ),

        stage: safeValue_(
          row,
          headerMap,
          'Stage'
        ),

        action: safeValue_(
          row,
          headerMap,
          'Action'
        ),

        temperatureF: safeValue_(
          row,
          headerMap,
          'Temperature °F'
        ),

        volumeGal: safeValue_(
          row,
          headerMap,
          'Volume gal'
        ),

        gravity: safeValue_(
          row,
          headerMap,
          'Gravity'
        ),

        durationMin: safeValue_(
          row,
          headerMap,
          'Duration min'
        ),

        employee: safeValue_(
          row,
          headerMap,
          'Employee'
        ),

        status: safeValue_(
          row,
          headerMap,
          'Status'
        ),

        notes: safeValue_(
          row,
          headerMap,
          'Notes'
        )
      };
    });
}


/**
 * Returns data for the Brewing screen.
 */
function getBrewingDashboard() {
  const batches =
    getBrewingBatches_();

  const activeBatch =
    getActiveBrewingBatch_();

  const completed =
    batches
      .filter(function(batch) {
        return (
          normalizeStatus_(
            batch.status
          ) === 'completed'
        );
      })
      .slice(-10)
      .reverse();

  const planned =
    batches
      .filter(function(batch) {
        return (
          normalizeStatus_(
            batch.status
          ) === 'planned'
        );
      })
      .slice(0, 10);

  return {
    stages:
      APP_CONFIG.BREWING.STAGES,

    activeBatch: activeBatch,

    plannedBatches: planned,

    completedBatches: completed,

    recentEvents:
      getRecentBrewDayEvents_(
        APP_CONFIG.LIMITS
          .RECENT_BREW_EVENTS
      ),

    summary: {
      totalBatches:
        batches.length,

      activeBatches:
        activeBatch ? 1 : 0,

      plannedBatches:
        planned.length,

      completedBatches:
        completed.length
    }
  };
}


/**
 * Starts the newest planned batch for acceptance testing.
 * This changes real database data.
 */
function testStartNewestPlannedBrew() {
  const dashboard =
    getBrewingDashboard();

  if (!dashboard.plannedBatches.length) {
    throw new Error(
      'No planned batch is available to start.'
    );
  }

  const plannedBatch =
    dashboard.plannedBatches[
      dashboard.plannedBatches.length - 1
    ];

  const result =
    startBrewingBatch(
      plannedBatch.batchId,
      'Felipe Ornelas',
      'Start Brew workflow test.'
    );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  return result;
}



/* =========================================================
   BREW CLOSEOUT & CELLAR HANDOFF
   ========================================================= */

function getCellarHandoffSheetName_() {
  return 'Cellar Handoffs';
}


function ensureCellarHandoffSheet_() {
  const spreadsheet =
    getDatabase_();

  const sheetName =
    getCellarHandoffSheetName_();

  let sheet =
    spreadsheet.getSheetByName(
      sheetName
    );

  if (sheet) {
    return sheet;
  }

  sheet =
    spreadsheet.insertSheet(
      sheetName
    );

  sheet
    .getRange('A1:N1')
    .merge()
    .setValue(
      'BVBOS CELLAR HANDOFFS'
    );

  sheet
    .getRange(
      3,
      1,
      1,
      14
    )
    .setValues([[
      'Handoff ID',
      'Batch ID',
      'Batch Number',
      'Product',
      'Handoff Date / Time',
      'Fermenter',
      'Final Volume gal',
      'Original Gravity',
      'Knockout Temperature °F',
      'Estimated Loss gal',
      'Brewer',
      'Cellar Handoff Confirmed',
      'Final Notes',
      'Status'
    ]]);

  sheet.setFrozenRows(3);

  return sheet;
}


function createCellarHandoffRecord_(
  handoffData
) {
  const sheet =
    ensureCellarHandoffSheet_();

  const handoffId =
    createBvbosId_('CLH');

  const handoffDateTime =
    new Date();

  sheet.appendRow([
    handoffId,
    handoffData.batchId || '',
    handoffData.batchNumber || '',
    handoffData.product || '',
    handoffDateTime,
    handoffData.fermenter || '',
    handoffData.finalVolumeGal || '',
    handoffData.originalGravity || '',
    handoffData.knockoutTemperatureF || '',
    handoffData.estimatedLossGal || '',
    handoffData.employee || '',
    handoffData.cellarHandoffConfirmed
      ? 'Yes'
      : 'No',
    handoffData.finalNotes || '',
    'Transferred to Cellar'
  ]);

  return {
    handoffId:
      handoffId,

    handoffDateTime:
      handoffDateTime
  };
}


/**
 * Completes the active brew and creates its Cellar Handoff record.
 */
function completeBrewingBatchCloseout(
  batchId,
  closeoutData
) {
  closeoutData =
    closeoutData || {};

  if (!batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  const sheet =
    getSheet_(
      APP_CONFIG.SHEETS.BREWING_BATCHES
    );

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  if (values.length < 4) {
    throw new Error(
      'No brewing batches were found.'
    );
  }

  const headerMap =
    buildHeaderMap_(
      values[2]
    );

  const rows =
    values.slice(3);

  let matchedRow = 0;
  let batchNumber = '';
  let product = '';
  let currentStage = '';
  let currentStatus = '';

  rows.some(function(row, index) {
    const currentBatchId =
      safeValue_(
        row,
        headerMap,
        'Batch ID'
      );

    if (currentBatchId !== batchId) {
      return false;
    }

    matchedRow =
      APP_CONFIG.HEADERS.DATA_ROW +
      index;

    batchNumber =
      safeValue_(
        row,
        headerMap,
        'Batch Number'
      );

    product =
      safeValue_(
        row,
        headerMap,
        'Product'
      );

    currentStage =
      safeValue_(
        row,
        headerMap,
        'Current Stage'
      );

    currentStatus =
      safeValue_(
        row,
        headerMap,
        'Status'
      );

    return true;
  });

  if (!matchedRow) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  if (currentStage !== 'Brew Complete') {
    throw new Error(
      'The batch must be at Brew Complete before closeout.'
    );
  }

  const normalizedStatus =
    String(currentStatus || '')
      .trim()
      .toLowerCase();

  if (
    normalizedStatus !== 'active' &&
    normalizedStatus !== 'in progress'
  ) {
    throw new Error(
      'Only an active brewing batch can be closed out.'
    );
  }

  const handoff =
    createCellarHandoffRecord_({
      batchId:
        batchId,

      batchNumber:
        batchNumber,

      product:
        product,

      fermenter:
        closeoutData.fermenter,

      finalVolumeGal:
        closeoutData.finalVolumeGal,

      originalGravity:
        closeoutData.originalGravity,

      knockoutTemperatureF:
        closeoutData.knockoutTemperatureF,

      estimatedLossGal:
        closeoutData.estimatedLossGal,

      employee:
        closeoutData.employee,

      cellarHandoffConfirmed:
        closeoutData.cellarHandoffConfirmed,

      finalNotes:
        closeoutData.finalNotes
    });

  const statusColumn =
    headerMap['Status'] + 1;

  const completedColumn =
    headerMap['Completed Date / Time'] + 1;

  const fermenterColumn =
    headerMap['Fermenter'] + 1;

  const gravityColumn =
    headerMap['Original Gravity'] + 1;

  const finalNotesColumn =
    headerMap['Final Notes'] + 1;

  const completedAt =
    new Date();

  sheet
    .getRange(
      matchedRow,
      statusColumn
    )
    .setValue(
      'Completed'
    );

  sheet
    .getRange(
      matchedRow,
      completedColumn
    )
    .setValue(
      completedAt
    );

  sheet
    .getRange(
      matchedRow,
      fermenterColumn
    )
    .setValue(
      closeoutData.fermenter
    );

  sheet
    .getRange(
      matchedRow,
      gravityColumn
    )
    .setValue(
      closeoutData.originalGravity
    );

  sheet
    .getRange(
      matchedRow,
      finalNotesColumn
    )
    .setValue(
      closeoutData.finalNotes || ''
    );

  logBrewDayEvent({
    batchId:
      batchId,

    stage:
      'Brew Complete',

    action:
      'Brew Completed',

    temperatureF:
      closeoutData.knockoutTemperatureF || '',

    volumeGal:
      closeoutData.finalVolumeGal || '',

    gravity:
      closeoutData.originalGravity || '',

    employee:
      closeoutData.employee || '',

    status:
      'Completed',

    notes:
      'Cellar handoff ' +
      handoff.handoffId +
      ' confirmed for ' +
      closeoutData.fermenter +
      '. Estimated loss: ' +
      (
        closeoutData.estimatedLossGal || 0
      ) +
      ' gal. ' +
      (
        closeoutData.finalNotes || ''
      ),

    createdAutomatically:
      false
  });

  logBvbosEvent({
    module:
      'Brewing',

    eventType:
      'Brew Completed',

    title:
      'Batch ' +
      batchNumber +
      ' completed — ' +
      product,

    description:
      'Transferred to ' +
      closeoutData.fermenter +
      ' with ' +
      closeoutData.finalVolumeGal +
      ' gal at OG ' +
      closeoutData.originalGravity +
      '.',

    batchId:
      batchId,

    product:
      product,

    employee:
      closeoutData.employee || '',

    status:
      'Completed',

    sourceRecordId:
      handoff.handoffId,

    createdAutomatically:
      false
  });

  return {
    success:
      true,

    batchId:
      batchId,

    batchNumber:
      batchNumber,

    product:
      product,

    status:
      'Completed',

    currentStage:
      'Brew Complete',

    completedAt:
      completedAt,

    handoffId:
      handoff.handoffId,

    fermenter:
      closeoutData.fermenter,

    finalVolumeGal:
      closeoutData.finalVolumeGal
  };
}


/* =========================================================
   BREWING ADMIN TOOLS
   ========================================================= */

/**
 * Moves an active batch backward by exactly one configured stage.
 * A reason is required and the correction is written to the event log.
 */
function moveBrewingBatchToPreviousStage(
  batchId,
  employee,
  reason
) {
  if (!batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  if (!reason || !String(reason).trim()) {
    throw new Error(
      'An admin correction reason is required.'
    );
  }

  const sheet =
    getSheet_(
      APP_CONFIG.SHEETS.BREWING_BATCHES
    );

  const values =
    sheet
      .getDataRange()
      .getDisplayValues();

  if (values.length < 4) {
    throw new Error(
      'No brewing batches were found.'
    );
  }

  const headerMap =
    buildHeaderMap_(
      values[2]
    );

  const rows =
    values.slice(3);

  let matchedRow = 0;
  let batchNumber = '';
  let product = '';
  let currentStage = '';
  let currentStatus = '';

  rows.some(function(row, index) {
    const currentBatchId =
      safeValue_(
        row,
        headerMap,
        'Batch ID'
      );

    if (currentBatchId !== batchId) {
      return false;
    }

    matchedRow =
      APP_CONFIG.HEADERS.DATA_ROW +
      index;

    batchNumber =
      safeValue_(
        row,
        headerMap,
        'Batch Number'
      );

    product =
      safeValue_(
        row,
        headerMap,
        'Product'
      );

    currentStage =
      safeValue_(
        row,
        headerMap,
        'Current Stage'
      );

    currentStatus =
      safeValue_(
        row,
        headerMap,
        'Status'
      );

    return true;
  });

  if (!matchedRow) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  const normalizedStatus =
    String(currentStatus || '')
      .trim()
      .toLowerCase();

  if (
    normalizedStatus !== 'active' &&
    normalizedStatus !== 'in progress'
  ) {
    throw new Error(
      'Only an active brewing batch can be moved to a previous stage.'
    );
  }

  const stages =
    APP_CONFIG.BREWING.STAGES;

  const currentIndex =
    stages.indexOf(
      currentStage
    );

  if (currentIndex <= 0) {
    throw new Error(
      'The batch is already at the first brewing stage.'
    );
  }

  const previousStage =
    stages[currentIndex - 1];

  const stageColumn =
    headerMap['Current Stage'] + 1;

  const statusColumn =
    headerMap['Status'] + 1;

  const completedColumn =
    headerMap['Completed Date / Time'] + 1;

  sheet
    .getRange(
      matchedRow,
      stageColumn
    )
    .setValue(
      previousStage
    );

  sheet
    .getRange(
      matchedRow,
      statusColumn
    )
    .setValue(
      previousStage === 'Planned'
        ? 'Planned'
        : 'In Progress'
    );

  if (
    completedColumn > 0
  ) {
    sheet
      .getRange(
        matchedRow,
        completedColumn
      )
      .clearContent();
  }

  logBrewDayEvent({
    batchId:
      batchId,

    stage:
      previousStage,

    action:
      'Stage Reverted',

    employee:
      employee || '',

    status:
      'In Progress',

    notes:
      'Admin correction: ' +
      currentStage +
      ' → ' +
      previousStage +
      '. Reason: ' +
      String(reason).trim(),

    createdAutomatically:
      false
  });

  return {
    success:
      true,

    batchId:
      batchId,

    batchNumber:
      batchNumber,

    product:
      product,

    previousStage:
      currentStage,

    currentStage:
      previousStage,

    status:
      previousStage === 'Planned'
        ? 'Planned'
        : 'In Progress'
  };
}


/**
 * Restarts the current stage without changing the batch stage.
 * The restart invalidates prior completion for the current stage.
 */
function restartBrewingBatchStage(
  batchId,
  employee,
  reason
) {
  if (!batchId) {
    throw new Error(
      'Batch ID is required.'
    );
  }

  if (!reason || !String(reason).trim()) {
    throw new Error(
      'An admin restart reason is required.'
    );
  }

  const batches =
    getBrewingBatches_();

  const batch =
    batches.find(function(item) {
      return item.batchId === batchId;
    });

  if (!batch) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  const normalizedStatus =
    String(batch.status || '')
      .trim()
      .toLowerCase();

  if (
    normalizedStatus !== 'active' &&
    normalizedStatus !== 'in progress'
  ) {
    throw new Error(
      'Only an active brewing batch can restart its current stage.'
    );
  }

  logBrewDayEvent({
    batchId:
      batch.batchId,

    stage:
      batch.currentStage,

    action:
      'Stage Restarted',

    employee:
      employee || '',

    status:
      'In Progress',

    notes:
      'Admin restart. Reason: ' +
      String(reason).trim(),

    createdAutomatically:
      false
  });

  return {
    success:
      true,

    batchId:
      batch.batchId,

    batchNumber:
      batch.batchNumber,

    product:
      batch.product,

    currentStage:
      batch.currentStage,

    status:
      'In Progress'
  };
}


/**
 * Phase 2 Brewing Module acceptance test.
 *
 * Creates one test batch and advances it
 * to Water Preparation.
 */
function testBrewingModule() {
  const testNumber =
    'TEST-' +
    Utilities.formatDate(
      new Date(),
      APP_CONFIG.TIME_ZONE,
      'MMdd-HHmm'
    );

  const batch =
    createBrewingBatch({
      batchNumber: testNumber,
      product:
        'BVBOS Test Batch',
      brewer:
        'Felipe Ornelas',
      plannedVolumeBbl: 8,
      status: 'Planned',
      currentStage: 'Planned'
    });

  const advancement =
    advanceBrewingStage(
      batch.batchId,
      'Water Preparation',
      'Felipe Ornelas',
      'Phase 2 Brewing Module test.'
    );

  const dashboard =
    getBrewingDashboard();

  console.log(
    JSON.stringify(
      {
        batch: batch,
        advancement: advancement,
        dashboard: dashboard
      },
      null,
      2
    )
  );

  return {
    batch: batch,
    advancement: advancement,
    dashboard: dashboard
  };
}
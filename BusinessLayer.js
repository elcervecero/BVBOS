/**
 * BVBOS BUSINESS LAYER
 *
 * Centralizes brewery rules and validation between:
 *
 * Browser / Dashboard
 *        ↓
 * Business Layer
 *        ↓
 * Brewing, Cellar, Kegs, CIP, Inventory
 *        ↓
 * Database
 */

const BVBOS_RULES = Object.freeze({
  BREWING: Object.freeze({
    ACTIVE_STATUSES: Object.freeze([
      'Active',
      'In Progress'
    ]),

    COMPLETE_STATUSES: Object.freeze([
      'Completed'
    ]),

    ALLOWED_STATUSES: Object.freeze([
      'Planned',
      'Active',
      'In Progress',
      'On Hold',
      'Completed',
      'Cancelled'
    ]),

    STAGES: APP_CONFIG.BREWING.STAGES
  }),

  CIP: Object.freeze({
    RESULTS: Object.freeze([
      'Pass',
      'Pending',
      'Needs Recleaning'
    ])
  }),

  KEGS: Object.freeze({
    STATUSES: Object.freeze([
      'Clean',
      'Dirty',
      'Filled',
      'Delivered',
      'On Tap',
      'In Limbo',
      'Maintenance'
    ])
  }),

  ALERTS: Object.freeze({
    SEVERITIES: Object.freeze([
      'Info',
      'Warning',
      'Critical'
    ]),

    OPEN_STATUSES: Object.freeze([
      'Open',
      'Assigned',
      'In Progress'
    ]),

    CLOSED_STATUSES: Object.freeze([
      'Resolved',
      'Closed'
    ])
  })
});


function getBusinessRules_() {
  return BVBOS_RULES;
}


function requireBusinessValue_(value, fieldName) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    throw new Error(
      fieldName + ' is required.'
    );
  }

  return value;
}


function validateBusinessOption_(
  value,
  allowedValues,
  fieldName
) {
  requireBusinessValue_(
    value,
    fieldName
  );

  if (allowedValues.indexOf(value) === -1) {
    throw new Error(
      'Invalid ' +
      fieldName +
      ': ' +
      value +
      '. Allowed values: ' +
      allowedValues.join(', ')
    );
  }

  return value;
}


function businessNumber_(
  value,
  fieldName,
  options
) {
  options = options || {};

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    if (options.required) {
      throw new Error(
        fieldName + ' is required.'
      );
    }

    return null;
  }

  const numberValue = Number(value);

  if (isNaN(numberValue)) {
    throw new Error(
      fieldName +
      ' must be a valid number.'
    );
  }

  if (
    options.minimum !== undefined &&
    numberValue < options.minimum
  ) {
    throw new Error(
      fieldName +
      ' must be at least ' +
      options.minimum +
      '.'
    );
  }

  if (
    options.maximum !== undefined &&
    numberValue > options.maximum
  ) {
    throw new Error(
      fieldName +
      ' must not exceed ' +
      options.maximum +
      '.'
    );
  }

  return numberValue;
}


function businessDate_(
  value,
  fieldName,
  options
) {
  options = options || {};

  if (!value) {
    if (options.required) {
      throw new Error(
        fieldName + ' is required.'
      );
    }

    return null;
  }

  if (
    Object.prototype.toString.call(value) ===
      '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return value;
  }

  const dateValue = new Date(value);

  if (isNaN(dateValue.getTime())) {
    throw new Error(
      fieldName +
      ' must be a valid date.'
    );
  }

  return dateValue;
}


function businessText_(
  value,
  maximumLength
) {
  const text =
    String(value || '').trim();

  if (
    maximumLength &&
    text.length > maximumLength
  ) {
    throw new Error(
      'Text cannot exceed ' +
      maximumLength +
      ' characters.'
    );
  }

  return text;
}


/* =========================================================
   BREWING BUSINESS RULES
   ========================================================= */

function validateBrewingBatch_(batchData) {
  batchData = batchData || {};

  const batchNumber =
    businessText_(
      requireBusinessValue_(
        batchData.batchNumber,
        'Batch Number'
      ),
      50
    );

  const product =
    businessText_(
      requireBusinessValue_(
        batchData.product,
        'Product'
      ),
      150
    );

  const status =
    batchData.status ||
    'Planned';

  validateBusinessOption_(
    status,
    BVBOS_RULES.BREWING.ALLOWED_STATUSES,
    'Batch Status'
  );

  const currentStage =
    batchData.currentStage ||
    'Planned';

  validateBusinessOption_(
    currentStage,
    BVBOS_RULES.BREWING.STAGES,
    'Brewing Stage'
  );

  return {
    batchId:
      businessText_(
        batchData.batchId,
        100
      ),

    batchNumber:
      batchNumber,

    brewDate:
      businessDate_(
        batchData.brewDate ||
          new Date(),
        'Brew Date',
        {
          required: true
        }
      ),

    product:
      product,

    recipeId:
      businessText_(
        batchData.recipeId,
        100
      ),

    brewer:
      businessText_(
        batchData.brewer,
        150
      ),

    plannedVolumeBbl:
      businessNumber_(
        batchData.plannedVolumeBbl,
        'Planned Volume BBL',
        {
          minimum: 0
        }
      ),

    actualKettleVolumeBbl:
      businessNumber_(
        batchData.actualKettleVolumeBbl,
        'Actual Kettle Volume BBL',
        {
          minimum: 0
        }
      ),

    fermenter:
      businessText_(
        batchData.fermenter,
        100
      ),

    status:
      status,

    currentStage:
      currentStage,

    startDateTime:
      businessDate_(
        batchData.startDateTime,
        'Start Date / Time'
      ),

    completedDateTime:
      businessDate_(
        batchData.completedDateTime,
        'Completed Date / Time'
      ),

    originalGravity:
      businessNumber_(
        batchData.originalGravity,
        'Original Gravity',
        {
          minimum: 0,
          maximum: 2
        }
      ),

    finalNotes:
      businessText_(
        batchData.finalNotes,
        5000
      )
  };
}


function getNextBrewingStage_(currentStage) {
  const stages =
    BVBOS_RULES.BREWING.STAGES;

  const index =
    stages.indexOf(currentStage);

  if (index === -1) {
    throw new Error(
      'Unknown brewing stage: ' +
      currentStage
    );
  }

  if (index === stages.length - 1) {
    return null;
  }

  return stages[index + 1];
}


function validateBrewingStageTransition_(
  currentStage,
  newStage,
  allowBackward
) {
  validateBusinessOption_(
    currentStage,
    BVBOS_RULES.BREWING.STAGES,
    'Current Brewing Stage'
  );

  validateBusinessOption_(
    newStage,
    BVBOS_RULES.BREWING.STAGES,
    'New Brewing Stage'
  );

  const currentIndex =
    BVBOS_RULES.BREWING.STAGES.indexOf(
      currentStage
    );

  const newIndex =
    BVBOS_RULES.BREWING.STAGES.indexOf(
      newStage
    );

  if (
    !allowBackward &&
    newIndex < currentIndex
  ) {
    throw new Error(
      'A brewing batch cannot move backward from ' +
      currentStage +
      ' to ' +
      newStage +
      ' without an authorized correction.'
    );
  }

  return true;
}


function getBatchStatusForStage_(stage) {
  validateBusinessOption_(
    stage,
    BVBOS_RULES.BREWING.STAGES,
    'Brewing Stage'
  );

  if (stage === 'Planned') {
    return 'Planned';
  }

  if (stage === 'Brew Complete') {
    return 'Completed';
  }

  return 'In Progress';
}


function calculateBrewingProgress_(stage) {
  validateBusinessOption_(
    stage,
    BVBOS_RULES.BREWING.STAGES,
    'Brewing Stage'
  );

  const stages =
    BVBOS_RULES.BREWING.STAGES;

  const index =
    stages.indexOf(stage);

  if (stages.length <= 1) {
    return 100;
  }

  return Math.round(
    (
      index /
      (stages.length - 1)
    ) * 100
  );
}



/**
 * Returns explicit browser permissions for one brewing batch.
 */

/**
 * Returns true when a Stage Readings Saved event exists
 * for this batch and brewing stage.
 */
function normalizeBrewingText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


/**
 * Returns the authoritative reading-completion state for one batch stage.
 *
 * New audit marker:
 *   Stage Readings Saved
 *
 * Legacy markers are also recognized so existing brew records continue
 * to work after the RC7 cleanup.
 */
function getBrewingStageReadingState_(
  batchId,
  stage
) {
  if (!batchId || !stage) {
    return {
      completed: false,
      eventId: null,
      action: null,
      status: null,
      rowNumber: null
    };
  }

  const values =
    getSheetValues_(
      APP_CONFIG.SHEETS.BREW_DAY_EVENTS
    );

  if (values.length < 4) {
    return {
      completed: false,
      eventId: null,
      action: null,
      status: null,
      rowNumber: null
    };
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

  const normalizedBatchId =
    String(batchId).trim();

  const normalizedStage =
    normalizeBrewingText_(stage);

  for (
    let index = rows.length - 1;
    index >= 0;
    index--
  ) {
    const row =
      rows[index];

    const eventBatchId =
      String(
        safeValue_(
          row,
          headerMap,
          "Batch ID"
        ) || ""
      ).trim();

    const eventStage =
      normalizeBrewingText_(
        safeValue_(
          row,
          headerMap,
          "Stage"
        )
      );

    if (
      eventBatchId !== normalizedBatchId ||
      eventStage !== normalizedStage
    ) {
      continue;
    }

    const action =
      String(
        safeValue_(
          row,
          headerMap,
          "Action"
        ) || ""
      ).trim();

    const normalizedAction =
      normalizeBrewingText_(action);

    const status =
      String(
        safeValue_(
          row,
          headerMap,
          "Status"
        ) || ""
      ).trim();

    const normalizedStatus =
      normalizeBrewingText_(status);

    const eventId =
      safeValue_(
        row,
        headerMap,
        "Event ID"
      );

    const rowNumber =
      APP_CONFIG.HEADERS.DATA_ROW +
      index;

    if (
      normalizedAction === "stage restarted" ||
      normalizedAction === "stage reverted"
    ) {
      return {
        completed: false,
        eventId: eventId || null,
        action: action,
        status: status,
        rowNumber: rowNumber
      };
    }

    const isCurrentMarker =
      normalizedAction ===
      "stage readings saved";

    const isLegacyMarker =
      normalizedAction.endsWith(
        "readings saved"
      ) ||
      normalizedAction.endsWith(
        "readings saved successfully"
      );

    if (
      isCurrentMarker ||
      isLegacyMarker
    ) {
      return {
        completed:
          normalizedStatus ===
          "completed",

        eventId:
          eventId || null,

        action:
          action,

        status:
          status,

        rowNumber:
          rowNumber
      };
    }
  }

  return {
    completed: false,
    eventId: null,
    action: null,
    status: null,
    rowNumber: null
  };
}


function hasCompletedStageReadings_(
  batchId,
  stage
) {
  return getBrewingStageReadingState_(
    batchId,
    stage
  ).completed;
}


function buildBrewingBatchPermissions_(
  batch
) {
  if (!batch) {
    return {
      canStart: false,
      canSaveReadings: false,
      canAdvance: false,
      canComplete: false,
      canCloseout: false,
      canRevert: false,
      canRestart: false,
      stageCompleted: false
    };
  }

  const normalizedStatus =
    normalizeBrewingText_(
      batch.status
    );

  const currentStage =
    String(
      batch.currentStage || ""
    ).trim();

  const isPlanned =
    normalizedStatus ===
    "planned";

  const isActive =
    normalizedStatus ===
      "active" ||
    normalizedStatus ===
      "in progress";

  const stageState =
    isActive
      ? getBrewingStageReadingState_(
          batch.batchId,
          currentStage
        )
      : {
          completed: false
        };

  const stageCompleted =
    stageState.completed === true;

  const stageIndex =
    BVBOS_RULES.BREWING.STAGES
      .indexOf(
        currentStage
      );

  const hasNextStage =
    stageIndex >= 0 &&
    stageIndex <
      (
        BVBOS_RULES.BREWING.STAGES
          .length - 1
      );

  const isCloseoutStage =
    currentStage ===
    "Brew Complete";

  return {
    canStart:
      isPlanned &&
      currentStage ===
      "Planned",

    canSaveReadings:
      isActive,

    canAdvance:
      isActive &&
      !isCloseoutStage &&
      hasNextStage &&
      stageCompleted,

    canComplete:
      isActive &&
      !isCloseoutStage &&
      stageCompleted,

    canCloseout:
      isActive &&
      isCloseoutStage &&
      stageCompleted,

    canRevert:
      isActive &&
      stageIndex > 0,

    canRestart:
      isActive,

    stageCompleted:
      stageCompleted,

    stageReadingEventId:
      stageState.eventId || null
  };
}


/**
 * Adds explicit UI permissions to any brewing batch.
 */
function buildBrewingBatchView_(batch) {
  if (!batch) {
    return null;
  }

  const permissions =
    buildBrewingBatchPermissions_(
      batch
    );

  return Object.assign(
    {},
    batch,
    permissions
  );
}


function buildActiveBatchView_(batch) {
  if (!batch) {
    return null;
  }

  const permissions =
    buildBrewingBatchPermissions_(
      batch
    );

  return {
    batchId:
      batch.batchId,

    batchNumber:
      batch.batchNumber,

    product:
      batch.product,

    brewer:
      batch.brewer,

    fermenter:
      batch.fermenter,

    status:
      batch.status,

    currentStage:
      batch.currentStage,

    nextStage:
      getNextBrewingStage_(
        batch.currentStage
      ),

    progressPercent:
      calculateBrewingProgress_(
        batch.currentStage
      ),

    brewDate:
      batch.brewDate,

    plannedVolumeBbl:
      batch.plannedVolumeBbl,

    actualKettleVolumeBbl:
      batch.actualKettleVolumeBbl,

    originalGravity:
      batch.originalGravity,

    startDateTime:
      batch.startDateTime,

    canStart:
      permissions.canStart,

    canSaveReadings:
      permissions.canSaveReadings,

    canAdvance:
      permissions.canAdvance,

    canComplete:
      permissions.canComplete,

    canCloseout:
      permissions.canCloseout,

    closeoutRequired:
      batch.currentStage ===
        'Brew Complete',

    workflowReadyToArchive:
      permissions.canCloseout,

    workflowStatus:
      (
        batch.currentStage ===
        'Brew Complete'
      )
        ? (
            permissions.canCloseout
              ? 'Ready to Complete Workflow'
              : 'Save Brew Complete Readings'
          )
        : 'Brewing In Progress',

    stageCompleted:
      permissions.stageCompleted,

    stageCompletionLabel:
      permissions.stageCompleted
        ? 'Readings Saved'
        : 'Readings Required',

    previousStage:
      (
        BVBOS_RULES.BREWING.STAGES.indexOf(
          batch.currentStage
        ) > 0
      )
        ? BVBOS_RULES.BREWING.STAGES[
            BVBOS_RULES.BREWING.STAGES.indexOf(
              batch.currentStage
            ) - 1
          ]
        : null,

    canRevert:
      (
        BVBOS_RULES.BREWING.STAGES.indexOf(
          batch.currentStage
        ) > 0
      ),

    canRestart:
      permissions.canSaveReadings
  };
}


/* =========================================================
   CIP BUSINESS RULES
   ========================================================= */

function normalizeCipResult_(result) {
  const normalized =
    businessText_(result);

  if (!normalized) {
    return 'Pending';
  }

  validateBusinessOption_(
    normalized,
    BVBOS_RULES.CIP.RESULTS,
    'CIP Result'
  );

  return normalized;
}


function cipRequiresAttention_(result) {
  return (
    normalizeCipResult_(result) ===
    'Needs Recleaning'
  );
}


/* =========================================================
   KEG BUSINESS RULES
   ========================================================= */

function normalizeKegStatus_(status) {
  const raw =
    businessText_(status);

  const aliases = {
    limbo: 'In Limbo',
    'in limbo': 'In Limbo',
    ontap: 'On Tap',
    'on tap': 'On Tap'
  };

  const normalized =
    aliases[raw.toLowerCase()] ||
    raw;

  validateBusinessOption_(
    normalized,
    BVBOS_RULES.KEGS.STATUSES,
    'Keg Status'
  );

  return normalized;
}


/* =========================================================
   ALERT BUSINESS RULES
   ========================================================= */

function validateAlert_(alertData) {
  alertData = alertData || {};

  const severity =
    alertData.severity ||
    'Warning';

  validateBusinessOption_(
    severity,
    BVBOS_RULES.ALERTS.SEVERITIES,
    'Alert Severity'
  );

  return {
    module:
      businessText_(
        requireBusinessValue_(
          alertData.module,
          'Alert Module'
        ),
        100
      ),

    severity:
      severity,

    title:
      businessText_(
        requireBusinessValue_(
          alertData.title,
          'Alert Title'
        ),
        250
      ),

    description:
      businessText_(
        alertData.description,
        5000
      ),

    relatedRecordId:
      businessText_(
        alertData.relatedRecordId,
        150
      ),

    asset:
      businessText_(
        alertData.asset ||
          alertData.equipment,
        150
      ),

    assignedTo:
      businessText_(
        alertData.assignedTo,
        150
      ),

    status:
      businessText_(
        alertData.status ||
          'Open',
        50
      ),

    dueDate:
      businessDate_(
        alertData.dueDate,
        'Alert Due Date'
      ),

    sourceSystem:
      businessText_(
        alertData.sourceSystem ||
          'BVBOS',
        100
      ),

    notes:
      businessText_(
        alertData.notes,
        5000
      )
  };
}


/* =========================================================
   BUSINESS-LAYER SERVICES
   ========================================================= */

function createBrewingBatchService(batchData) {
  const validated =
    validateBrewingBatch_(
      batchData
    );

  return createBrewingBatch(
    validated
  );
}


/**
 * Starts one planned brewing batch through the Business Layer.
 */
function startBrewingBatchService(
  batchId,
  employee,
  notes
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  return startBrewingBatch(
    batchId,
    businessText_(
      employee,
      150
    ),
    businessText_(
      notes,
      5000
    )
  );
}



/**
 * Validates and completes the Brew Closeout & Cellar Handoff.
 */
function completeBrewingBatchCloseoutService(
  batchId,
  closeoutData
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  closeoutData =
    closeoutData || {};

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
    normalizeBrewingText_(
      batch.status
    );

  const isActive =
    normalizedStatus ===
      'active' ||
    normalizedStatus ===
      'in progress';

  if (
    !isActive ||
    batch.currentStage !==
      'Brew Complete'
  ) {
    throw new Error(
      'The batch must be active at Brew Complete before closeout.'
    );
  }

  const stageState =
    getBrewingStageReadingState_(
      batch.batchId,
      batch.currentStage
    );

  if (!stageState.completed) {
    throw new Error(
      'Save the Brew Complete readings before submitting the Cellar Handoff. ' +
      'No completed reading marker was found for Batch ' +
      batch.batchNumber +
      '.'
    );
  }

  const fermenter =
    businessText_(
      requireBusinessValue_(
        closeoutData.fermenter,
        'Fermenter'
      ),
      100
    );

  const finalVolumeGal =
    businessNumber_(
      closeoutData.finalVolumeGal,
      'Final Transfer Volume gal',
      {
        required: true,
        minimum: 0
      }
    );

  const originalGravity =
    businessNumber_(
      closeoutData.originalGravity,
      'Original Gravity',
      {
        required: true,
        minimum: 0,
        maximum: 2
      }
    );

  const knockoutTemperatureF =
    businessNumber_(
      closeoutData.knockoutTemperatureF,
      'Knockout Temperature °F',
      {
        required: true,
        minimum: 0,
        maximum: 250
      }
    );

  const estimatedLossGal =
    businessNumber_(
      closeoutData.estimatedLossGal,
      'Estimated Loss gal',
      {
        required: false,
        minimum: 0
      }
    );

  if (
    closeoutData.cellarHandoffConfirmed !== true
  ) {
    throw new Error(
      'Cellar Handoff must be confirmed before completing the brew.'
    );
  }

  return completeBrewingBatchCloseout(
    batchId,
    {
      fermenter:
        fermenter,

      finalVolumeGal:
        finalVolumeGal,

      originalGravity:
        originalGravity,

      knockoutTemperatureF:
        knockoutTemperatureF,

      estimatedLossGal:
        estimatedLossGal,

      employee:
        businessText_(
          closeoutData.employee,
          150
        ),

      cellarHandoffConfirmed:
        true,

      finalNotes:
        businessText_(
          closeoutData.finalNotes,
          5000
        )
    }
  );
}


/**
 * Browser service: move the active batch backward one stage.
 */
function moveBrewingBatchToPreviousStageService(
  batchId,
  employee,
  reason
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  requireBusinessValue_(
    reason,
    'Admin Correction Reason'
  );

  return moveBrewingBatchToPreviousStage(
    batchId,
    businessText_(
      employee,
      150
    ),
    businessText_(
      reason,
      1000
    )
  );
}


/**
 * Browser service: restart the active batch's current stage.
 */
function restartBrewingBatchStageService(
  batchId,
  employee,
  reason
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  requireBusinessValue_(
    reason,
    'Admin Restart Reason'
  );

  return restartBrewingBatchStage(
    batchId,
    businessText_(
      employee,
      150
    ),
    businessText_(
      reason,
      1000
    )
  );
}


function advanceBrewingStageService(
  batchId,
  newStage,
  employee,
  notes
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

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

  validateBrewingStageTransition_(
    batch.currentStage,
    newStage,
    false
  );

  if (
    !hasCompletedStageReadings_(
      batch.batchId,
      batch.currentStage
    )
  ) {
    throw new Error(
      'Save the required ' +
      batch.currentStage +
      ' readings before advancing the brew stage.'
    );
  }

  return advanceBrewingStage(
    batchId,
    newStage,
    businessText_(
      employee,
      150
    ),
    businessText_(
      notes,
      5000
    )
  );
}






/* =========================================================
   RC8.2 BREW RECORD PDF SERVICE
   ========================================================= */

function generateBrewingRecordPdfService(
  batchId,
  generatedBy
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  const record =
    getBrewingHistoryRecordService(
      batchId
    );

  if (
    !record ||
    !record.batch
  ) {
    throw new Error(
      'The completed brew record could not be loaded.'
    );
  }

  const result =
    createBrewingRecordPdf_(
      record.batch,
      record.handoff,
      record.events || [],
      businessText_(
        generatedBy,
        150
      )
    );

  logBvbosEvent({
    module:
      'Brewing',

    eventType:
      'Brew Report Generated',

    title:
      'Brew report generated for Batch ' +
      record.batch.batchNumber,

    description:
      result.fileName,

    batchId:
      record.batch.batchId,

    product:
      record.batch.product,

    employee:
      businessText_(
        generatedBy,
        150
      ),

    status:
      'Completed',

    sourceRecordId:
      result.fileId,

    createdAutomatically:
      false
  });

  return {
    success:
      true,

    batchId:
      record.batch.batchId,

    batchNumber:
      record.batch.batchNumber,

    product:
      record.batch.product,

    fileId:
      result.fileId,

    fileName:
      result.fileName,

    fileUrl:
      result.fileUrl,

    folderId:
      result.folderId,

    folderUrl:
      result.folderUrl,

    generatedAt:
      formatDateTime_(
        result.generatedAt
      )
  };
}


/* =========================================================
   RC8.1 BREW HISTORY SERVICES
   ========================================================= */

function buildBrewingHistoryRow_(
  batch
) {
  const handoff =
    getCellarHandoffForBatch_(
      batch.batchId
    );

  return {
    batchId:
      batch.batchId,

    batchNumber:
      batch.batchNumber,

    product:
      batch.product,

    recipeId:
      batch.recipeId,

    brewDate:
      batch.brewDate,

    completedDateTime:
      batch.completedDateTime,

    brewer:
      batch.brewer,

    fermenter:
      (
        handoff &&
        handoff.fermenter
      ) ||
      batch.fermenter,

    plannedVolumeBbl:
      batch.plannedVolumeBbl,

    actualKettleVolumeBbl:
      batch.actualKettleVolumeBbl,

    originalGravity:
      (
        handoff &&
        handoff.originalGravity
      ) ||
      batch.originalGravity,

    finalVolumeGal:
      handoff
        ? handoff.finalVolumeGal
        : '',

    estimatedLossGal:
      handoff
        ? handoff.estimatedLossGal
        : '',

    status:
      batch.status,

    eventCount:
      getBrewDayEventsForBatch_(
        batch.batchId
      ).length
  };
}


function getBrewingHistoryService() {
  const history =
    getCompletedBrewingHistory_()
      .map(
        buildBrewingHistoryRow_
      );

  return {
    batches:
      history,

    summary: {
      completedBatches:
        history.length,

      totalFinalVolumeGal:
        history.reduce(
          function(total, batch) {
            return (
              total +
              (
                Number(
                  batch.finalVolumeGal
                ) || 0
              )
            );
          },
          0
        ),

      totalRecordedEvents:
        history.reduce(
          function(total, batch) {
            return (
              total +
              (
                Number(
                  batch.eventCount
                ) || 0
              )
            );
          },
          0
        )
    },

    generatedAt:
      formatDateTime_(
        new Date()
      )
  };
}


function getBrewingHistoryRecordService(
  batchId
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

  const batch =
    getBrewingBatches_()
      .find(function(item) {
        return (
          item.batchId ===
          batchId
        );
      });

  if (!batch) {
    throw new Error(
      'Batch not found: ' +
      batchId
    );
  }

  const events =
    getBrewDayEventsForBatch_(
      batchId
    );

  const handoff =
    getCellarHandoffForBatch_(
      batchId
    );

  return {
    batch:
      buildBrewingHistoryRow_(
        batch
      ),

    handoff:
      handoff,

    events:
      events,

    timeline:
      events.map(function(event) {
        return {
          eventDateTime:
            event.eventDateTime,

          stage:
            event.stage,

          action:
            event.action,

          employee:
            event.employee,

          status:
            event.status
        };
      }),

    generatedAt:
      formatDateTime_(
        new Date()
      )
  };
}


function getBrewingOperationsService() {
  const dashboard =
    getBrewingDashboard();

  const activeBatchView =
    buildActiveBatchView_(
      dashboard.activeBatch
    );

  return {
    stages:
      dashboard.stages,

    activeBatch:
      activeBatchView,

    currentStageGuide:
      buildCurrentStageGuide_(
        dashboard.activeBatch
      ),

    currentStageForm:
      buildCurrentStageForm_(
        dashboard.activeBatch
      ),

    plannedBatches:
      dashboard.plannedBatches.map(
        buildBrewingBatchView_
      ),

    completedBatches:
      dashboard.completedBatches.map(
        buildBrewingBatchView_
      ),

    brewHistory:
      getBrewingHistoryService(),

    recentEvents:
      dashboard.recentEvents,

    summary:
      dashboard.summary,

    generatedAt:
      formatDateTime_(
        new Date()
      )
  };
}


function createAlertService(alertData) {
  const validated =
    validateAlert_(
      alertData
    );

  return createBvbosAlert(
    validated
  );
}


/* =========================================================
   BREW-STAGE GUIDANCE
   ========================================================= */

function getBrewingStageRequirement_(stage) {
  validateBusinessOption_(
    stage,
    BVBOS_RULES.BREWING.STAGES,
    'Brewing Stage'
  );

  const requirements =
    APP_CONFIG.BREWING
      .STAGE_REQUIREMENTS[stage];

  if (!requirements) {
    return {
      stage: stage,
      category: 'Brewing',
      requiredFields: [],
      guidance: []
    };
  }

  return {
    stage: stage,

    category:
      requirements.category ||
      'Brewing',

    requiredFields:
      Array.isArray(
        requirements.requiredFields
      )
        ? requirements.requiredFields
        : [],

    guidance:
      getBrewingStageGuidance_(stage)
  };
}


function getBrewingStageGuidance_(stage) {
  const guidanceMap = {
    'Planned': [
      'Confirm the batch number, product and brew date.',
      'Assign the brewer and planned batch volume.',
      'Select the recipe before beginning production.'
    ],

    'Recipe Selected': [
      'Confirm the correct recipe version.',
      'Review grain, hops, yeast and brew-day additions.',
      'Confirm the target batch volume and original gravity.'
    ],

    'Water Preparation': [
      'Fill the kettle with the required brewing water.',
      'Use the HLT Heat control for initial water heating.',
      'Record water volume and target temperature.',
      'Confirm water-treatment additions before transfer.'
    ],

    'Milling': [
      'Confirm the complete grain bill.',
      'Inspect the mill gap and crush quality.',
      'Record when milling is complete.'
    ],

    'Mash In': [
      'Transfer heated water to the mash tun.',
      'Add milled grain gradually while mixing.',
      'Record the stabilized mash temperature.',
      'Confirm there are no dry pockets or dough balls.'
    ],

    'Mash Rest': [
      'Maintain the recipe target mash temperature.',
      'Record temperature and rest duration.',
      'Record mash pH when available.',
      'Document any temperature adjustment.'
    ],

    'Vorlauf': [
      'Recirculate until the wort runs acceptably clear.',
      'Confirm the grain bed remains stable.',
      'Record the vorlauf duration.'
    ],

    'Lauter / Sparge': [
      'Begin transfer from the mash tun to the kettle.',
      'Start sparge water at a controlled flow rate.',
      'Avoid exposing the grain bed.',
      'Record sparge-water volume and relevant notes.'
    ],

    'Transfer to Kettle': [
      'Confirm mash-tun transfer is complete.',
      'Record the kettle volume.',
      'Document any wort remaining in the mash tun.',
      'Confirm the kettle is ready for heating.'
    ],

    'Boil': [
      'Confirm the wort has reached a full boil.',
      'Start the boil timer.',
      'Record boil duration and scheduled additions.',
      'Monitor boil intensity and volume.'
    ],

    'Whirlpool': [
      'Complete flameout or whirlpool additions.',
      'Run the whirlpool for the planned duration.',
      'Allow the trub cone to settle before knockout.'
    ],

    'Knockout': [
      'Sanitize the receiving fermenter and transfer path.',
      'Record knockout temperature.',
      'Record original gravity.',
      'Confirm the target fermenter.'
    ],

    'Oxygenation': [
      'Confirm oxygenation equipment is sanitized.',
      'Record the oxygenation method or duration.',
      'Verify oxygenation occurs before or during yeast pitch.'
    ],

    'Yeast Pitch': [
      'Confirm the correct yeast strain and generation.',
      'Record when yeast is pitched.',
      'Document yeast quantity or source when available.'
    ],

    'Fermenter Filled': [
      'Confirm the complete knockout volume.',
      'Assign and record the fermenter.',
      'Confirm temperature control is active.',
      'Verify the tank is labeled with batch and product.'
    ],

    'Brew Complete': [
      'Review all brew-day events and readings.',
      'Record final brew-day notes.',
      'Confirm the batch has transferred into cellar operations.',
      'Close the brew-day record.'
    ]
  };

  return guidanceMap[stage] || [];
}


function buildCurrentStageGuide_(activeBatch) {
  if (!activeBatch) {
    return {
      stage: null,
      category: null,
      requiredFields: [],
      guidance: [],
      nextStage: null,
      progressPercent: 0
    };
  }

  const stageRequirement =
    getBrewingStageRequirement_(
      activeBatch.currentStage
    );

  return {
    stage:
      activeBatch.currentStage,

    category:
      stageRequirement.category,

    requiredFields:
      stageRequirement.requiredFields,

    guidance:
      stageRequirement.guidance,

    nextStage:
      getNextBrewingStage_(
        activeBatch.currentStage
      ),

    progressPercent:
      calculateBrewingProgress_(
        activeBatch.currentStage
      ),

    formFields:
      getBrewingStageFormFields_(
        activeBatch.currentStage
      )
  };
}


function getCurrentStageRequirementsService() {
  const activeBatch =
    getActiveBrewingBatch_();

  return {
    activeBatch:
      buildActiveBatchView_(
        activeBatch
      ),

    currentStageGuide:
      buildCurrentStageGuide_(
        activeBatch
      ),

    activeBatchPermissions:
      activeBatch
        ? buildBrewingBatchPermissions_(
            activeBatch
          )
        : null,

    generatedAt:
      formatDateTime_(
        new Date()
      )
  };
}



/* =========================================================
   RC3 DYNAMIC STAGE FORM CONFIGURATION
   ========================================================= */

const BVBOS_STAGE_FORMS = Object.freeze({
  'Planned': Object.freeze([
    Object.freeze({
      key: 'notes',
      label: 'Planning Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Optional planning notes'
    })
  ]),

  'Recipe Selected': Object.freeze([
    Object.freeze({
      key: 'action',
      label: 'Recipe Confirmation',
      type: 'text',
      required: true,
      placeholder: 'Example: Recipe version confirmed'
    }),
    Object.freeze({
      key: 'recipeVersion',
      label: 'Recipe Version',
      type: 'text',
      required: false,
      placeholder: 'Example: WVI Pilsner v3'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Recipe Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Grain, hops, yeast or addition notes'
    })
  ]),

  'Water Preparation': Object.freeze([
    Object.freeze({
      key: 'volumeGal',
      label: 'Prepared Water Volume gal',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 310'
    }),
    Object.freeze({
      key: 'temperatureF',
      label: 'Actual Water Temperature °F',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 168'
    }),
    Object.freeze({
      key: 'targetTemperatureF',
      label: 'Target Water Temperature °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 168'
    }),
    Object.freeze({
      key: 'waterSource',
      label: 'Water Source / Vessel',
      type: 'text',
      required: false,
      placeholder: 'Example: Kettle / holding tank'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Water Treatment Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Mineral, acid or treatment additions'
    })
  ]),

  'Milling': Object.freeze([
    Object.freeze({
      key: 'action',
      label: 'Milling Confirmation',
      type: 'text',
      required: true,
      placeholder: 'Example: Milling completed'
    }),
    Object.freeze({
      key: 'grainWeightLb',
      label: 'Total Grain Weight lb',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 550'
    }),
    Object.freeze({
      key: 'millGap',
      label: 'Mill Gap',
      type: 'text',
      required: false,
      placeholder: 'Example: 0.040 in'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Milling Duration min',
      type: 'number',
      step: '1',
      required: false,
      placeholder: 'Example: 25'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Milling Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Grain bill, crush quality or dust observations'
    })
  ]),

  'Mash In': Object.freeze([
    Object.freeze({
      key: 'strikeTemperatureF',
      label: 'Strike Water Temperature °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 168'
    }),
    Object.freeze({
      key: 'temperatureF',
      label: 'Stabilized Mash Temperature °F',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 149'
    }),
    Object.freeze({
      key: 'volumeGal',
      label: 'Mash Water Volume gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 250'
    }),
    Object.freeze({
      key: 'grainWeightLb',
      label: 'Grain Weight lb',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 550'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Mash pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 5.25'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Mash-In Duration min',
      type: 'number',
      step: '1',
      required: false,
      placeholder: 'Example: 15'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Mash-In Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Mixing, dry pockets or temperature adjustment notes'
    })
  ]),

  'Mash Rest': Object.freeze([
    Object.freeze({
      key: 'temperatureF',
      label: 'Mash Temperature °F',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 149'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Mash Rest Duration min',
      type: 'number',
      step: '1',
      required: true,
      placeholder: 'Example: 60'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Mash pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 5.25'
    }),
    Object.freeze({
      key: 'temperatureCorrectionF',
      label: 'Temperature Correction °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: +2.0'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Mash Rest Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Temperature or pH corrections'
    })
  ]),

  'Vorlauf': Object.freeze([
    Object.freeze({
      key: 'durationMin',
      label: 'Vorlauf Duration min',
      type: 'number',
      step: '1',
      required: true,
      placeholder: 'Example: 15'
    }),
    Object.freeze({
      key: 'gravity',
      label: 'First Wort Gravity',
      type: 'number',
      step: '0.001',
      required: false,
      placeholder: 'Example: 1.060'
    }),
    Object.freeze({
      key: 'clarity',
      label: 'Wort Clarity',
      type: 'text',
      required: false,
      placeholder: 'Example: Clear / slight haze'
    }),
    Object.freeze({
      key: 'flowRate',
      label: 'Recirculation Flow Rate',
      type: 'text',
      required: false,
      placeholder: 'Example: Slow / medium'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Vorlauf Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Grain-bed and runoff observations'
    })
  ]),

  'Lauter / Sparge': Object.freeze([
    Object.freeze({
      key: 'spargeTemperatureF',
      label: 'Sparge Water Temperature °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 170'
    }),
    Object.freeze({
      key: 'volumeGal',
      label: 'Sparge Water Volume gal',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 180'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Lauter / Sparge Duration min',
      type: 'number',
      step: '1',
      required: false,
      placeholder: 'Example: 75'
    }),
    Object.freeze({
      key: 'preBoilVolumeGal',
      label: 'Pre-Boil Volume gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 310'
    }),
    Object.freeze({
      key: 'gravity',
      label: 'Pre-Boil Gravity',
      type: 'number',
      step: '0.001',
      required: false,
      placeholder: 'Example: 1.040'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Pre-Boil pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 5.23'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Lauter / Sparge Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Flow rate, runoff or grain-bed notes'
    })
  ]),

  'Transfer to Kettle': Object.freeze([
    Object.freeze({
      key: 'volumeGal',
      label: 'Kettle Volume gal',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 310'
    }),
    Object.freeze({
      key: 'gravity',
      label: 'Pre-Boil Gravity',
      type: 'number',
      step: '0.001',
      required: false,
      placeholder: 'Example: 1.040'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Pre-Boil pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 5.23'
    }),
    Object.freeze({
      key: 'mashTunRemainderGal',
      label: 'Mash-Tun Remainder gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 20'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Transfer Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Transfer and grant observations'
    })
  ]),

  'Boil': Object.freeze([
    Object.freeze({
      key: 'durationMin',
      label: 'Boil Duration min',
      type: 'number',
      step: '1',
      required: true,
      placeholder: 'Example: 60'
    }),
    Object.freeze({
      key: 'startVolumeGal',
      label: 'Boil Start Volume gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 310'
    }),
    Object.freeze({
      key: 'volumeGal',
      label: 'Post-Boil Volume gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 275'
    }),
    Object.freeze({
      key: 'gravity',
      label: 'Post-Boil Gravity',
      type: 'number',
      step: '0.001',
      required: false,
      placeholder: 'Example: 1.045'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Post-Boil pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 4.90'
    }),
    Object.freeze({
      key: 'additions',
      label: 'Boil Additions',
      type: 'textarea',
      required: false,
      placeholder: 'Hop, nutrient, fining and other additions'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Boil Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Foam, element or boil observations'
    })
  ]),

  'Whirlpool': Object.freeze([
    Object.freeze({
      key: 'temperatureF',
      label: 'Whirlpool Temperature °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 180'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Whirlpool Duration min',
      type: 'number',
      step: '1',
      required: true,
      placeholder: 'Example: 20'
    }),
    Object.freeze({
      key: 'additions',
      label: 'Whirlpool Additions',
      type: 'textarea',
      required: false,
      placeholder: 'Whirlpool hops and other additions'
    }),
    Object.freeze({
      key: 'settlingDurationMin',
      label: 'Settling Duration min',
      type: 'number',
      step: '1',
      required: false,
      placeholder: 'Example: 10'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Whirlpool Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Recirculation, cone or settling notes'
    })
  ]),

  'Knockout': Object.freeze([
    Object.freeze({
      key: 'temperatureF',
      label: 'Knockout Temperature °F',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 62'
    }),
    Object.freeze({
      key: 'gravity',
      label: 'Original Gravity',
      type: 'number',
      step: '0.001',
      required: true,
      placeholder: 'Example: 1.045'
    }),
    Object.freeze({
      key: 'volumeGal',
      label: 'Transferred Volume gal',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 265'
    }),
    Object.freeze({
      key: 'ph',
      label: 'Knockout pH',
      type: 'number',
      step: '0.01',
      required: false,
      placeholder: 'Example: 4.90'
    }),
    Object.freeze({
      key: 'fermenter',
      label: 'Receiving Fermenter',
      type: 'text',
      required: true,
      placeholder: 'Example: FV3'
    }),
    Object.freeze({
      key: 'kettleRemainderGal',
      label: 'Kettle Remainder gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 10'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Knockout Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Chilling, transfer or trub notes'
    })
  ]),

  'Oxygenation': Object.freeze([
    Object.freeze({
      key: 'action',
      label: 'Oxygenation Method',
      type: 'text',
      required: true,
      placeholder: 'Example: Inline oxygenation'
    }),
    Object.freeze({
      key: 'durationMin',
      label: 'Duration min',
      type: 'number',
      step: '1',
      required: false,
      placeholder: 'Optional duration'
    }),
    Object.freeze({
      key: 'oxygenRate',
      label: 'Oxygen Rate / Setting',
      type: 'text',
      required: false,
      placeholder: 'Example: 1 L/min'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Oxygenation Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Rate, pressure or equipment notes'
    })
  ]),

  'Yeast Pitch': Object.freeze([
    Object.freeze({
      key: 'yeast',
      label: 'Yeast Strain / Source',
      type: 'text',
      required: true,
      placeholder: 'Example: Fresh Index'
    }),
    Object.freeze({
      key: 'yeastLot',
      label: 'Yeast Lot / Batch',
      type: 'text',
      required: false,
      placeholder: 'Example: Lot 072426'
    }),
    Object.freeze({
      key: 'yeastGeneration',
      label: 'Yeast Generation',
      type: 'text',
      required: false,
      placeholder: 'Example: Gen 2'
    }),
    Object.freeze({
      key: 'pitchQuantity',
      label: 'Pitch Quantity',
      type: 'text',
      required: false,
      placeholder: 'Example: 1 brick'
    }),
    Object.freeze({
      key: 'action',
      label: 'Pitch Confirmation',
      type: 'text',
      required: true,
      placeholder: 'Example: Yeast pitched'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Pitch Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Direct pitch, slurry or source details'
    })
  ]),

  'Fermenter Filled': Object.freeze([
    Object.freeze({
      key: 'fermenter',
      label: 'Fermenter',
      type: 'text',
      required: true,
      placeholder: 'Example: FV3'
    }),
    Object.freeze({
      key: 'volumeGal',
      label: 'Final Transfer Volume gal',
      type: 'number',
      step: '0.1',
      required: true,
      placeholder: 'Example: 265'
    }),
    Object.freeze({
      key: 'temperatureF',
      label: 'Fermenter Temperature °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 62'
    }),
    Object.freeze({
      key: 'controllerSetpointF',
      label: 'Controller Setpoint °F',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 56'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Fermenter Fill Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Tank controller, label or transfer notes'
    })
  ]),

  'Brew Complete': Object.freeze([
    Object.freeze({
      key: 'action',
      label: 'Completion Confirmation',
      type: 'text',
      required: true,
      placeholder: 'Example: Brew-day record reviewed'
    }),
    Object.freeze({
      key: 'totalLossGal',
      label: 'Estimated Brew-Day Loss gal',
      type: 'number',
      step: '0.1',
      required: false,
      placeholder: 'Example: 20'
    }),
    Object.freeze({
      key: 'cellarHandoff',
      label: 'Cellar Handoff',
      type: 'text',
      required: false,
      placeholder: 'Example: FV3 handed off to cellar'
    }),
    Object.freeze({
      key: 'notes',
      label: 'Final Brew-Day Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Final notes and cellar handoff details'
    })
  ])
});


function getBrewingStageFormFields_(stage) {
  return BVBOS_STAGE_FORMS[stage] || [];
}


function buildCurrentStageForm_(activeBatch) {
  if (!activeBatch) {
    return {
      stage: null,
      fields: [],
      saveLabel: 'Save Stage Readings'
    };
  }

  const completed =
    hasCompletedStageReadings_(
      activeBatch.batchId,
      activeBatch.currentStage
    );

  return {
    stage:
      activeBatch.currentStage,

    fields:
      getBrewingStageFormFields_(
        activeBatch.currentStage
      ),

    saveLabel:
      completed
        ? (
            'Update ' +
            activeBatch.currentStage +
            ' Readings'
          )
        : (
            'Save ' +
            activeBatch.currentStage +
            ' Readings'
          ),

    completed:
      completed,

    completionLabel:
      completed
        ? 'Readings Saved'
        : 'Readings Required'
  };
}


function validateStageReadings_(
  stage,
  readings
) {
  readings = readings || {};

  const fields =
    getBrewingStageFormFields_(stage);

  fields.forEach(function(field) {
    if (!field.required) {
      return;
    }

    const value =
      readings[field.key];

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ''
    ) {
      throw new Error(
        field.label +
        ' is required for ' +
        stage +
        '.'
      );
    }
  });

  return true;
}


function buildStageReadingNotes_(
  stage,
  readings
) {
  readings = readings || {};

  const structuredKeys = {
    action: true,
    temperatureF: true,
    volumeGal: true,
    gravity: true,
    durationMin: true,
    employee: true,
    notes: true
  };

  const labelMap = {};

  getBrewingStageFormFields_(
    stage
  ).forEach(function(field) {
    labelMap[field.key] =
      field.label;
  });

  const extras = [];

  Object.keys(readings)
    .forEach(function(key) {
      if (
        structuredKeys[key] ||
        readings[key] === null ||
        readings[key] === undefined ||
        String(readings[key]).trim() === ''
      ) {
        return;
      }

      extras.push(
        (
          labelMap[key] ||
          key
        ) +
        ': ' +
        String(readings[key]).trim()
      );
    });

  if (readings.notes) {
    extras.push(
      String(readings.notes).trim()
    );
  }

  return extras.join(' | ');
}


function saveCurrentStageReadingsService(
  batchId,
  readings
) {
  requireBusinessValue_(
    batchId,
    'Batch ID'
  );

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

  const permissions =
    buildBrewingBatchPermissions_(
      batch
    );

  if (!permissions.canSaveReadings) {
    throw new Error(
      'Stage readings can only be saved for an active brewing batch.'
    );
  }

  readings = readings || {};

  validateStageReadings_(
    batch.currentStage,
    readings
  );

  const operatorAction =
    businessText_(
      readings.action,
      250
    );

  const notes =
    [
      operatorAction
        ? (
            'Action: ' +
            operatorAction
          )
        : '',

      buildStageReadingNotes_(
        batch.currentStage,
        readings
      )
    ]
      .filter(Boolean)
      .join(' | ');

  const result =
    logBrewDayEvent({
      batchId: batch.batchId,
      stage: batch.currentStage,
      action: 'Stage Readings Saved',
      temperatureF:
        readings.temperatureF || '',
      volumeGal:
        readings.volumeGal || '',
      gravity:
        readings.gravity || '',
      durationMin:
        readings.durationMin || '',
      employee:
        businessText_(
          readings.employee,
          150
        ),
      notes:
        notes,
      status: 'Completed',
      createdAutomatically: false
    });

  return {
    success: true,
    batchId: batch.batchId,
    batchNumber: batch.batchNumber,
    stage: batch.currentStage,
    eventId:
      result.eventId,

    stageCompleted:
      true,

    canAdvance:
      true,

    savedAt:
      formatDateTime_(
        new Date()
      )
  };
}



/**
 * RC7 engine diagnostic.
 *
 * Returns the active batch, authoritative reading state,
 * and permission calculation without changing any data.
 */
function testBrewingEngineState() {
  const activeBatch =
    getActiveBrewingBatch_();

  const result = {
    activeBatch:
      activeBatch,

    stageReadingState:
      activeBatch
        ? getBrewingStageReadingState_(
            activeBatch.batchId,
            activeBatch.currentStage
          )
        : null,

    permissions:
      activeBatch
        ? buildBrewingBatchPermissions_(
            activeBatch
          )
        : null,

    duplicateFunctions:
      []
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


/* =========================================================
   ACCEPTANCE TEST
   ========================================================= */

function testBusinessLayer() {
  const activeBatch =
    getActiveBrewingBatch_();

  const brewingView =
    activeBatch
      ? buildActiveBatchView_(
          activeBatch
        )
      : null;

  const batchValidation =
    validateBrewingBatch_({
      batchNumber:
        'BUSINESS-LAYER-TEST',

      brewDate:
        new Date(),

      product:
        'Validation Test',

      brewer:
        'Felipe Ornelas',

      plannedVolumeBbl:
        8,

      status:
        'Planned',

      currentStage:
        'Planned'
    });

  const result = {
    businessRules:
      getBusinessRules_(),

    batchValidation:
      batchValidation,

    activeBatchView:
      brewingView,

    currentStageGuide:
      buildCurrentStageGuide_(
        activeBatch
      ),

    nextStageFromMashIn:
      getNextBrewingStage_(
        'Mash In'
      ),

    mashRestProgressPercent:
      calculateBrewingProgress_(
        'Mash Rest'
      ),

    cipAttentionTest:
      cipRequiresAttention_(
        'Needs Recleaning'
      ),

    normalizedKegStatus:
      normalizeKegStatus_(
        'limbo'
      )
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
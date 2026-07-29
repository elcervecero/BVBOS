/**
 * BVBOS RC10.1 CELLAR OPERATIONS
 *
 * Cellar Handoffs are the intake source. Cellar Readings and Cellar Events
 * are created automatically the first time this module is opened or used.
 */

const CELLAR_STATUSES = Object.freeze([
  'Fermenting',
  'Conditioning',
  'Cold Crash',
  'Ready for Packaging',
  'Transferred',
  'Needs CIP',
  'Completed'
]);

function ensureCellarSheet_(sheetName, title, headers) {
  const spreadsheet = getDatabase_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (sheet) return sheet;
  sheet = spreadsheet.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, headers.length).merge().setValue(title);
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(3);
  return sheet;
}

function ensureCellarReadingsSheet_() {
  return ensureCellarSheet_(
    APP_CONFIG.SHEETS.CELLAR_READINGS,
    'BVBOS — Cellar Readings',
    [
      'Reading ID','Batch ID','Batch Number','Product','Tank','Reading Date / Time',
      'Temperature °F','Gravity','pH','Pressure PSI','Employee','Notes'
    ]
  );
}

function ensureCellarEventsSheet_() {
  return ensureCellarSheet_(
    APP_CONFIG.SHEETS.CELLAR_EVENTS,
    'BVBOS — Cellar Events',
    [
      'Event ID','Batch ID','Batch Number','Product','Tank','Event Date / Time',
      'Event Type','Status','Employee','Notes'
    ]
  );
}

function parseCellarDate_(value) {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function cellarDaysInTank_(handoffDateTime) {
  const start = parseCellarDate_(handoffDateTime);
  if (!start) return 0;
  return Math.max(0, Math.floor((new Date().getTime() - start.getTime()) / 86400000));
}

function getCellarHandoffs_() {
  const spreadsheet = getDatabase_();
  const sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.CELLAR_HANDOFFS);
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 4) return [];
  const map = buildHeaderMap_(values[2]);
  return nonEmptyRows_(values.slice(3), 0).map(function(row) {
    return {
      handoffId: safeValue_(row,map,'Handoff ID'),
      batchId: safeValue_(row,map,'Batch ID'),
      batchNumber: safeValue_(row,map,'Batch Number'),
      product: safeValue_(row,map,'Product'),
      handoffDateTime: safeValue_(row,map,'Handoff Date / Time'),
      tank: safeValue_(row,map,'Fermenter'),
      finalVolumeGal: safeValue_(row,map,'Final Volume gal'),
      originalGravity: safeValue_(row,map,'Original Gravity'),
      knockoutTemperatureF: safeValue_(row,map,'Knockout Temperature °F'),
      brewer: safeValue_(row,map,'Brewer'),
      finalNotes: safeValue_(row,map,'Final Notes'),
      handoffStatus: safeValue_(row,map,'Status')
    };
  });
}

function getCellarReadings_() {
  const sheet = ensureCellarReadingsSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 4) return [];
  const map = buildHeaderMap_(values[2]);
  return nonEmptyRows_(values.slice(3),0).map(function(row) {
    return {
      readingId: safeValue_(row,map,'Reading ID'), batchId: safeValue_(row,map,'Batch ID'),
      batchNumber: safeValue_(row,map,'Batch Number'), product: safeValue_(row,map,'Product'),
      tank: safeValue_(row,map,'Tank'), readingDateTime: safeValue_(row,map,'Reading Date / Time'),
      temperatureF: safeValue_(row,map,'Temperature °F'), gravity: safeValue_(row,map,'Gravity'),
      pH: safeValue_(row,map,'pH'), pressurePsi: safeValue_(row,map,'Pressure PSI'),
      employee: safeValue_(row,map,'Employee'), notes: safeValue_(row,map,'Notes')
    };
  });
}

function getCellarEvents_() {
  const sheet = ensureCellarEventsSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 4) return [];
  const map = buildHeaderMap_(values[2]);
  return nonEmptyRows_(values.slice(3),0).map(function(row) {
    return {
      eventId: safeValue_(row,map,'Event ID'), batchId: safeValue_(row,map,'Batch ID'),
      batchNumber: safeValue_(row,map,'Batch Number'), product: safeValue_(row,map,'Product'),
      tank: safeValue_(row,map,'Tank'), eventDateTime: safeValue_(row,map,'Event Date / Time'),
      eventType: safeValue_(row,map,'Event Type'), status: safeValue_(row,map,'Status'),
      employee: safeValue_(row,map,'Employee'), notes: safeValue_(row,map,'Notes')
    };
  });
}

function latestCellarItemForBatch_(items, batchId, dateField) {
  return items.filter(function(item){ return item.batchId === batchId; }).slice(-1)[0] || null;
}

function getCellarDashboard_() {
  const handoffs = getCellarHandoffs_();
  const readings = getCellarReadings_();
  const events = getCellarEvents_();
  const records = handoffs.map(function(handoff) {
    const latestReading = latestCellarItemForBatch_(readings,handoff.batchId,'readingDateTime');
    const latestEvent = latestCellarItemForBatch_(events,handoff.batchId,'eventDateTime');
    const status = latestEvent && latestEvent.status ? latestEvent.status : 'Fermenting';
    return Object.assign({}, handoff, {
      status: status,
      daysInTank: cellarDaysInTank_(handoff.handoffDateTime),
      latestReading: latestReading,
      latestEvent: latestEvent
    });
  });
  const active = records.filter(function(r){ return ['Transferred','Completed'].indexOf(r.status) === -1; });
  const completed = records.filter(function(r){ return ['Transferred','Completed'].indexOf(r.status) !== -1; });
  const statuses = {};
  active.forEach(function(r){ statuses[r.status]=(statuses[r.status]||0)+1; });
  return {
    activeTanks: active,
    completedHistory: completed.slice().reverse(),
    recentEvents: events.slice().reverse().slice(0,APP_CONFIG.LIMITS.RECENT_CELLAR_EVENTS),
    summary: {
      activeTanks: active.length,
      fermenting: statuses['Fermenting'] || 0,
      conditioning: statuses['Conditioning'] || 0,
      coldCrash: statuses['Cold Crash'] || 0,
      readyForPackaging: statuses['Ready for Packaging'] || 0,
      needsCip: statuses['Needs CIP'] || 0
    },
    generatedAt: formatDateTime_(new Date()),
    allowedStatuses: CELLAR_STATUSES
  };
}

function saveCellarReading_(data) {
  data=data||{};
  const handoff = getCellarHandoffs_().find(function(item){ return item.batchId === data.batchId; });
  if (!handoff) throw new Error('Cellar batch not found.');
  const readingId=createBvbosId_('CLR');
  ensureCellarReadingsSheet_().appendRow([
    readingId,handoff.batchId,handoff.batchNumber,handoff.product,handoff.tank,new Date(),
    data.temperatureF||'',data.gravity||'',data.pH||'',data.pressurePsi||'',
    data.employee||'',data.notes||''
  ]);
  logCellarEvent_({
    batchId:handoff.batchId,batchNumber:handoff.batchNumber,product:handoff.product,tank:handoff.tank,
    eventType:'Cellar Reading Saved',status:data.status||'',employee:data.employee||'',notes:data.notes||''
  });
  return {success:true,readingId:readingId};
}

function logCellarEvent_(data) {
  const eventId=createBvbosId_('CLE');
  ensureCellarEventsSheet_().appendRow([
    eventId,data.batchId||'',data.batchNumber||'',data.product||'',data.tank||'',new Date(),
    data.eventType||'Cellar Event',data.status||'',data.employee||'',data.notes||''
  ]);
  return eventId;
}

function updateCellarStatus_(data) {
  data=data||{};
  if (CELLAR_STATUSES.indexOf(data.status) === -1) throw new Error('Invalid Cellar status.');
  const handoff = getCellarHandoffs_().find(function(item){ return item.batchId === data.batchId; });
  if (!handoff) throw new Error('Cellar batch not found.');
  const eventId=logCellarEvent_({
    batchId:handoff.batchId,batchNumber:handoff.batchNumber,product:handoff.product,tank:handoff.tank,
    eventType:'Cellar Status Changed',status:data.status,employee:data.employee||'',notes:data.notes||''
  });
  return {success:true,eventId:eventId,status:data.status};
}

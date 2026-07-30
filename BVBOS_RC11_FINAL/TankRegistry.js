/**
 * BVBOS RC11 — TANK REGISTRY
 * Permanent vessel registry and available-vessel calculations.
 */

function tankRegistryHeaders_() {
  return [
    'Tank ID',
    'Tank Name',
    'Tank Type',
    'Capacity Gallons',
    'Glycol Connected',
    'Operational Role',
    'Current Status',
    'Active',
    'Notes',
    'Last Updated'
  ];
}

function defaultTankRegistryRows_() {
  return [
    ['FV1','FV1','Fermenter',294,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV2','FV2','Fermenter',294,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV3','FV3','Fermenter',294,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV4','FV4','Fermenter',294,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV5','FV5','Fermenter',325,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV6','FV6','Fermenter',233,'Yes','Fermentation','Available','Yes','On glycol',new Date()],
    ['FV7','FV7','Fermenter',233,'No','Fermentation','Available','Yes','Not on glycol',new Date()],
    ['FV8','FV8','Fermenter',233,'No','Fermentation','Available','Yes','Not on glycol',new Date()],
    ['FV9','FV9','Fermenter',310,'No','Fermentation','Available','Yes','Not on glycol',new Date()],
    ['FV10','FV10','Fermenter',124,'No','Fermentation','Available','Yes','Not on glycol',new Date()],
    ['BT1','BT1','Brite Tank',210,'No','Brew Water Holding','Special Purpose','Yes','Currently used as a holding tank for brew water',new Date()]
  ];
}

function ensureTankRegistrySheet_() {
  const spreadsheet = getDatabase_();
  let sheet = spreadsheet.getSheetByName(APP_CONFIG.SHEETS.TANK_REGISTRY);
  const headers = tankRegistryHeaders_();

  if (!sheet) {
    sheet = spreadsheet.insertSheet(APP_CONFIG.SHEETS.TANK_REGISTRY);
    sheet.getRange(1,1,1,headers.length).merge().setValue('BVBOS — Tank Registry');
    sheet.getRange(3,1,1,headers.length).setValues([headers]);
    sheet.setFrozenRows(3);
  }

  if (sheet.getLastRow() < 4) {
    const rows = defaultTankRegistryRows_();
    sheet.getRange(4,1,rows.length,headers.length).setValues(rows);
  }

  return sheet;
}

function normalizeYesNo_(value) {
  const text = String(value == null ? '' : value).trim().toLowerCase();
  return ['yes','true','1','y'].indexOf(text) !== -1;
}

function getTankRegistry_() {
  const sheet = ensureTankRegistrySheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 4) return [];
  const map = buildHeaderMap_(values[2]);

  return nonEmptyRows_(values.slice(3),0).map(function(row) {
    return {
      tankId: safeValue_(row,map,'Tank ID'),
      tankName: safeValue_(row,map,'Tank Name'),
      tankType: safeValue_(row,map,'Tank Type'),
      capacityGallons: Number(safeValue_(row,map,'Capacity Gallons')) || 0,
      glycolConnected: normalizeYesNo_(safeValue_(row,map,'Glycol Connected')),
      operationalRole: safeValue_(row,map,'Operational Role'),
      registryStatus: safeValue_(row,map,'Current Status') || 'Available',
      active: normalizeYesNo_(safeValue_(row,map,'Active')),
      notes: safeValue_(row,map,'Notes'),
      lastUpdated: safeValue_(row,map,'Last Updated')
    };
  });
}

function tankKey_(value) {
  return String(value || '').trim().toUpperCase();
}

function buildTankDashboard_(activeCellarRecords) {
  const activeRecords = activeCellarRecords || [];
  const occupiedByTank = {};

  activeRecords.forEach(function(record) {
    const key = tankKey_(record.tank);
    if (key) occupiedByTank[key] = record;
  });

  const tanks = getTankRegistry_().map(function(tank) {
    const occupiedRecord = occupiedByTank[tankKey_(tank.tankName)] || null;
    const role = String(tank.operationalRole || '').trim();
    const registryStatus = String(tank.registryStatus || '').trim();
    const isSpecialPurpose = role !== 'Fermentation';
    const isOffline = !tank.active || ['offline','needs cip','out of service'].indexOf(registryStatus.toLowerCase()) !== -1;

    let displayStatus = 'Available';
    if (isOffline) displayStatus = registryStatus || 'Offline';
    else if (occupiedRecord) displayStatus = occupiedRecord.status || 'Occupied';
    else if (isSpecialPurpose) displayStatus = registryStatus || 'Special Purpose';

    return Object.assign({}, tank, {
      occupied: Boolean(occupiedRecord),
      currentBatch: occupiedRecord,
      specialPurpose: isSpecialPurpose,
      offline: isOffline,
      availableForFermentation: !isOffline && !occupiedRecord && !isSpecialPurpose && tank.tankType === 'Fermenter',
      displayStatus: displayStatus
    });
  });

  const available = tanks.filter(function(tank){ return tank.availableForFermentation; });
  const occupied = tanks.filter(function(tank){ return tank.occupied; });
  const specialPurpose = tanks.filter(function(tank){ return tank.specialPurpose && !tank.offline; });
  const offline = tanks.filter(function(tank){ return tank.offline; });
  const glycolAvailable = available.filter(function(tank){ return tank.glycolConnected; });

  return {
    tanks: tanks,
    available: available,
    occupied: occupied,
    specialPurpose: specialPurpose,
    offline: offline,
    glycolAvailable: glycolAvailable
  };
}

function validateTankAssignment_(tankName, volumeGallons, requiresGlycol) {
  const tank = getTankRegistry_().find(function(item){
    return tankKey_(item.tankName) === tankKey_(tankName);
  });
  if (!tank) throw new Error('Tank is not registered: ' + tankName);
  if (!tank.active) throw new Error(tank.tankName + ' is inactive.');
  if (tank.operationalRole !== 'Fermentation' || tank.tankType !== 'Fermenter') {
    throw new Error(tank.tankName + ' is not available for fermentation.');
  }
  const volume = Number(volumeGallons) || 0;
  if (volume > tank.capacityGallons) {
    throw new Error('Batch volume exceeds ' + tank.tankName + ' capacity of ' + tank.capacityGallons + ' gallons.');
  }
  return {
    valid: true,
    warning: requiresGlycol && !tank.glycolConnected
      ? tank.tankName + ' is not connected to glycol.'
      : '',
    tank: tank
  };
}

function runRc11TankRegistryAcceptanceTest_() {
  const dashboard = buildTankDashboard_([]);
  const result = {
    success: dashboard.tanks.length === 11 && dashboard.available.length === 10 && dashboard.glycolAvailable.length === 6,
    tankCount: dashboard.tanks.length,
    availableForFermentation: dashboard.available.length,
    glycolAvailable: dashboard.glycolAvailable.length,
    specialPurpose: dashboard.specialPurpose.length,
    offline: dashboard.offline.length
  };
  if (!result.success) {
    throw new Error('RC11 acceptance test failed: ' + JSON.stringify(result));
  }
  return result;
}

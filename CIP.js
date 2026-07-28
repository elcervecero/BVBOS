function getCipSummary_() {
  const values = getSheetValues_(APP_CONFIG.SHEETS.CIP);
  if (values.length < 4) return {total:0, pass:0, pending:0, reclean:0, latest:null, recent:[]};

  const headers = values[2];
  const headerMap = buildHeaderMap_(headers);
  const rows = nonEmptyRows_(values.slice(3), 0);
  let pass = 0, pending = 0, reclean = 0;

  rows.forEach(row => {
    const result = safeValue_(row, headerMap, 'Cleanliness Result');
    if (result === 'Pass') pass++;
    else if (result === 'Needs Recleaning') reclean++;
    else pending++;
  });

  const recent = rows.slice(-10).reverse().map(row => ({
    id: safeValue_(row, headerMap, 'CIP ID'),
    date: safeValue_(row, headerMap, 'Date'),
    equipment: safeValue_(row, headerMap, 'Equipment'),
    chemical: safeValue_(row, headerMap, 'Chemical'),
    ounces: safeValue_(row, headerMap, 'Chemical Amount oz'),
    gallons: safeValue_(row, headerMap, 'Water Volume gal'),
    concentration: safeValue_(row, headerMap, 'Concentration oz/gal'),
    temperature: safeValue_(row, headerMap, 'Temperature °F'),
    contactTime: safeValue_(row, headerMap, 'Contact Time min'),
    result: safeValue_(row, headerMap, 'Cleanliness Result'),
    employee: safeValue_(row, headerMap, 'Employee'),
    notes: safeValue_(row, headerMap, 'Notes')
  }));

  return {total:rows.length, pass, pending, reclean, latest:recent[0] || null, recent};
}


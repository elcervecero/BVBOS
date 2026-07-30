function formatDateTime_(date) {
  return Utilities.formatDate(
    date,
    APP_CONFIG.TIME_ZONE,
    'MMM d, yyyy h:mm a'
  );
}

function buildHeaderMap_(headers) {
  const map = {};

  headers.forEach(function(header, index) {
    const name = String(header || '').trim();

    if (name) {
      map[name] = index;
    }
  });

  return map;
}

function nonEmptyRows_(rows, keyColumnIndex) {
  const keyIndex =
    typeof keyColumnIndex === 'number'
      ? keyColumnIndex
      : 0;

  return rows.filter(function(row) {
    return String(
      row[keyIndex] || ''
    ).trim() !== '';
  });
}

function safeValue_(row, indexMap, header) {
  const index = indexMap[header];

  if (index === undefined) {
    return '';
  }

  return row[index] || '';
}

function createBvbosId_(prefix) {
  const timestamp = Utilities.formatDate(
    new Date(),
    APP_CONFIG.TIME_ZONE,
    'yyyyMMdd-HHmmss'
  );

  const random = Math.floor(
    100 + Math.random() * 900
  );

  return [
    String(prefix || 'ID').toUpperCase(),
    timestamp,
    random
  ].join('-');
}

function normalizeStatus_(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}
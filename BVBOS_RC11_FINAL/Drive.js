function getRecentFiles_() {
  const values = getSheetValues_(APP_CONFIG.SHEETS.FILE_INDEX);
  if (values.length < 4) return [];
  const headerMap = buildHeaderMap_(values[2]);
  const rows = nonEmptyRows_(values.slice(3), 0);
  return rows.slice(-10).reverse().map(row => ({
    name: safeValue_(row, headerMap, 'File Name'),
    department: safeValue_(row, headerMap, 'Department'),
    type: safeValue_(row, headerMap, 'Document Type'),
    url: safeValue_(row, headerMap, 'Google Drive Link'),
    status: safeValue_(row, headerMap, 'Status')
  }));
}

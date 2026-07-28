function getKegSummary_() {
  const values = getSheetValues_(APP_CONFIG.SHEETS.KEG_FLEET);
  if (values.length < 4) return {total:0, clean:0, dirty:0, filled:0, delivered:0, onTap:0, limbo:0};
  const headerMap = buildHeaderMap_(values[2]);
  const rows = nonEmptyRows_(values.slice(3), 0);
  const summary = {total:rows.length, clean:0, dirty:0, filled:0, delivered:0, onTap:0, limbo:0};
  rows.forEach(row => {
    const status = String(safeValue_(row, headerMap, 'Current Status')).toLowerCase();
    if (status === 'clean') summary.clean++;
    else if (status === 'dirty') summary.dirty++;
    else if (status === 'filled') summary.filled++;
    else if (status === 'delivered') summary.delivered++;
    else if (status === 'on tap') summary.onTap++;
    else if (status === 'in limbo') summary.limbo++;
  });
  return summary;
}

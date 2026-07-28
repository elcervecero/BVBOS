/**
 * BVBOS DASHBOARD ORCHESTRATOR
 *
 * Provides:
 * - Compatibility data for the current CIP dashboard
 * - Executive Command Center data for the new interface
 */

function getDashboard() {
  const cip = getCipSummary_();
  const commandCenter =
    getExecutiveCommandCenter_();

  return {
    app: {
      name: APP_CONFIG.APP_NAME,
      version: APP_CONFIG.APP_VERSION,
      generatedAt: formatDateTime_(new Date())
    },

    /*
     * Current-dashboard compatibility fields.
     * These keep the existing live app working until
     * the new HTML interface is deployed.
     */
    total: cip.total,
    pass: cip.pass,
    fail: cip.reclean,
    pending: cip.pending,
    latest: cip.latest,
    recent: cip.recent,

    /*
     * New Executive Command Center payload.
     */
    commandCenter: commandCenter
  };
}


/**
 * Compatibility endpoint used by the current Scripts.html.
 */
function getDashboardLegacy() {
  return getDashboard();
}


/**
 * Future browser endpoint for the Command Center UI.
 */
function getDashboardForBrowser() {
  return getDashboard();
}


/**
 * Sprint 5 Phase 2 dashboard acceptance test.
 */
function testSprint5Dashboard() {
  const dashboard = getDashboard();

  console.log(
    JSON.stringify(
      dashboard,
      null,
      2
    )
  );

  return dashboard;
}
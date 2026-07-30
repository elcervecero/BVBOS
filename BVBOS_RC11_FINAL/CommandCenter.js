/**
 * BVBOS EXECUTIVE COMMAND CENTER
 *
 * Combines live information from:
 * - Brewing
 * - CIP
 * - Kegs
 * - Core Engine
 * - File Index
 */

function getExecutiveCommandCenter_() {
  const brewing = getBrewingDashboard();
  const cip = getCipSummary_();
  const kegs = getKegSummary_();
  const core = getCoreEngineStatus_();
  const recentFiles = getRecentFiles_();
  const cellar = getCellarDashboard_();

  const health = calculateBreweryHealth_(
    brewing,
    cip,
    kegs,
    core
  );

  return {
    health: health,

    statusBar: {
      systemStatus: core.status,
      databaseStatus: 'Online',
      appVersion: APP_CONFIG.APP_VERSION,
      generatedAt: formatDateTime_(new Date())
    },

    cards: {
      brewing: buildBrewingCommandCard_(brewing),

      cellar: {
        label: 'Cellar',
        status: cellar.summary.needsCip > 0 ? 'Warning' : 'Active',
        primaryValue: cellar.summary.activeTanks,
        primaryLabel: 'Active Tanks',
        details: [
          cellar.summary.fermenting + ' fermenting',
          cellar.summary.conditioning + ' conditioning',
          cellar.summary.coldCrash + ' cold crash',
          cellar.summary.readyForPackaging + ' ready for packaging'
        ]
      },

      kegs: {
        label: 'Keg Fleet',
        status: getKegHealthStatus_(kegs),
        primaryValue: kegs.total,
        primaryLabel: 'Total Kegs',
        details: [
          kegs.filled + ' filled',
          kegs.clean + ' clean',
          kegs.dirty + ' dirty',
          kegs.delivered + ' delivered',
          kegs.onTap + ' on tap',
          kegs.limbo + ' in limbo'
        ]
      },

      cip: {
        label: 'CIP & Sanitation',
        status: getCipHealthStatus_(cip),
        primaryValue: cip.total,
        primaryLabel: 'Total Records',
        details: [
          cip.pass + ' passed',
          cip.pending + ' pending',
          cip.reclean + ' need recleaning'
        ]
      },

      alerts: {
        label: 'Alerts',

        status:
          core.criticalAlertCount > 0
            ? 'Critical'
            : core.warningAlertCount > 0
              ? 'Warning'
              : 'Healthy',

        primaryValue: core.openAlertCount,
        primaryLabel: 'Open Alerts',

        details: [
          core.criticalAlertCount + ' critical',
          core.warningAlertCount + ' warnings'
        ]
      },

      documents: {
        label: 'Documents',
        status: 'Online',
        primaryValue: recentFiles.length,
        primaryLabel: 'Recent Files',
        details: [
          'Google Drive File Index connected'
        ]
      }
    },

    recentEvents: core.recentEvents || [],
    openAlerts: core.openAlerts || [],
    modules: buildCommandCenterModules_(
      core.modules || [],
      brewing
    ),

    recentFiles: recentFiles,

    recommendations:
      buildCommandCenterRecommendations_(
        brewing,
        cip,
        kegs,
        core
      )
  };
}


/**
 * Builds the Brewing card from live batch data.
 */
function buildBrewingCommandCard_(brewing) {
  const active =
    brewing && brewing.activeBatch
      ? brewing.activeBatch
      : null;

  if (active) {
    return {
      label: 'Brewing',
      status: 'Active',
      primaryValue:
        active.batchNumber || 'Active',
      primaryLabel:
        active.product || 'Current Batch',

      details: [
        'Stage: ' +
          (
            active.currentStage ||
            'Not recorded'
          ),

        'Brewer: ' +
          (
            active.brewer ||
            'Not assigned'
          ),

        'Fermenter: ' +
          (
            active.fermenter ||
            'Not assigned'
          )
      ]
    };
  }

  const plannedCount =
    brewing &&
    brewing.summary
      ? Number(
          brewing.summary.plannedBatches || 0
        )
      : 0;

  return {
    label: 'Brewing',

    status:
      plannedCount > 0
        ? 'Planned'
        : 'Ready',

    primaryValue: plannedCount,

    primaryLabel: 'Planned Batches',

    details: [
      'No active brew currently',

      (
        brewing &&
        brewing.summary
          ? brewing.summary.completedBatches
          : 0
      ) + ' recently completed'
    ]
  };
}


/**
 * Updates module status so Brewing reflects live data.
 */
function buildCommandCenterModules_(
  modules,
  brewing
) {
  const list =
    Array.isArray(modules)
      ? modules.slice()
      : [];

  let brewingFound = false;

  list.forEach(function(module) {
    if (module.module === 'Brewing') {
      brewingFound = true;

      module.status =
        brewing &&
        brewing.activeBatch
          ? 'Active'
          : 'Online';
    }
  });

  if (!brewingFound) {
    list.push({
      module: 'Brewing',
      status:
        brewing &&
        brewing.activeBatch
          ? 'Active'
          : 'Online'
    });
  }

  return list;
}


/**
 * Calculates overall brewery health.
 */
function calculateBreweryHealth_(
  brewing,
  cip,
  kegs,
  core
) {
  let score = 100;

  score -=
    Number(
      core.criticalAlertCount || 0
    ) * 15;

  score -=
    Number(
      core.warningAlertCount || 0
    ) * 5;

  score -=
    Number(
      cip.reclean || 0
    ) * 8;

  score -= Math.min(
    Number(
      cip.pending || 0
    ) * 2,
    10
  );

  score -= Math.min(
    Math.floor(
      Number(
        kegs.dirty || 0
      ) / 5
    ) * 2,
    10
  );

  score -= Math.min(
    Math.floor(
      Number(
        kegs.limbo || 0
      ) / 25
    ),
    15
  );

  const activeBatch =
    brewing &&
    brewing.activeBatch
      ? brewing.activeBatch
      : null;

  if (
    activeBatch &&
    !activeBatch.brewer
  ) {
    score -= 3;
  }

  if (
    activeBatch &&
    !activeBatch.fermenter &&
    activeBatch.currentStage ===
      'Fermenter Filled'
  ) {
    score -= 5;
  }

  score = Math.max(
    0,
    Math.min(100, score)
  );

  let rating = 'Excellent';
  let status = 'Healthy';

  if (score < 90) {
    rating = 'Good';
  }

  if (score < 75) {
    rating = 'Needs Attention';
    status = 'Warning';
  }

  if (score < 55) {
    rating = 'Critical Attention';
    status = 'Critical';
  }

  return {
    score: score,
    rating: rating,
    status: status
  };
}


function getCipHealthStatus_(cip) {
  if (
    Number(
      cip.reclean || 0
    ) > 0
  ) {
    return 'Warning';
  }

  if (
    Number(
      cip.pending || 0
    ) > 0
  ) {
    return 'Pending';
  }

  return 'Healthy';
}


function getKegHealthStatus_(kegs) {
  if (
    Number(
      kegs.limbo || 0
    ) > 0
  ) {
    return 'Warning';
  }

  if (
    Number(
      kegs.dirty || 0
    ) > 10
  ) {
    return 'Attention';
  }

  return 'Healthy';
}


/**
 * Builds rule-based operational recommendations.
 */
function buildCommandCenterRecommendations_(
  brewing,
  cip,
  kegs,
  core
) {
  const recommendations = [];

  if (
    Number(
      core.criticalAlertCount || 0
    ) > 0
  ) {
    recommendations.push({
      priority: 'Critical',
      module: 'Alerts',
      message:
        'Review critical operational alerts immediately.'
    });
  }

  const activeBatch =
    brewing &&
    brewing.activeBatch
      ? brewing.activeBatch
      : null;

  if (activeBatch) {
    recommendations.push({
      priority: 'Info',
      module: 'Brewing',
      message:
        'Batch ' +
        activeBatch.batchNumber +
        ' — ' +
        activeBatch.product +
        ' is currently at the ' +
        activeBatch.currentStage +
        ' stage.'
    });
  } else if (
    brewing &&
    brewing.summary &&
    Number(
      brewing.summary.plannedBatches || 0
    ) > 0
  ) {
    recommendations.push({
      priority: 'Medium',
      module: 'Brewing',
      message:
        brewing.summary.plannedBatches +
        ' planned brewing batch' +
        (
          Number(
            brewing.summary.plannedBatches
          ) === 1
            ? ' is'
            : 'es are'
        ) +
        ' waiting to begin.'
    });
  }

  if (
    Number(
      cip.reclean || 0
    ) > 0
  ) {
    recommendations.push({
      priority: 'High',
      module: 'CIP',
      message:
        cip.reclean +
        ' CIP record requires recleaning or verification.'
    });
  }

  if (
    Number(
      cip.pending || 0
    ) > 0
  ) {
    recommendations.push({
      priority: 'Medium',
      module: 'CIP',
      message:
        cip.pending +
        ' CIP record is still pending a final result.'
    });
  }

  if (
    Number(
      kegs.dirty || 0
    ) > 0
  ) {
    recommendations.push({
      priority:
        Number(
          kegs.dirty
        ) > 10
          ? 'High'
          : 'Medium',

      module: 'Kegs',

      message:
        kegs.dirty +
        ' dirty kegs are waiting for cleaning.'
    });
  }

  if (
    Number(
      kegs.limbo || 0
    ) > 0
  ) {
    recommendations.push({
      priority: 'High',
      module: 'Kegs',
      message:
        kegs.limbo +
        ' kegs are marked in limbo and require review.'
    });
  }

  if (
    Number(
      kegs.clean || 0
    ) === 0
  ) {
    recommendations.push({
      priority: 'High',
      module: 'Kegs',
      message:
        'No clean kegs are currently recorded as available.'
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      priority: 'Info',
      module: 'System',
      message:
        'No immediate operational issues were detected.'
    });
  }

  return recommendations;
}


/**
 * Phase 2 Command Center acceptance test.
 */
function testPhase2CommandCenter() {
  const commandCenter =
    getExecutiveCommandCenter_();

  console.log(
    JSON.stringify(
      commandCenter,
      null,
      2
    )
  );

  return commandCenter;
}
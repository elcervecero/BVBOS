/**
 * BVBOS CORE ENGINE
 *
 * Handles:
 * - Operations Timeline
 * - Alerts
 * - Module health
 * - Command Center activity
 */

function logBvbosEvent(eventData) {
  eventData = eventData || {};

  if (!eventData.module) {
    throw new Error(
      'Event module is required.'
    );
  }

  if (!eventData.eventType) {
    throw new Error(
      'Event type is required.'
    );
  }

  if (!eventData.title) {
    throw new Error(
      'Event title is required.'
    );
  }

  const timelineId =
    eventData.timelineId ||
    createBvbosId_('EVT');

  const eventDate =
    eventData.eventDate instanceof Date
      ? eventData.eventDate
      : new Date();

  appendSheetRow_(
    APP_CONFIG.SHEETS.OPERATIONS_TIMELINE,
    [
      timelineId,
      eventDate,
      eventData.module || '',
      eventData.eventType || '',
      eventData.title || '',
      eventData.description || '',
      eventData.batchId || '',
      eventData.product || '',
      eventData.asset ||
        eventData.equipment ||
        '',
      eventData.employee || '',
      eventData.status || 'Completed',
      eventData.sourceSystem || 'BVBOS',
      eventData.sourceRecordId || '',
      eventData.link || '',
      eventData.createdAutomatically === false
        ? 'No'
        : 'Yes',
      eventData.notes || ''
    ]
  );

  return {
    success: true,
    timelineId: timelineId
  };
}

function createBvbosAlert(alertData) {
  alertData = alertData || {};

  if (!alertData.module) {
    throw new Error(
      'Alert module is required.'
    );
  }

  if (!alertData.title) {
    throw new Error(
      'Alert title is required.'
    );
  }

  const alertId =
    alertData.alertId ||
    createBvbosId_('ALT');

  const severity =
    alertData.severity || 'Warning';

  appendSheetRow_(
    APP_CONFIG.SHEETS.ALERTS,
    [
      alertId,
      new Date(),
      alertData.module || '',
      severity,
      alertData.title || '',
      alertData.description || '',
      alertData.relatedRecordId || '',
      alertData.asset ||
        alertData.equipment ||
        '',
      alertData.assignedTo || '',
      alertData.status || 'Open',
      alertData.dueDate || '',
      '',
      alertData.sourceSystem || 'BVBOS',
      alertData.notes || ''
    ]
  );

  logBvbosEvent({
    module: alertData.module,
    eventType: 'Alert Created',
    title: alertData.title,
    description: alertData.description || '',
    asset:
      alertData.asset ||
      alertData.equipment ||
      '',
    employee: alertData.assignedTo || '',
    status: severity,
    sourceRecordId: alertId,
    createdAutomatically:
      alertData.createdAutomatically !== false
  });

  return {
    success: true,
    alertId: alertId
  };
}

function getRecentBvbosEvents_(
  limit
) {
  const values = getSheetValues_(
    APP_CONFIG.SHEETS.OPERATIONS_TIMELINE
  );

  if (values.length < 4) {
    return [];
  }

  const headers = values[2];
  const headerMap =
    buildHeaderMap_(headers);

  const rows = nonEmptyRows_(
    values.slice(3),
    0
  );

  const maxRows =
    Number(limit) ||
    APP_CONFIG.LIMITS.RECENT_EVENTS;

  return rows
    .slice(-maxRows)
    .reverse()
    .map(function(row) {
      return {
        timelineId: safeValue_(
          row,
          headerMap,
          'Timeline ID'
        ),

        dateTime: safeValue_(
          row,
          headerMap,
          'Event Date / Time'
        ),

        module: safeValue_(
          row,
          headerMap,
          'Module'
        ),

        eventType: safeValue_(
          row,
          headerMap,
          'Event Type'
        ),

        title: safeValue_(
          row,
          headerMap,
          'Title'
        ),

        description: safeValue_(
          row,
          headerMap,
          'Description'
        ),

        asset: safeValue_(
          row,
          headerMap,
          'Equipment / Tank / Keg'
        ),

        employee: safeValue_(
          row,
          headerMap,
          'Employee / User'
        ),

        status: safeValue_(
          row,
          headerMap,
          'Status'
        )
      };
    });
}

function getOpenBvbosAlerts_(
  limit
) {
  const values = getSheetValues_(
    APP_CONFIG.SHEETS.ALERTS
  );

  if (values.length < 4) {
    return [];
  }

  const headers = values[2];
  const headerMap =
    buildHeaderMap_(headers);

  const rows = nonEmptyRows_(
    values.slice(3),
    0
  );

  const maxRows =
    Number(limit) ||
    APP_CONFIG.LIMITS.OPEN_ALERTS;

  return rows
    .filter(function(row) {
      const status = normalizeStatus_(
        safeValue_(
          row,
          headerMap,
          'Status'
        )
      );

      return (
        status !== 'resolved' &&
        status !== 'closed'
      );
    })
    .slice(-maxRows)
    .reverse()
    .map(function(row) {
      return {
        alertId: safeValue_(
          row,
          headerMap,
          'Alert ID'
        ),

        createdDateTime: safeValue_(
          row,
          headerMap,
          'Created Date / Time'
        ),

        module: safeValue_(
          row,
          headerMap,
          'Module'
        ),

        severity: safeValue_(
          row,
          headerMap,
          'Severity'
        ),

        title: safeValue_(
          row,
          headerMap,
          'Title'
        ),

        description: safeValue_(
          row,
          headerMap,
          'Description'
        ),

        asset: safeValue_(
          row,
          headerMap,
          'Equipment / Tank / Keg'
        ),

        assignedTo: safeValue_(
          row,
          headerMap,
          'Assigned To'
        ),

        status: safeValue_(
          row,
          headerMap,
          'Status'
        )
      };
    });
}

function getCoreEngineStatus_() {
  const alerts = getOpenBvbosAlerts_(
    100
  );

  return {
    status: 'Online',

    openAlertCount:
      alerts.length,

    criticalAlertCount:
      alerts.filter(function(alert) {
        return normalizeStatus_(
          alert.severity
        ) === 'critical';
      }).length,

    warningAlertCount:
      alerts.filter(function(alert) {
        return normalizeStatus_(
          alert.severity
        ) === 'warning';
      }).length,

    recentEvents:
      getRecentBvbosEvents_(
        APP_CONFIG.LIMITS.RECENT_EVENTS
      ),

    openAlerts:
      alerts.slice(
        0,
        APP_CONFIG.LIMITS.OPEN_ALERTS
      ),

    modules: [
      {
        module: 'Dashboard',
        status: 'Online'
      },
      {
        module: 'CIP',
        status: 'Online'
      },
      {
        module: 'Kegs',
        status: 'Foundation'
      },
      {
        module: 'Documents',
        status: 'Foundation'
      },
      {
        module: 'Brewing',
        status: 'Planned'
      },
      {
        module: 'Cellar',
        status: 'Planned'
      },
      {
        module: 'Inventory',
        status: 'Planned'
      },
      {
        module: 'Maintenance',
        status: 'Planned'
      }
    ]
  };
}

function testCoreEngine() {
  const status =
    getCoreEngineStatus_();

  console.log(
    JSON.stringify(
      status,
      null,
      2
    )
  );

  return status;
}
var APP_CONFIG = Object.freeze({
  APP_NAME: 'BVBOS',
  APP_VERSION: 'RC11 Tank Registry',
  TIME_ZONE: 'America/Los_Angeles',

  SPREADSHEET_ID:
    '12w-DrdNuiLCmXbz-lYCsyMGc77bFVuLWAg3l1naFuDg',

  SHEETS: Object.freeze({
    CIP: 'CIP & Sanitation',
    FILE_INDEX: 'File Index',
    KEG_FLEET: 'Keg Fleet',
    OPERATIONS_TIMELINE: 'Operations Timeline',
    ALERTS: 'Alerts',

    BREWING_BATCHES: 'Brewing Batches',
    BREW_DAY_EVENTS: 'Brew Day Events',
    RECIPE_INDEX: 'Recipe Index',

    CELLAR_HANDOFFS: 'Cellar Handoffs',
    CELLAR_READINGS: 'Cellar Readings',
    CELLAR_EVENTS: 'Cellar Events',
    TANK_REGISTRY: 'Tank Registry'
  }),

  HEADERS: Object.freeze({
    HEADER_ROW: 3,
    DATA_ROW: 4
  }),

  LIMITS: Object.freeze({
    RECENT_CIP: 10,
    RECENT_FILES: 10,
    RECENT_EVENTS: 10,
    OPEN_ALERTS: 10,
    RECENT_BATCHES: 10,
    RECENT_BREW_EVENTS: 25,
    RECENT_CELLAR_EVENTS: 30
  }),

  BREWING: Object.freeze({
    STAGES: Object.freeze([
      'Planned',
      'Recipe Selected',
      'Water Preparation',
      'Milling',
      'Mash In',
      'Mash Rest',
      'Vorlauf',
      'Lauter / Sparge',
      'Transfer to Kettle',
      'Boil',
      'Whirlpool',
      'Knockout',
      'Oxygenation',
      'Yeast Pitch',
      'Fermenter Filled',
      'Brew Complete'
    ]),

    STAGE_REQUIREMENTS: Object.freeze({
      'Planned': Object.freeze({
        category: 'Planning',
        requiredFields: Object.freeze([
          'Batch Number',
          'Product',
          'Brew Date'
        ])
      }),

      'Recipe Selected': Object.freeze({
        category: 'Planning',
        requiredFields: Object.freeze([
          'Recipe ID'
        ])
      }),

      'Water Preparation': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Water Volume gal',
          'Temperature °F'
        ])
      }),

      'Milling': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Action'
        ])
      }),

      'Mash In': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Temperature °F'
        ])
      }),

      'Mash Rest': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Temperature °F',
          'Duration min'
        ])
      }),

      'Vorlauf': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Duration min'
        ])
      }),

      'Lauter / Sparge': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Water Volume gal'
        ])
      }),

      'Transfer to Kettle': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Volume gal'
        ])
      }),

      'Boil': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Duration min'
        ])
      }),

      'Whirlpool': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Duration min'
        ])
      }),

      'Knockout': Object.freeze({
        category: 'Brewhouse',
        requiredFields: Object.freeze([
          'Temperature °F',
          'Gravity'
        ])
      }),

      'Oxygenation': Object.freeze({
        category: 'Cellar Preparation',
        requiredFields: Object.freeze([
          'Action'
        ])
      }),

      'Yeast Pitch': Object.freeze({
        category: 'Cellar Preparation',
        requiredFields: Object.freeze([
          'Action'
        ])
      }),

      'Fermenter Filled': Object.freeze({
        category: 'Cellar Preparation',
        requiredFields: Object.freeze([
          'Fermenter'
        ])
      }),

      'Brew Complete': Object.freeze({
        category: 'Completion',
        requiredFields: Object.freeze([])
      })
    })
  })
});
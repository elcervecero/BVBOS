# BVBOS RC11 Final

## Release
Tank Registry and Available Vessel Dashboard

## Baseline
Built from the validated RC10.1.2 project supplied by the user.

## Included
- Complete BVBOS project, not a patch
- Permanent Tank Registry sheet
- FV1-FV10 and BT1 seeded automatically
- Vessel capacity, glycol, role, status, active flag, notes, and timestamp
- Cellar Vessel Map
- Available Tanks dashboard
- Occupied, available, special-purpose, and offline calculations
- BT1 excluded from fermentation availability while assigned to Brew Water Holding
- Tank-capacity validation foundation
- Non-glycol warning foundation
- RC11 acceptance test

## Expected acceptance-test result
- tankCount: 11
- availableForFermentation: 10
- glycolAvailable: 6
- specialPurpose: 1
- offline: 0

## Installation
1. Back up C:\BVBOS.
2. Extract this complete release over C:\BVBOS and replace files.
3. In PowerShell:

   npm run check
   git status
   git add .
   git commit -m "Release RC11 final tank registry and vessel dashboard"
   git push
   clasp push

4. Open the Apps Script project manually in the browser.
5. Run `runRc11TankRegistryAcceptanceTest_` once.
6. Update the existing web-app deployment to a new version named:
   `RC11 Final Tank Registry and Vessel Dashboard`
7. Hard-refresh the web app with Ctrl+F5.

## Important
The local source file is named `Confing.js` because that is the filename in the validated baseline. Do not rename it during this release.

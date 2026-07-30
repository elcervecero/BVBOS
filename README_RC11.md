# BVBOS RC11 — Tank Registry and Available Vessel Dashboard

## Included
- Permanent Tank Registry sheet seeded with FV1–FV10 and BT1
- Glycol, capacity, operational role, active status, and notes
- Cellar vessel map for all registered vessels
- Available Tanks dashboard
- Occupied/available/special-purpose/offline state calculation
- BT1 excluded from fermentation availability while used for brew water
- Tank capacity and glycol validation foundation
- Acceptance test: `runRc11TankRegistryAcceptanceTest_()`

## Install
1. Replace the project files with this package on `feature/cellar-operations`.
2. Run `npm run check`.
3. Run `clasp push`.
4. In Apps Script, run `runRc11TankRegistryAcceptanceTest_` once and authorize if prompted.
5. Confirm the result reports 11 registered tanks.
6. Deploy a new Web app version named `RC11 Tank Registry and Vessel Dashboard`.
7. Hard refresh with Ctrl+F5.

## Expected initial dashboard
With no active batches, 10 fermentation tanks should appear available. BT1 appears as a special-purpose Brew Water Holding vessel and is not counted as available for fermentation.

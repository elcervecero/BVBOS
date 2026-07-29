BVBOS RC10.1 — Cellar Dashboard Foundation

New file:
- Cellar.js

Updated files:
- Confing.js
- BusinessLayer.js
- CommandCenter.js
- Index.html
- Components.html
- Scripts.html
- Styles.html

Install on feature/cellar-operations only:
1. Extract this package over C:\BVBOS.
2. Confirm git status.
3. Run npm run check (if configured) or clasp show-file-status.
4. git add .
5. git commit -m "Add RC10.1 Cellar dashboard foundation"
6. git push
7. clasp push only after reviewing the diff.
8. Deploy a test web-app version.

First open creates Cellar Readings and Cellar Events sheets automatically. Existing Cellar Handoffs are used as active tank intake.

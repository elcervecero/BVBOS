# BVBOS

Buena Vista Brewing Operating System, managed locally with Git and `clasp`.

## Source of truth

After migration, this Git repository is the source of truth. Avoid editing production code directly in the Apps Script browser editor except for emergency recovery.

## Initial setup

1. Install Node.js 22 LTS and Git.
2. Enable the Google Apps Script API in your Google account.
3. Run `npm install`.
4. Run `npx clasp login`.
5. Copy `.clasp.json.example` to `.clasp.json`.
6. Replace the placeholder with the Script ID from Apps Script Project Settings.
7. Run `npx clasp pull`.
8. Move pulled Apps Script source files into `src/` if needed, then confirm `.clasp.json` has `"rootDir": "src"`.
9. Run `git add . && git commit -m "Baseline BVBOS v1.0 Brewing Operations"`.

## Daily workflow

```powershell
git pull
npx clasp pull
git status
# edit and test locally
npm run check
git add .
git commit -m "Describe the change"
npx clasp push
```

## Safe release workflow

```powershell
npm run check
git status
git tag -a v1.0.0 -m "BVBOS v1.0.0 Brewing Operations"
git push origin main --tags
npx clasp create-version "BVBOS v1.0.0 Brewing Operations"
npx clasp list-deployments
```

Use `npx clasp create-deployment --deploymentId DEPLOYMENT_ID --versionNumber VERSION_NUMBER --description "BVBOS v1.0.0 Brewing Operations"` to update the existing web-app deployment.

## Recovery

```powershell
git log --oneline
git checkout COMMIT_HASH -- src/
npx clasp push
```

# One-shot setup: clean out dead files, install dependencies, push to GitHub.
#
#   cd C:\Users\nivoz\SkiSense\Frontend
#   powershell -ExecutionPolicy Bypass -File .\setup-git.ps1
#
# Safe to re-run. Delete this file once the repo is up.

$ErrorActionPreference = 'Stop'
$repo = 'buldozerpvp/skisense-frontend'

function Step($text) { Write-Host "`n=== $text" -ForegroundColor Cyan }

# Make sure we're in the frontend, not somewhere surprising.
if (-not (Test-Path '.\package.json')) {
  Write-Host 'Run this from C:\Users\nivoz\SkiSense\Frontend' -ForegroundColor Red
  exit 1
}

Step 'Installing dependencies (adds the pg driver and updates package-lock.json)'
npm install
if ($LASTEXITCODE -ne 0) { Write-Host 'npm install failed - fix that first.' -ForegroundColor Red; exit 1 }

Step 'Removing files nothing imports any more'
# --ignore-unmatch so re-running, or a path already gone, is not an error.
git rm -r -q --ignore-unmatch lib/mongo app/api/brands
git rm -q --ignore-unmatch `
  lib/brands/mockData.ts `
  lib/query/useBrandsData.ts `
  lib/analytics/journey.ts `
  lib/analytics/parallelSets.ts
git rm -q --ignore-unmatch `
  components/charts/StatsSection.tsx `
  components/charts/PriceJourney.tsx `
  components/charts/RankLadder.tsx `
  components/charts/ParallelSets.tsx `
  components/charts/PriceHistoryLines.tsx `
  components/charts/KpiStrip.tsx `
  components/charts/SeasonCurve.tsx
# Screenshots stay on disk, they just leave the repo.
git rm -r -q --cached --ignore-unmatch 'Claude outputs'

Step 'Checking the app still builds'
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed - nothing pushed.' -ForegroundColor Red; exit 1 }

Step 'Committing'
git add -A
git commit -m "Remove dead files, add Postgres driver" --allow-empty | Out-Null

Step "Pushing to github.com/$repo"
git remote remove origin 2>$null | Out-Null
git remote add origin "https://github.com/$repo.git"
git branch -M main

# gh can create the repo itself; without it the repo must already exist.
$gh = Get-Command gh -ErrorAction SilentlyContinue
if ($gh) {
  gh repo view $repo *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating $repo as a private repo..."
    gh repo create $repo --private
  }
}

git push -u origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nPush failed. If it says the repository does not exist, create an EMPTY" -ForegroundColor Yellow
  Write-Host "repo named 'skisense-frontend' at https://github.com/new (no README," -ForegroundColor Yellow
  Write-Host 'no .gitignore, no licence) and run this script again.' -ForegroundColor Yellow
  exit 1
}

Write-Host "`nDone - https://github.com/$repo" -ForegroundColor Green
Write-Host 'Next: import it at vercel.com/new, then add Neon from the project Storage tab.'

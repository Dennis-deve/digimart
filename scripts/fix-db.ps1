<#
  DigiMart - one-shot database fix (run from the project root in VS Code PowerShell)

      .\scripts\fix-db.ps1

  1. Checks that .env exists and DATABASE_URL looks like a postgres URL.
  2. Tests the connection (read-only) and shows the table list.
  3. Applies only what is missing, inside a transaction per migration.

  It never runs `prisma migrate reset` and never drops anything.
#>
$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

Write-Host "Project root: $(Get-Location)" -ForegroundColor Cyan

if (-not (Test-Path '.env')) {
  Write-Host "`nNo .env file found here. Creating one from .env.template..." -ForegroundColor Yellow
  Copy-Item '.env.template' '.env'
  Write-Host "Open .env and paste your real DATABASE_URL + JWT_SECRET, then re-run this script." -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path 'node_modules\pg')) {
  Write-Host "`nnode_modules\pg missing - running npm install..." -ForegroundColor Yellow
  npm install
}

node scripts/db-check.mjs
$code = $LASTEXITCODE

if ($code -eq 2) {
  Write-Host "`nMissing migrations detected. Applying them now..." -ForegroundColor Yellow
  node scripts/db-check.mjs --apply
  $code = $LASTEXITCODE
}

if ($code -eq 0) {
  Write-Host "`nRegenerating Prisma Client..." -ForegroundColor Cyan
  npx prisma generate
  Write-Host "`nDone. Verify locally with: npm run dev  then open /api/health/database" -ForegroundColor Green
}

exit $code

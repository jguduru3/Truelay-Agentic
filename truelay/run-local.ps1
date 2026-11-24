# Run Truelay Agentic locally on Windows: http://localhost:3100
#
#   cd "D:\Truelay Agentic"; .\truelay\run-local.ps1
#
# - Creates and starts its own PostgreSQL on port 54331 (data in
#   ~/.paperclip-truelay-agentic, separate from any other Paperclip install).
#   `pnpm dev`'s built-in database launcher is not used: on Windows its
#   postmaster can exit right after starting, which hangs the startup.
# - Starts the app server with the web UI. Database migrations apply automatically.
# - Skips the native agent runner (needs Rust): the dashboard, Agent Studio and
#   all settings work, but agents do not execute tasks on this PC.
#
# Optional: enable the plain-English preview in Agent Studio first:
#   $env:ANTHROPIC_API_KEY = "sk-ant-..."
#
# Stop with Ctrl+C. The database keeps running; stop it with:
#   .\truelay\run-local.ps1 -StopDatabase

param(
  [switch]$StopDatabase,
  [switch]$DatabaseOnly,
  [string]$StateHome = (Join-Path $HOME ".paperclip-truelay-agentic"),
  [int]$DbPort = 54331
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$stateHome = $StateHome
$dataDir = Join-Path $stateHome "instances\default\db"
$pgPort = $DbPort
$pgPackage = Get-ChildItem (Join-Path $repo "node_modules\.pnpm") -Directory -Filter "@embedded-postgres+windows-x64@*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pgPackage) { throw "Dependencies are missing. Run 'pnpm install' in $repo first." }
$bin = Join-Path $pgPackage.FullName "node_modules\@embedded-postgres\windows-x64\native\bin"
$pgCtl = Join-Path $bin "pg_ctl.exe"
$pgLog = Join-Path $stateHome "postgres.log"

if ($StopDatabase) {
  & $pgCtl -D $dataDir stop -m fast
  exit $LASTEXITCODE
}

# 1. Create the database cluster on first run.
if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
  Write-Host "Creating a new database in $dataDir ..."
  New-Item -ItemType Directory -Force (Split-Path $dataDir) | Out-Null
  $pwFile = New-TemporaryFile
  try {
    Set-Content -Path $pwFile -Value "paperclip" -NoNewline -Encoding ascii
    & (Join-Path $bin "initdb.exe") -D $dataDir -U paperclip "--pwfile=$pwFile" -A scram-sha-256 -E UTF8 --no-locale
    if ($LASTEXITCODE -ne 0) { throw "initdb failed" }
  } finally {
    Remove-Item $pwFile -ErrorAction SilentlyContinue
  }
}

# 2. Start PostgreSQL unless it is already listening.
if (-not (Get-NetTCPConnection -LocalPort $pgPort -State Listen -ErrorAction SilentlyContinue)) {
  # A crash can leave a stale lock file behind; pg_ctl refuses to start with it.
  $pidFile = Join-Path $dataDir "postmaster.pid"
  if (Test-Path $pidFile) {
    $oldPid = [int](Get-Content $pidFile -TotalCount 1)
    if (-not (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) { Remove-Item $pidFile }
  }
  Write-Host "Starting the database on port $pgPort ..."
  & $pgCtl -D $dataDir -o "-p $pgPort" -l $pgLog -w -t 90 start
  if ($LASTEXITCODE -ne 0) { throw "The database did not start. See $pgLog" }
}

# 3. Make sure the 'paperclip' database exists.
node (Join-Path $PSScriptRoot "tools\ensure-db.mjs") $repo "postgres://paperclip:paperclip@127.0.0.1:$pgPort/postgres"
if ($LASTEXITCODE -ne 0) { throw "Could not reach the database on port $pgPort. See $pgLog" }

if ($DatabaseOnly) { Write-Host "Database ready on port $pgPort."; exit 0 }

# 4. Start the app.
$env:PAPERCLIP_HOME = $stateHome
$env:DATABASE_URL = "postgres://paperclip:paperclip@127.0.0.1:$pgPort/paperclip"
$env:PAPERCLIP_UI_DEV_MIDDLEWARE = "true"
$env:PAPERCLIP_MIGRATION_PROMPT = "never"
$env:PAPERCLIP_MIGRATION_AUTO_APPLY = "true"
$env:PORT = "3100"

Write-Host "Starting Truelay Agentic at http://localhost:3100 (Ctrl+C to stop) ..."
Set-Location (Join-Path $repo "server")
npx tsx src/index.ts

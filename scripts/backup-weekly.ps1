param(
  [string]$DatabasePath = "apps/backend/prisma/dev.db",
  [string]$BackupDir = "backups",
  [int]$KeepWeeks = 12
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dbFullPath = Join-Path $projectRoot $DatabasePath
$backupRoot = Join-Path $projectRoot $BackupDir

if (-not (Test-Path $dbFullPath)) {
  throw "Banco nao encontrado em: $dbFullPath"
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $backupRoot $timestamp
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# Copia arquivo principal e auxiliares do SQLite (quando existirem).
$filesToCopy = @(
  $dbFullPath,
  "$dbFullPath-wal",
  "$dbFullPath-shm"
)

foreach ($file in $filesToCopy) {
  if (Test-Path $file) {
    Copy-Item -Path $file -Destination $targetDir -Force
  }
}

$metaPath = Join-Path $targetDir "backup-info.txt"
@(
  "Projeto: GM Sistema",
  "Data backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "Banco origem: $dbFullPath",
  "Retencao (semanas): $KeepWeeks"
) | Set-Content -Path $metaPath -Encoding UTF8

$cutoff = (Get-Date).AddDays(-7 * $KeepWeeks)
Get-ChildItem -Path $backupRoot -Directory |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object { Remove-Item -Path $_.FullName -Recurse -Force }

Write-Output "Backup concluido em: $targetDir"

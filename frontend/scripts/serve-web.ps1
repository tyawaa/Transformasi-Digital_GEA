# Build versi web di origin yang diizinkan backend: http://localhost:8081.
# Pakai:  .\scripts\serve-web.ps1            (build ulang lalu jalankan)
#         .\scripts\serve-web.ps1 -NoBuild   (pakai build terakhir di dist/web)
# Hentikan dengan Ctrl+C.
param([switch]$NoBuild, [int]$Port = 8081)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $NoBuild -or -not (Test-Path "dist/web/index.html")) {
  Write-Host "Membuat build web (sekitar 1 menit)..."
  if (Test-Path "dist/web") { Remove-Item -Recurse -Force "dist/web" }
  & node node_modules/expo/bin/cli export --platform web --output-dir dist/web --max-workers 2
  if ($LASTEXITCODE -ne 0) { throw "Build web gagal." }
}

Write-Host ""
Write-Host "Buka http://localhost:$Port di browser. Tekan Ctrl+C untuk berhenti."
& python -m http.server $Port --directory dist/web

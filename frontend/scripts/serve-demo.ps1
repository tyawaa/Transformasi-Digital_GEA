# Jalankan demo mock di http://localhost:8081/demo.html; build API di dist/web tetap terpisah.
$ErrorActionPreference = "Stop"
$demoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $demoRoot
& npm.cmd run export:demo
if ($LASTEXITCODE -ne 0) { throw "Build demo gagal. Server belum dijalankan." }
Write-Host "Demo: http://localhost:8081/demo.html. Hentikan dengan Ctrl+C."
& python scripts/serve-preview.py --port 8081 --bind 127.0.0.1 --directory (Join-Path $demoRoot "dist/demo")
if ($LASTEXITCODE -ne 0) { throw "Server demo gagal. Periksa apakah port 8081 sedang dipakai." }

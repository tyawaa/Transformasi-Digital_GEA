$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $backendRoot '.local/photohunt-venv/Scripts/python.exe'
$artifactsPath = Join-Path $backendRoot '.local/photo-model'
$cachePath = Join-Path $backendRoot '.local/photo-model-cache'
$settingsPath = Join-Path $backendRoot '.local/photo-model.env'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Jalankan langkah instalasi photo-model pada README backend.' }
if (-not (Test-Path -LiteralPath (Join-Path $artifactsPath 'index.json'))) { throw 'Jalankan npm run photo:build terlebih dahulu.' }
if (-not (Test-Path -LiteralPath $settingsPath)) {
  $tokenBytes = New-Object byte[] 32
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $generator.GetBytes($tokenBytes)
  $generator.Dispose()
  $token = -join ($tokenBytes | ForEach-Object { $_.ToString('x2') })
  @("GEA_PHOTO_MODEL_URL=http://host.docker.internal:7860", "GEA_PHOTO_MODEL_TOKEN=$token") | Set-Content -LiteralPath $settingsPath -Encoding ascii
}
foreach ($line in Get-Content -LiteralPath $settingsPath) {
  if ($line.StartsWith('GEA_PHOTO_MODEL_TOKEN=')) { $env:GEA_PHOTO_MODEL_TOKEN = $line.Substring(22) }
}
if ([string]::IsNullOrWhiteSpace($env:GEA_PHOTO_MODEL_TOKEN)) { throw "Token model tidak ditemukan di $settingsPath" }
$env:HF_HUB_OFFLINE = '1'
Write-Output 'Buka http://127.0.0.1:7860 untuk mencoba pemeriksaan foto.'
Write-Output "Kunci akses uji dan konfigurasi backend tersimpan lokal di $settingsPath"
& $pythonPath -m gea_photo.cli serve --artifacts $artifactsPath --cache $cachePath --host 0.0.0.0 --port 7860
if ($LASTEXITCODE -ne 0) { throw "Layanan model berhenti dengan exit code $LASTEXITCODE" }

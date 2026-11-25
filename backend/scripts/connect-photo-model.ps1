param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z]{20}$')]
  [string]$ProjectRef
)

$ErrorActionPreference = 'Stop'
[string]$backendRoot = Split-Path -Parent $PSScriptRoot
[string]$tunnelPath = Join-Path $backendRoot '../frontend/node_modules/cloudflared/bin/cloudflared.exe'
[string]$cliPath = Join-Path $backendRoot 'node_modules/.bin/supabase.cmd'
[string]$settingsPath = Join-Path $backendRoot '.local/photo-model.env'
[string]$caPath = Join-Path $backendRoot '.local/trusted-roots.pem'
foreach ($requiredPath in @($tunnelPath, $cliPath, $settingsPath, $caPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) { throw "File yang diperlukan tidak ditemukan: $requiredPath" }
}
[object]$localHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:7860/health' -TimeoutSec 5
if ($localHealth.status -ne 'ready') { throw 'Jalankan npm run photo:serve sampai model siap.' }
[string[]]$tokenLines = @(Get-Content -LiteralPath $settingsPath | Where-Object { $_.StartsWith('GEA_PHOTO_MODEL_TOKEN=') })
if ($tokenLines.Count -ne 1) { throw "Harus ada tepat satu GEA_PHOTO_MODEL_TOKEN di $settingsPath" }
[string]$token = $tokenLines[0].Substring(22)
if ($token.Length -lt 32) { throw 'GEA_PHOTO_MODEL_TOKEN harus minimal 32 karakter.' }
[string]$runId = [guid]::NewGuid().ToString('N')
[string]$outputPath = Join-Path $backendRoot ".local/photo-tunnel-$runId.stdout.log"
[string]$errorPath = Join-Path $backendRoot ".local/photo-tunnel-$runId.stderr.log"
[string]$remoteSettingsPath = Join-Path $backendRoot ".local/photo-remote-$runId.env"
[System.Diagnostics.Process]$tunnelProcess = Start-Process -FilePath $tunnelPath -ArgumentList @(
  'tunnel', '--no-autoupdate', '--url', 'http://127.0.0.1:7860', '--protocol', 'quic', '--edge-ip-version', '4'
) -WorkingDirectory $backendRoot -WindowStyle Hidden -RedirectStandardOutput $outputPath -RedirectStandardError $errorPath -PassThru
[bool]$connected = $false
try {
  [string]$url = ''
  for ([int]$attempt = 0; $attempt -lt 120; $attempt++) {
    if ($tunnelProcess.HasExited) { throw "Tunnel berhenti. Periksa $errorPath" }
    [string]$logText = [string](Get-Content -LiteralPath $errorPath -Raw)
    [System.Text.RegularExpressions.Match]$match = [regex]::Match($logText, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $url = $match.Value; break }
    Start-Sleep -Milliseconds 500
  }
  if ([string]::IsNullOrWhiteSpace($url)) { throw "URL tunnel belum tersedia setelah 60 detik. Periksa $errorPath" }
  [string]$remoteHealthJson = & curl.exe --silent --show-error --fail --cacert $caPath --connect-timeout 5 --max-time 10 --retry 5 --retry-delay 2 --retry-all-errors "$url/health"
  if ($LASTEXITCODE -ne 0) { throw "Pemeriksaan model melalui $url gagal. Periksa $errorPath" }
  [object]$remoteHealth = $remoteHealthJson | ConvertFrom-Json
  if ($remoteHealth.status -ne 'ready') { throw "Model belum siap melalui $url : $remoteHealthJson" }
  @("GEA_PHOTO_MODEL_URL=$url", "GEA_PHOTO_MODEL_TOKEN=$token") | Set-Content -LiteralPath $remoteSettingsPath -Encoding ascii
  $env:NODE_EXTRA_CA_CERTS = $caPath
  $env:SSL_CERT_FILE = $caPath
  & $cliPath secrets set "--remote=$ProjectRef" --env-file $remoteSettingsPath --yes
  if ($LASTEXITCODE -ne 0) { throw "Penyimpanan secret Supabase gagal untuk proyek $ProjectRef." }
  $connected = $true
  Write-Output "Model tersambung: $url"
  Write-Output "Tunnel PID: $($tunnelProcess.Id). Biarkan laptop dan npm run photo:serve tetap berjalan."
  Write-Output "Hentikan tunnel dengan Stop-Process -Id $($tunnelProcess.Id). Jalankan skrip ini lagi setelah tunnel berhenti agar URL pada Supabase diperbarui."
} finally {
  if (Test-Path -LiteralPath $remoteSettingsPath) { Remove-Item -LiteralPath $remoteSettingsPath }
  if (-not $connected -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id }
}

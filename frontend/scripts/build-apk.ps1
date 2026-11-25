param(
  [Parameter(Mandatory = $true)]
  [string]$AndroidSdkPath,
  [Parameter(Mandatory = $true)]
  [ValidateSet('arm64-v8a', 'x86_64', 'arm64-v8a,x86_64')]
  [string]$Architectures
)

$ErrorActionPreference = 'Stop'
[string]$frontendRoot = Split-Path -Parent $PSScriptRoot
[string]$assetsRoot = Join-Path $frontendRoot 'modules/gea-photo-model/android/src/main/assets/gea_photo'
foreach ($name in @('model.onnx', 'features.bin', 'manifest.json')) {
  if (-not (Test-Path -LiteralPath (Join-Path $assetsRoot $name))) { throw 'Aset model belum lengkap. Jalankan npm run photo:mobile dari direktori backend.' }
}
[object]$manifest = Get-Content -LiteralPath (Join-Path $assetsRoot 'manifest.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath (Join-Path $assetsRoot 'model.onnx') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.modelSha256) { throw 'Checksum model tidak sesuai manifest. Ekspor ulang model Android.' }
if ((Get-FileHash -LiteralPath (Join-Path $assetsRoot 'features.bin') -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.featuresSha256) { throw 'Checksum referensi tidak sesuai manifest. Ekspor ulang model Android.' }
if (-not (Test-Path -LiteralPath (Join-Path $AndroidSdkPath 'platform-tools/adb.exe'))) { throw "Android SDK tidak ditemukan: $AndroidSdkPath" }
[string]$previousSdk = $env:ANDROID_HOME
[string]$previousCi = $env:CI
[string]$previousNodeEnv = $env:NODE_ENV
[string]$previousJavaOptions = $env:JAVA_TOOL_OPTIONS
[string]$previousJavaHome = $env:JAVA_HOME
[string]$previousNodeCa = $env:NODE_EXTRA_CA_CERTS
Push-Location $frontendRoot
try {
  $env:ANDROID_HOME = (Resolve-Path -LiteralPath $AndroidSdkPath).Path
  $env:CI = '1'
  $env:NODE_ENV = 'production'
  [string]$projectJdkSettings = Join-Path $frontendRoot '../backend/.local/android-toolchain/jdk17.json'
  if (Test-Path -LiteralPath $projectJdkSettings) {
    [object]$projectJdk = Get-Content -LiteralPath $projectJdkSettings -Raw | ConvertFrom-Json
    if (-not (Test-Path -LiteralPath (Join-Path $projectJdk.javaHome 'bin/java.exe'))) { throw 'JDK proyek tidak ditemukan. Periksa backend/.local/android-toolchain/jdk17.json.' }
    $env:JAVA_HOME = $projectJdk.javaHome
    Write-Output "Menggunakan JDK proyek: $($projectJdk.javaHome)"
  }
  [string]$projectTrustStore = Join-Path $frontendRoot '../backend/.local/android-build-cacerts.p12'
  [string]$projectCa = Join-Path $frontendRoot '../backend/.local/trusted-roots.pem'
  if (Test-Path -LiteralPath $projectTrustStore) {
    $env:JAVA_TOOL_OPTIONS = "$previousJavaOptions -Djavax.net.ssl.trustStore=`"$((Resolve-Path -LiteralPath $projectTrustStore).Path)`" -Djavax.net.ssl.trustStorePassword=changeit"
    Write-Output 'Menggunakan CA proyek untuk verifikasi TLS Gradle.'
  }
  if (Test-Path -LiteralPath $projectCa) { $env:NODE_EXTRA_CA_CERTS = (Resolve-Path -LiteralPath $projectCa).Path }
  & './node_modules/.bin/expo.cmd' prebuild --platform android --no-clean --no-install
  if ($LASTEXITCODE -ne 0) { throw 'Pembuatan proyek Android gagal.' }
  [string]$wrapperPath = Join-Path $frontendRoot 'android/gradle/wrapper/gradle-wrapper.properties'
  [string]$wrapperText = Get-Content -LiteralPath $wrapperPath -Raw
  $wrapperText.Replace('networkTimeout=10000', 'networkTimeout=120000') | Set-Content -LiteralPath $wrapperPath -Encoding ascii
  Push-Location (Join-Path $frontendRoot 'android')
  try {
    & './gradlew.bat' app:assembleRelease --no-daemon --max-workers=2 "-PreactNativeArchitectures=$Architectures" --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Build APK Android gagal. Periksa error Gradle di atas.' }
  } finally { Pop-Location }
  [string]$destination = Join-Path $frontendRoot 'dist/apk'
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  [string]$apk = Join-Path $destination 'GEA-photo-offline.apk'
  Copy-Item -LiteralPath (Join-Path $frontendRoot 'android/app/build/outputs/apk/release/app-release.apk') -Destination $apk
  Write-Output "APK uji siap: $apk"
  Write-Output "Model: $($manifest.modelVersion). Ditandatangani dengan kunci development lokal; belum untuk Google Play."
  Get-FileHash -LiteralPath $apk -Algorithm SHA256
} finally {
  Pop-Location
  $env:ANDROID_HOME = $previousSdk
  $env:CI = $previousCi
  $env:NODE_ENV = $previousNodeEnv
  $env:JAVA_TOOL_OPTIONS = $previousJavaOptions
  $env:JAVA_HOME = $previousJavaHome
  $env:NODE_EXTRA_CA_CERTS = $previousNodeCa
}

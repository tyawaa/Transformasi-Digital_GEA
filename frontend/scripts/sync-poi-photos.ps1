# Salin foto survei POI ke aplikasi (diperkecil) dan buat daftar fotonya.
#
# Pakai (PowerShell, dari folder frontend):
#   .\scripts\sync-poi-photos.ps1                     # sumber bawaan: ..\..\POI
#   .\scripts\sync-poi-photos.ps1 -Source "D:\Foto\POI"
#
# Struktur sumber: <Source>\P01\*.jpg, <Source>\P02\*.jpg, ... (urut sesuai nama file).
# Hasil (keduanya TIDAK masuk Git, lihat .gitignore):
#   assets/poi/P01/00.jpg, 01.jpg, ...       foto lebar maks. 1200 px
#   src/data/poiPhotos.local.ts              daftar require() per kode POI
# Tanpa hasil ini aplikasi tetap jalan dan memakai ilustrasi sementara.
param(
  [string]$Source = (Join-Path $PSScriptRoot "..\..\..\POI"),
  [int]$MaxSize = 1200,
  [long]$Quality = 82
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = (Resolve-Path $Source).Path
$outDir = Join-Path $root "assets\poi"
$listFile = Join-Path $root "src\data\poiPhotos.local.ts"

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)

function Save-Resized([string]$from, [string]$to) {
  $img = [System.Drawing.Image]::FromFile($from)
  try {
    # Foto HP menyimpan arah putar di EXIF (tag 0x0112); terapkan agar foto tidak miring.
    if ($img.PropertyIdList -contains 0x0112) {
      $o = $img.GetPropertyItem(0x0112).Value[0]
      switch ($o) {
        3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
        6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
        8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
      }
    }
    $scale = [Math]::Min(1.0, $MaxSize / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Round($img.Width * $scale)
    $h = [int][Math]::Round($img.Height * $scale)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    try {
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $w, $h)
      $g.Dispose()
      $bmp.Save($to, $codec, $params)
    } finally { $bmp.Dispose() }
  } finally { $img.Dispose() }
}

if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Force $outDir | Out-Null

$lines = @(
  "// DIBUAT OTOMATIS oleh scripts/sync-poi-photos.ps1. Jangan diedit; tidak masuk Git.",
  "export const poiPhotos: { readonly [code: string]: readonly number[] } = {"
)
$total = 0
Get-ChildItem -Directory $source | Where-Object { $_.Name -match '^P\d{2}$' } | Sort-Object Name | ForEach-Object {
  $code = $_.Name.ToUpper()
  $files = Get-ChildItem -File $_.FullName | Where-Object { $_.Extension -match '^\.(jpe?g|png)$' } | Sort-Object Name
  if ($files.Count -eq 0) { return }
  $dir = Join-Path $outDir $code
  New-Item -ItemType Directory -Force $dir | Out-Null
  $requires = @()
  $i = 0
  foreach ($f in $files) {
    $name = "{0:D2}.jpg" -f $i
    Save-Resized $f.FullName (Join-Path $dir $name)
    $requires += "    require(""../../assets/poi/$code/$name"") as number,  // $($f.Name)"
    $i++
  }
  $lines += "  $($code): ["
  $lines += $requires
  $lines += "  ],"
  $total += $i
  Write-Host "$code : $i foto"
}
$lines += "};"
Set-Content -Path $listFile -Value $lines -Encoding utf8
Write-Host ""
Write-Host "Selesai: $total foto ke assets/poi, daftar di src/data/poiPhotos.local.ts"

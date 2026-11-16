param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Output,
  [Parameter(Mandatory = $true)][int]$MaxSize,
  [Parameter(Mandatory = $true)][long]$Quality
)

$ErrorActionPreference = 'Stop'
if ($MaxSize -lt 1 -or $Quality -lt 1 -or $Quality -gt 100) {
  throw 'MaxSize harus positif dan Quality harus 1 sampai 100.'
}
Add-Type -AssemblyName System.Drawing
$sourceRoot = (Resolve-Path -LiteralPath $Source).Path
$outputRoot = [System.IO.Path]::GetFullPath($Output)
if ($outputRoot -eq $sourceRoot -or $outputRoot.StartsWith($sourceRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Output harus berada di luar folder aset asli.'
}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)

try {
  foreach ($folder in Get-ChildItem -LiteralPath $sourceRoot -Directory | Sort-Object Name) {
    if ($folder.Name -notmatch '^P(0[1-9]|1[0-9]|20)$') { throw "Folder POI tidak dikenal: $($folder.FullName)" }
    $destination = Join-Path $outputRoot $folder.Name
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    foreach ($file in Get-ChildItem -LiteralPath $folder.FullName -File) {
      if ($file.Name -notmatch '^([1-9][0-9]*)(-[a-zA-Z0-9_-]+)?\.(jpe?g|png)$') { throw "Nama gambar tidak valid: $($file.FullName)" }
      $image = [System.Drawing.Image]::FromFile($file.FullName)
      try {
        if ($image.PropertyIdList -contains 0x0112) {
          switch ($image.GetPropertyItem(0x0112).Value[0]) {
            2 { $image.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
            3 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            4 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
            5 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
            6 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            7 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
            8 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
          }
        }
        $scale = [Math]::Min(1.0, $MaxSize / [Math]::Max($image.Width, $image.Height))
        $bitmap = New-Object System.Drawing.Bitmap([int][Math]::Round($image.Width * $scale), [int][Math]::Round($image.Height * $scale))
        try {
          $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
          try {
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.DrawImage($image, 0, 0, $bitmap.Width, $bitmap.Height)
          } finally { $graphics.Dispose() }
          $bitmap.Save((Join-Path $destination ($file.BaseName + '.jpg')), $codec, $encoderParameters)
        } finally { $bitmap.Dispose() }
      } finally { $image.Dispose() }
    }
    Write-Output (@{ event = 'poi_images_prepared'; poi = $folder.Name } | ConvertTo-Json -Compress)
  }
} finally { $encoderParameters.Dispose() }

# Generate VAPID keys into vapid-keys.local.txt (do not commit that file)
# Run: powershell -ExecutionPolicy Bypass -File scripts/generate-vapid.ps1
# Works on Windows PowerShell 5.1 (.NET Framework)

$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([byte[]]$bytes) {
  [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Get-FixedBytes([byte[]]$bytes, [int]$size) {
  if ($null -eq $bytes) { throw "Missing EC parameter bytes" }
  if ($bytes.Length -eq $size) { return $bytes }
  if ($bytes.Length -gt $size) {
    # Drop leading zeros
    return $bytes[($bytes.Length - $size)..($bytes.Length - 1)]
  }
  $padded = New-Object byte[] $size
  [Array]::Copy($bytes, 0, $padded, $size - $bytes.Length, $bytes.Length)
  return $padded
}

$creation = New-Object System.Security.Cryptography.CngKeyCreationParameters
$creation.ExportPolicy = [System.Security.Cryptography.CngExportPolicies]::AllowPlaintextExport

$key = [System.Security.Cryptography.CngKey]::Create(
  [System.Security.Cryptography.CngAlgorithm]::ECDsaP256,
  $null,
  $creation
)

try {
  $ecdsa = New-Object System.Security.Cryptography.ECDsaCng($key)
  try {
    $p = $ecdsa.ExportParameters($true)
  } finally {
    $ecdsa.Dispose()
  }
} finally {
  $key.Dispose()
}

$x = Get-FixedBytes $p.Q.X 32
$y = Get-FixedBytes $p.Q.Y 32
$d = Get-FixedBytes $p.D 32

$pubRaw = New-Object byte[] 65
$pubRaw[0] = 0x04
[Array]::Copy($x, 0, $pubRaw, 1, 32)
[Array]::Copy($y, 0, $pubRaw, 33, 32)

$publicB64 = ConvertTo-Base64Url $pubRaw
$privateB64 = ConvertTo-Base64Url $d

$outPath = Join-Path (Get-Location) "vapid-keys.local.txt"
$lines = @(
  "# VAPID keys - do not commit this file to Git"
  ""
  "# Add to Vercel Environment Variables:"
  "VITE_VAPID_PUBLIC_KEY=$publicB64"
  ""
  "# Add to Supabase Function secrets (not the frontend):"
  "VAPID_PUBLIC_KEY=$publicB64"
  "VAPID_PRIVATE_KEY=$privateB64"
  "VAPID_SUBJECT=mailto:admin@example.com"
  ""
)
[System.IO.File]::WriteAllLines($outPath, $lines)

Write-Host "Created: vapid-keys.local.txt"
Write-Host "Copy VITE_VAPID_PUBLIC_KEY to Vercel."
Write-Host "Copy VAPID_* to Supabase Function secrets."

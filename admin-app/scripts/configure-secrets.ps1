$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $appRoot '.env'

function ConvertFrom-SecureInput {
  param([Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

Write-Host 'Credentials stay in the ignored local .env file and are never printed.'
$shopifySecure = Read-Host 'Paste the Shopify client secret from Dev Dashboard > Settings' -AsSecureString
$sealSecure = Read-Host 'Paste the Seal token from Seal > Settings > General Settings > API' -AsSecureString
$shopifySecret = ConvertFrom-SecureInput $shopifySecure
$sealToken = ConvertFrom-SecureInput $sealSecure

if ([string]::IsNullOrWhiteSpace($shopifySecret)) { throw 'Shopify client secret cannot be empty.' }
if ([string]::IsNullOrWhiteSpace($sealToken)) { throw 'Seal API token cannot be empty.' }
if ($shopifySecret -match '[\r\n]' -or $sealToken -match '[\r\n]') { throw 'Credentials cannot contain line breaks.' }

$contents = @(
  'SHOPIFY_STORE=fxeic1-in.myshopify.com'
  'SHOPIFY_CLIENT_ID=8d89f55b6866ada27e0d2b83407b79a6'
  "SHOPIFY_CLIENT_SECRET=$shopifySecret"
  'SHOPIFY_ADMIN_ACCESS_TOKEN='
  'SHOPIFY_GRANTED_SCOPES='
  'SHOPIFY_API_VERSION=2026-07'
  "SEAL_API_TOKEN=$sealToken"
  'SEAL_API_BASE_URL=https://app.sealsubscriptions.com/shopify/merchant/api'
) -join "`n"

[IO.File]::WriteAllText($envPath, "$contents`n", [Text.UTF8Encoding]::new($false))
$shopifySecret = $null
$sealToken = $null
Write-Host "Saved credentials securely to $envPath"
Write-Host 'Starting the one-time Shopify authorization...'
& npm.cmd run shopify:auth

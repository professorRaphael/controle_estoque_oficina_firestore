# Execute no PowerShell a partir da pasta que contém este arquivo.
# Este script cria um projeto novo; não altera projetos existentes.
$ErrorActionPreference = 'Stop'
$destino = Join-Path (Get-Location) 'estoque-oficina'
if (Test-Path $destino) {
  throw 'A pasta estoque-oficina já existe. Escolha outra pasta para evitar sobrescrever arquivos.'
}

npx create-expo-app@latest estoque-oficina --template blank-typescript
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar projeto Expo.' }
Push-Location $destino
try {
  npx expo install firebase
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar Firebase.' }
  Copy-Item (Join-Path $PSScriptRoot 'App.tsx') (Join-Path $destino 'App.tsx')
  Copy-Item (Join-Path $PSScriptRoot 'src') (Join-Path $destino 'src') -Recurse -Force
  Copy-Item (Join-Path $PSScriptRoot '.env.example') (Join-Path $destino '.env')
  Copy-Item (Join-Path $PSScriptRoot 'firestore.rules') (Join-Path $destino 'firestore.rules')
  Copy-Item (Join-Path $PSScriptRoot 'tests') (Join-Path $destino 'tests') -Recurse -Force
  Write-Host 'Projeto preparado. Configure .env e publique firestore.rules na Firebase Console.'
  Write-Host 'Depois execute: cd estoque-oficina ; npx expo start --clear'
} finally { Pop-Location }

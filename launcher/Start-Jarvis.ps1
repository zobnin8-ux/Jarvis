# Jarvis HUD launcher — starts production server hidden, opens browser.
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Port = 3001
$Url = "http://localhost:$Port"

function Show-Error([string]$Message) {
  [System.Windows.Forms.MessageBox]::Show($Message, "Jarvis", "OK", "Error") | Out-Null
}

function Get-NpmPath {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $fallback = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"
  if (Test-Path $fallback) {
    return $fallback
  }
  return $null
}

function Get-LocalBuildId {
  $path = Join-Path $ProjectRoot ".next\BUILD_ID"
  if (-not (Test-Path $path)) {
    return $null
  }
  return (Get-Content $path -Raw).Trim()
}

function Get-DashboardProbeChunk {
  $manifestPath = Join-Path $ProjectRoot ".next\react-loadable-manifest.json"
  if (-not (Test-Path $manifestPath)) {
    return $null
  }

  try {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $entry = $manifest.'components\ClientDashboard.tsx -> @/layout/DashboardLayout'
    if (-not $entry) {
      return $null
    }

    foreach ($file in $entry.files) {
      if ($file -like "static/chunks/*.js") {
        return $file
      }
    }
  } catch {
    return $null
  }

  return $null
}

function Test-ServerBuildFresh {
  $chunk = Get-DashboardProbeChunk
  if (-not $chunk) {
    return $true
  }

  try {
    $response = Invoke-WebRequest -Uri "$Url/_next/$chunk" -Method Head -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-ServerListening {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
}

function Stop-JarvisServer {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }

  foreach ($conn in $connections) {
    if ($conn.OwningProcess -gt 0) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }

  Start-Sleep -Milliseconds 800
}

function Wait-ForServer {
  param([int]$TimeoutSec = 90)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -eq 200) {
        return $true
      }
    } catch {
      Start-Sleep -Milliseconds 600
    }
  }
  return $false
}

function Get-ChromePath {
  $paths = @(
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles} "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe")
  )
  foreach ($path in $paths) {
    if ($path -and (Test-Path $path)) {
      return $path
    }
  }
  return $null
}

function Open-JarvisBrowser([string]$TargetUrl) {
  $chrome = Get-ChromePath
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList @($TargetUrl, "--new-window")
    return
  }
  Start-Process $TargetUrl
}

function Start-JarvisServer([string]$NpmPath) {
  $nextDir = Join-Path $ProjectRoot ".next"
  if (-not (Test-Path $nextDir)) {
    Show-Error "Сначала собери проект:`n`ncd D:\Jarvis`nnpm run build"
    exit 1
  }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $NpmPath
  $psi.Arguments = "start"
  $psi.WorkingDirectory = $ProjectRoot
  $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
  $psi.CreateNoWindow = $true
  $psi.UseShellExecute = $false

  [System.Diagnostics.Process]::Start($psi) | Out-Null
}

function Ensure-JarvisServer([string]$NpmPath) {
  if (-not (Get-LocalBuildId)) {
    Show-Error "Сначала собери проект:`n`ncd D:\Jarvis`nnpm run build"
    exit 1
  }

  $needsStart = -not (Test-ServerListening)
  if (-not $needsStart -and -not (Test-ServerBuildFresh)) {
    Stop-JarvisServer
    $needsStart = $true
  }

  if ($needsStart) {
    Start-JarvisServer $NpmPath
    if (-not (Wait-ForServer)) {
      Show-Error "Сервер не поднялся за 90 с.`nПроверь порт $Port или запусти:`nnpm start"
      exit 1
    }

    if (-not (Test-ServerBuildFresh)) {
      Show-Error "Server stale after build.`nRun: npm run build`nnpm start"
      exit 1
    }
  }
}

$npmPath = Get-NpmPath
if (-not $npmPath) {
  Show-Error "Node.js / npm не найден.`nУстанови Node с https://nodejs.org"
  exit 1
}

Ensure-JarvisServer $npmPath
Open-JarvisBrowser $Url

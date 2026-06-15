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

function Test-ServerListening {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $conn
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

$npmPath = Get-NpmPath
if (-not $npmPath) {
  Show-Error "Node.js / npm не найден.`nУстанови Node с https://nodejs.org"
  exit 1
}

if (-not (Test-ServerListening)) {
  Start-JarvisServer $npmPath
  if (-not (Wait-ForServer)) {
    Show-Error "Сервер не поднялся за 90 с.`nПроверь порт $Port или запусти:`nnpm start"
    exit 1
  }
}

Start-Process $Url

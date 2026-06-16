# Creates Jarvis.lnk in project root (+ tries Desktop via VBS)
$ErrorActionPreference = "Stop"

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path $LauncherDir -Parent
$ExePath = Join-Path $LauncherDir "Jarvis.exe"
$VbsPath = Join-Path $LauncherDir "Jarvis.vbs"

if (Test-Path $VbsPath) {
  $Target = $VbsPath
} elseif (Test-Path $ExePath) {
  $Target = $ExePath
} else {
  Write-Error "Nothing to launch. Run: npm run launcher:build"
  exit 1
}

function New-Shortcut([string]$LinkPath, [string]$TargetPath) {
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut($LinkPath)
  $link.TargetPath = $TargetPath
  $link.WorkingDirectory = $LauncherDir
  $link.Description = "Jarvis Command Center"
  $link.Save()
}

$ProjectShortcut = Join-Path $ProjectRoot "Jarvis.lnk"
New-Shortcut $ProjectShortcut $Target
Write-Host "Shortcut:" $ProjectShortcut

$cscript = Join-Path $env:SystemRoot "System32\cscript.exe"
$helper = Join-Path $LauncherDir "create-shortcut.vbs"
if (Test-Path $helper) {
  try {
    & $cscript //Nologo $helper *> $null
    Write-Host "Desktop shortcut: OK"
  } catch {
    Write-Host "Desktop: drag D:\Jarvis\Jarvis.lnk to your Desktop (OneDrive path issue)"
  }
}

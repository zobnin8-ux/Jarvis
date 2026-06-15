Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktop = shell.SpecialFolders("Desktop")
exePath = launcherDir & "\Jarvis.exe"
vbsPath = launcherDir & "\Jarvis.vbs"

If fso.FileExists(exePath) Then
  target = exePath
ElseIf fso.FileExists(vbsPath) Then
  target = vbsPath
Else
  WScript.Echo "Run npm run launcher:build first"
  WScript.Quit 1
End If

Set sc = shell.CreateShortcut(desktop & "\Jarvis.lnk")
sc.TargetPath = target
sc.WorkingDirectory = launcherDir
sc.Description = "Jarvis Command Center"
sc.Save

WScript.Echo "Shortcut created on Desktop"

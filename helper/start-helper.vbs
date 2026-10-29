' DESK: at login (Startup folder), no window: re-read desktop -> start helper
' argument "nowait" = right after install (skip re-read, start helper only)
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ps = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "
If WScript.Arguments.Count = 0 Then sh.Run ps & """" & dir & "\rescan.ps1"" -Login", 0, True
sh.Run ps & """" & dir & "\helper.ps1""", 0, False

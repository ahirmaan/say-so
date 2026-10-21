' Starts Say.so with no visible terminal/console window.
' Double-click this to launch the app silently - the pill and tray icon
' still work exactly the same. All terminal output (including errors) goes
' to logs\sayso.log instead of a visible window, since there isn't one.
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
baseDir = "C:\Users\sorat\Downloads\Say.so"
logDir = baseDir & "\logs"
If Not objFSO.FolderExists(logDir) Then
  objFSO.CreateFolder(logDir)
End If
objShell.CurrentDirectory = baseDir
objShell.Run "cmd /c npm start > """ & logDir & "\sayso.log"" 2>&1", 0, False

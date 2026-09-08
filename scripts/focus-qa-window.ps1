param([Parameter(Mandatory=$true)][long]$WindowHandle)
# Test-only: activate the isolated application's known HWND. No other window is changed.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class QaWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr process);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint from, uint to, bool attach);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr window);
}
'@
$targetWindow = [IntPtr]::new($WindowHandle)
$foregroundThread = [QaWindow]::GetWindowThreadProcessId([QaWindow]::GetForegroundWindow(), [IntPtr]::Zero)
$qaThread = [QaWindow]::GetCurrentThreadId()
$attached = [QaWindow]::AttachThreadInput($qaThread, $foregroundThread, $true)
try {
  [void][QaWindow]::BringWindowToTop($targetWindow)
  [void][QaWindow]::SetForegroundWindow($targetWindow)
} finally {
  if ($attached) { [void][QaWindow]::AttachThreadInput($qaThread, $foregroundThread, $false) }
}
if ([QaWindow]::GetForegroundWindow() -ne $targetWindow) { throw 'QA window could not acquire Windows foreground focus.' }

# Persistent, hidden Windows input helper. Protocol: UTF-8 JSON lines only.
# Package as extraResources: { from: "electron/native/input.ps1", to: "native/input.ps1" }.
# -CompileOnly is for syntax/type checks and does not touch windows or clipboard.
param([switch]$CompileOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, WindowsBase, System.Web.Extensions
$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Automation;

namespace OrbitvoiceInput {
    public sealed class Target {
        public string window, focus, processStart, uia, capturedAt;
        public uint pid, thread, focusPid;
    }
    public sealed class Format {
        public uint id;
        public string name, data, kind;
    }
    public sealed class Snapshot {
        public uint sequence;
        public List<Format> formats;
    }
    public sealed class Request {
        public long id;
        public string op, text, marker;
        public Target target;
        public uint sequence;
        public List<Format> formats;
    }
    public sealed class InputFailure : Exception {
        public string Code;
        public object Details;
        public InputFailure(string code, string message, object details = null) : base(message) {
            Code = code; Details = details;
        }
    }

    public static class Helper {
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }
        [StructLayout(LayoutKind.Sequential)] struct POINT { public int x, y; }
        [StructLayout(LayoutKind.Sequential)] struct MSG {
            public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam;
            public uint time; public POINT point; public uint lPrivate;
        }
        [StructLayout(LayoutKind.Sequential)] struct GUITHREADINFO {
            public uint cbSize, flags;
            public IntPtr hwndActive, hwndFocus, hwndCapture, hwndMenuOwner, hwndMoveSize, hwndCaret;
            public RECT rcCaret;
        }
        [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT {
            public int dx, dy; public uint mouseData, dwFlags, time; public UIntPtr dwExtraInfo;
        }
        [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT {
            public ushort wVk, wScan; public uint dwFlags, time; public UIntPtr dwExtraInfo;
        }
        [StructLayout(LayoutKind.Explicit)] struct INPUTUNION {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
        }
        // The mouse member forces the union to the correct size on x86 AND x64.
        [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public INPUTUNION data; }
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll", SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
        [DllImport("user32.dll", SetLastError=true)] static extern bool GetGUIThreadInfo(uint thread, ref GUITHREADINFO info);
        [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
        [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr window);
        [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder name, int count);
        [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetWindowLong(IntPtr window, int index);
        [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
        [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
        [DllImport("kernel32.dll")] static extern void SetLastError(uint error);
        [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateWindowEx(
            uint exStyle, string className, string title, uint style, int x, int y, int width, int height,
            IntPtr parent, IntPtr menu, IntPtr instance, IntPtr param);
        [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr window);
        [DllImport("user32.dll")] static extern int GetMessage(out MSG message, IntPtr window, uint min, uint max);
        [DllImport("user32.dll")] static extern bool TranslateMessage(ref MSG message);
        [DllImport("user32.dll")] static extern IntPtr DispatchMessage(ref MSG message);
        [DllImport("user32.dll")] static extern bool PostThreadMessage(uint thread, uint message, UIntPtr wParam, IntPtr lParam);
        [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
        [DllImport("user32.dll", SetLastError=true)] static extern bool OpenClipboard(IntPtr owner);
        [DllImport("user32.dll")] static extern bool CloseClipboard();
        [DllImport("user32.dll", SetLastError=true)] static extern bool EmptyClipboard();
        [DllImport("user32.dll")] static extern uint GetClipboardSequenceNumber();
        [DllImport("user32.dll")] static extern IntPtr GetClipboardOwner();
        [DllImport("user32.dll")] static extern bool IsClipboardFormatAvailable(uint format);
        [DllImport("user32.dll", SetLastError=true)] static extern uint EnumClipboardFormats(uint format);
        [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClipboardFormatName(uint format, StringBuilder name, int count);
        [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern uint RegisterClipboardFormat(string name);
        [DllImport("user32.dll", SetLastError=true)] static extern IntPtr GetClipboardData(uint format);
        [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetClipboardData(uint format, IntPtr data);
        [DllImport("kernel32.dll", SetLastError=true)] static extern UIntPtr GlobalSize(IntPtr memory);
        [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr GlobalLock(IntPtr memory);
        [DllImport("kernel32.dll")] static extern bool GlobalUnlock(IntPtr memory);
        [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr GlobalAlloc(uint flags, UIntPtr size);
        [DllImport("kernel32.dll")] static extern IntPtr GlobalFree(IntPtr memory);
        [DllImport("gdi32.dll")] static extern uint GetEnhMetaFileBits(IntPtr handle, uint size, byte[] data);
        [DllImport("gdi32.dll")] static extern IntPtr SetEnhMetaFileBits(uint size, byte[] data);
        [DllImport("gdi32.dll")] static extern bool DeleteEnhMetaFile(IntPtr handle);

        const int MaxClipboardBytes = 32 * 1024 * 1024;
        static IntPtr owner;
        static Thread ownerThread;
        static uint ownerThreadId;
        static uint markerFormat;
        static Snapshot lastSnapshot;
        static Request active;
        static DateTime activeSince;
        static JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 96 * 1024 * 1024 };

        static InputFailure Fail(string code, string message) { return new InputFailure(code, message); }
        static void LockClipboard() {
            for (int i = 0; i < 20; i++) {
                if (OpenClipboard(owner)) return;
                Thread.Sleep(15);
            }
            throw Fail("CLIPBOARD_BUSY", "Another application is using the clipboard. Wait a moment and retry the saved transcript.");
        }
        static byte[] ReadGlobal(IntPtr handle) {
            ulong size = GlobalSize(handle).ToUInt64();
            if (handle == IntPtr.Zero || size == 0 || size > MaxClipboardBytes)
                throw Fail("CLIPBOARD_UNSUPPORTED", "The clipboard contains data that cannot be safely preserved. Save or clear it, then retry the saved transcript.");
            IntPtr data = GlobalLock(handle);
            if (data == IntPtr.Zero) throw Fail("CLIPBOARD_UNSUPPORTED", "Windows could not read a clipboard format safely. Copy the saved transcript manually.");
            try {
                byte[] result = new byte[(int)size];
                Marshal.Copy(data, result, 0, result.Length);
                return result;
            } finally { GlobalUnlock(handle); }
        }
        static IntPtr Allocate(byte[] bytes) {
            IntPtr memory = GlobalAlloc(0x0042, (UIntPtr)bytes.Length); // MOVEABLE | ZEROINIT
            if (memory == IntPtr.Zero) throw Fail("CLIPBOARD_MEMORY", "Windows could not allocate clipboard memory.");
            IntPtr pointer = GlobalLock(memory);
            if (pointer == IntPtr.Zero) { GlobalFree(memory); throw Fail("CLIPBOARD_MEMORY", "Windows could not lock clipboard memory."); }
            try { Marshal.Copy(bytes, 0, pointer, bytes.Length); }
            finally { GlobalUnlock(memory); }
            return memory;
        }
        static Snapshot SnapshotClipboard() {
            LockClipboard();
            try {
                List<uint> ids = new List<uint>();
                uint id = 0;
                while (true) {
                    SetLastError(0);
                    id = EnumClipboardFormats(id);
                    if (id == 0) {
                        if (Marshal.GetLastWin32Error() != 0) throw Fail("CLIPBOARD_READ", "Windows could not enumerate every clipboard format.");
                        break;
                    }
                    ids.Add(id);
                }
                List<Format> formats = new List<Format>();
                long total = 0;
                foreach (uint format in ids) {
                    // A bitmap handle is not HGLOBAL. Windows recreates CF_BITMAP
                    // from CF_DIB/CF_DIBV5, preserving pixels without a stale handle.
                    if (format == 2 && (ids.Contains(8) || ids.Contains(17))) continue;
                    if (format == 2 || format == 3 || format == 9 || (format >= 0x80 && format <= 0x8e) ||
                        (format >= 0x200 && format <= 0x3ff))
                        throw Fail("CLIPBOARD_UNSUPPORTED", "The clipboard contains an owner-managed or legacy graphics format that cannot be safely preserved. Save or clear it before retrying.");
                    IntPtr handle = GetClipboardData(format); // Materializes delayed formats before EmptyClipboard.
                    byte[] bytes;
                    string kind = "global";
                    if (format == 14) {
                        kind = "emf";
                        uint length = GetEnhMetaFileBits(handle, 0, null);
                        if (length == 0 || length > MaxClipboardBytes) throw Fail("CLIPBOARD_UNSUPPORTED", "Windows could not preserve the clipboard metafile.");
                        bytes = new byte[length];
                        if (GetEnhMetaFileBits(handle, length, bytes) != length) throw Fail("CLIPBOARD_READ", "Windows could not read the clipboard metafile.");
                    } else { bytes = ReadGlobal(handle); }
                    total += bytes.Length;
                    if (total > MaxClipboardBytes) throw Fail("CLIPBOARD_TOO_LARGE", "The clipboard is too large to preserve safely. Save or clear it before retrying.");
                    StringBuilder name = new StringBuilder(256);
                    GetClipboardFormatName(format, name, name.Capacity);
                    formats.Add(new Format { id = format, name = name.ToString(), data = Convert.ToBase64String(bytes), kind = kind });
                }
                lastSnapshot = new Snapshot { sequence = GetClipboardSequenceNumber(), formats = formats };
                return lastSnapshot;
            } finally { CloseClipboard(); }
        }

        static void ReplaceClipboard(List<Format> formats) {
            // Allocate every handle before clearing the clipboard. Ownership of
            // successful SetClipboardData handles transfers to Windows.
            List<IntPtr> handles = new List<IntPtr>();
            try {
                foreach (Format format in formats) {
                    byte[] bytes = Convert.FromBase64String(format.data);
                    IntPtr handle = format.kind == "emf" ? SetEnhMetaFileBits((uint)bytes.Length, bytes) : Allocate(bytes);
                    if (handle == IntPtr.Zero) throw Fail("CLIPBOARD_MEMORY", "Windows could not recreate a clipboard format.");
                    handles.Add(handle);
                }
                if (!EmptyClipboard()) throw Fail("CLIPBOARD_WRITE", "Windows could not update the clipboard.");
                for (int i = 0; i < formats.Count; i++) {
                    if (SetClipboardData(formats[i].id, handles[i]) == IntPtr.Zero)
                        throw Fail("CLIPBOARD_WRITE", "Windows could not restore every clipboard format.");
                    handles[i] = IntPtr.Zero;
                }
            } finally {
                for (int i = 0; i < handles.Count; i++) if (handles[i] != IntPtr.Zero) {
                    if (formats[i].kind == "emf") DeleteEnhMetaFile(handles[i]); else GlobalFree(handles[i]);
                }
            }
        }
        static Format BytesFormat(uint id, byte[] bytes) {
            return new Format { id = id, data = Convert.ToBase64String(bytes), kind = "global" };
        }
        static bool ContentsMatch(Request request) {
            try {
                string marker = Encoding.UTF8.GetString(ReadGlobal(GetClipboardData(markerFormat))).TrimEnd('\0');
                string text = Encoding.Unicode.GetString(ReadGlobal(GetClipboardData(13))).TrimEnd('\0');
                return marker == request.marker && text == request.text;
            } catch (InputFailure) { return false; }
        }
        static bool Ours(Request request) {
            if (request.sequence != 0 && GetClipboardSequenceNumber() != request.sequence) return false;
            return ContentsMatch(request);
        }
        static InputFailure ClipboardChanged(string stage, uint expected) {
            return new InputFailure("CLIPBOARD_CHANGED", "The clipboard changed before insertion. Retry the saved transcript.",
                new { stage = stage, expectedSequence = expected, actualSequence = GetClipboardSequenceNumber(),
                    ownerIsHelper = GetClipboardOwner() == owner, mayHaveInserted = false });
        }
        static uint ConfirmPreparedClipboard(Request request) {
            // CloseClipboard can publish synthesized formats and advance the
            // sequence AFTER SetClipboardData. Never hand off the pre-close
            // number, or blindly adopt a post-close number that may be a copy
            // from another application. Reopen and verify our owner and payload.
            for (int attempt = 0; attempt < 3; attempt++) {
                uint observed;
                LockClipboard();
                try {
                    if (GetClipboardOwner() != owner || !ContentsMatch(request))
                        throw ClipboardChanged("prepare_confirm_owner_and_content", request.sequence);
                    // Materialize Windows' text conversions before establishing
                    // the baseline, so an editor reading ANSI/OEM text later
                    // does not invalidate our transaction by rendering it.
                    foreach (uint format in new uint[] { 1, 7, 16 }) {
                        if (IsClipboardFormatAvailable(format) && GetClipboardData(format) == IntPtr.Zero)
                            throw Fail("CLIPBOARD_READ", "Windows could not prepare a clipboard text format. Retry the saved transcript.");
                    }
                    observed = GetClipboardSequenceNumber();
                } finally { CloseClipboard(); }
                // Accept only a number observed under the ownership lock that
                // remains stable after closing it. If close changed it, recheck
                // ownership/content under a new lock; no further writes occur.
                if (observed != 0 && GetClipboardSequenceNumber() == observed) return observed;
            }
            throw ClipboardChanged("prepare_confirm_unstable_sequence", request.sequence);
        }
        static object Restore(Request request) {
            LockClipboard();
            try {
                // If prepare's reply was lost, only the original live helper
                // knows the sequence. A replacement helper must leave it alone.
                if (request.sequence == 0) {
                    if (active == null || active.marker != request.marker)
                        return new { restored = false, reason = "ownership_unconfirmed" };
                    request.sequence = active.sequence;
                    if (request.sequence == 0) return new { restored = false, reason = "ownership_unconfirmed" };
                }
                if (!Ours(request)) { active = null; lastSnapshot = null; return new { restored = false, reason = "clipboard_changed" }; }
                ReplaceClipboard(request.formats);
                active = null;
                lastSnapshot = null;
                return new { restored = true };
            } finally { CloseClipboard(); }
        }

        static Target NativeTarget() {
            IntPtr window = GetForegroundWindow();
            uint processId;
            uint thread = GetWindowThreadProcessId(window, out processId);
            GUITHREADINFO info = new GUITHREADINFO { cbSize = (uint)Marshal.SizeOf(typeof(GUITHREADINFO)) };
            if (window == IntPtr.Zero || thread == 0 || !GetGUIThreadInfo(thread, ref info) || info.hwndFocus == IntPtr.Zero)
                throw Fail("NO_TARGET", "Click inside an editable field, then start recording again. The transcript is retained.");
            if ((info.flags & 0x1e) != 0 || info.hwndMenuOwner != IntPtr.Zero || info.hwndMoveSize != IntPtr.Zero)
                throw Fail("TARGET_BUSY", "Close the menu or finish moving the window, then focus the intended field and retry.");
            uint focusProcess;
            GetWindowThreadProcessId(info.hwndFocus, out focusProcess);
            string start;
            try { using (Process process = Process.GetProcessById((int)processId)) start = process.StartTime.ToUniversalTime().Ticks.ToString(); }
            catch { throw Fail("TARGET_ACCESS", "Windows cannot inspect this application. Try an application running at the same permission level, or copy the saved transcript manually."); }
            return new Target { window = window.ToInt64().ToString(), focus = info.hwndFocus.ToInt64().ToString(),
                pid = processId, thread = thread, focusPid = focusProcess, processStart = start,
                capturedAt = DateTime.UtcNow.ToString("o") };
        }
        static bool SameNative(Target a, Target b) {
            return a != null && b != null && a.window == b.window && a.focus == b.focus && a.pid == b.pid &&
                a.thread == b.thread && a.focusPid == b.focusPid && a.processStart == b.processStart;
        }
        static bool SameTarget(Target captured, Target current) {
            // Browser inputs often share HWNDs; a captured UIA runtime identity
            // must still be present and equal. Never silently downgrade it.
            return SameNative(captured, current) && (captured.uia == null || captured.uia == current.uia);
        }
        static void CheckNativeEditable(Target target) {
            IntPtr focus = new IntPtr(Int64.Parse(target.focus));
            if (!IsWindow(focus) || !IsWindowEnabled(focus)) throw Fail("TARGET_DISABLED", "The captured field is no longer enabled. Focus an editable field and retry.");
            StringBuilder name = new StringBuilder(256);
            GetClassName(focus, name, name.Capacity);
            string cls = name.ToString();
            if ((cls.Equals("Edit", StringComparison.OrdinalIgnoreCase) || cls.StartsWith("RichEdit", StringComparison.OrdinalIgnoreCase)) &&
                (GetWindowLong(focus, -16) & 0x800) != 0)
                throw Fail("TARGET_READ_ONLY", "The captured field is read-only. Choose an editable field or copy the saved transcript manually.");
        }
        static string UiaIdentity(Target target) {
            // Do not fetch field text or use ValuePattern.SetValue (which replaces
            // the whole field). UIA is only for identity/capability checks.
            try {
                AutomationElement element = AutomationElement.FocusedElement;
                if (element == null) return null;
                if (!element.Current.HasKeyboardFocus) return null;
                if (element.Current.ProcessId != target.focusPid)
                    throw Fail("TARGET_CHANGED", "Windows focus changed while checking the field. Return to the intended field and retry.");
                if (!element.Current.IsEnabled) throw Fail("TARGET_DISABLED", "The captured field is disabled. Choose an editable field.");
                object pattern;
                bool editable = false;
                if (element.TryGetCurrentPattern(ValuePattern.Pattern, out pattern)) {
                    if (((ValuePattern)pattern).Current.IsReadOnly) throw Fail("TARGET_READ_ONLY", "The captured field is read-only. Choose an editable field or copy the saved transcript manually.");
                    editable = true;
                }
                if (element.TryGetCurrentPattern(TextPattern.Pattern, out pattern)) {
                    object readOnly = ((TextPattern)pattern).DocumentRange.GetAttributeValue(TextPattern.IsReadOnlyAttribute);
                    if (readOnly is bool && (bool)readOnly) throw Fail("TARGET_READ_ONLY", "This document does not allow text entry here. Focus an editable area or copy the saved transcript manually.");
                    if (readOnly is bool && !(bool)readOnly) editable = true;
                }
                ControlType type = element.Current.ControlType;
                if (!editable && type != ControlType.Edit && type != ControlType.Document && type != ControlType.Custom &&
                    type != ControlType.Pane && type != ControlType.Window && type != ControlType.ComboBox)
                    throw Fail("TARGET_UNSUPPORTED", "The focused control does not support text entry. Click inside an editable field and retry the saved transcript.");
                int[] runtime = element.GetRuntimeId();
                if (runtime == null || runtime.Length == 0) return null;
                return element.Current.ProcessId.ToString() + ":" + String.Join(".", Array.ConvertAll(runtime, item => item.ToString()));
            } catch (InputFailure) { throw; }
            catch (ElementNotAvailableException) { throw Fail("TARGET_CHANGED", "The captured field is no longer available. Focus the intended field and retry the saved transcript."); }
            catch { return null; } // Native-only applications need not expose UIA.
        }
        static Target Capture() {
            Target target = NativeTarget();
            CheckNativeEditable(target);
            target.uia = UiaIdentity(target);
            if (!SameNative(target, NativeTarget())) throw Fail("TARGET_CHANGED", "Focus changed while capturing the field. Focus the intended field and start recording again.");
            return target;
        }
        static void Validate(Target target) {
            Target now = Capture();
            if (!SameTarget(target, now))
                throw Fail("TARGET_CHANGED", "The recording's window or field is no longer focused. Return to that field and retry the saved transcript, or start a new recording.");
        }
        static void CheckKeys() {
            foreach (int key in new int[] { 0x10, 0x11, 0x12, 0x5b, 0x5c, 0x56 })
                if ((GetAsyncKeyState(key) & 0x8000) != 0)
                    throw Fail("MODIFIER_HELD", "Release Ctrl, Shift, Alt, Windows and V, then retry the saved transcript.");
        }
        static object Prepare(Request request) {
            if (String.IsNullOrEmpty(request.text) || request.text.IndexOf('\0') >= 0 || String.IsNullOrEmpty(request.marker))
                throw Fail("INVALID_TEXT", "There is no valid text to insert.");
            Validate(request.target);
            CheckKeys();
            LockClipboard();
            try {
                if (lastSnapshot == null || lastSnapshot.sequence != request.sequence || GetClipboardSequenceNumber() != request.sequence)
                    throw Fail("CLIPBOARD_CHANGED", "The clipboard changed before insertion. Retry the saved transcript when clipboard activity has finished.");
                active = new Request { marker = request.marker, text = request.text, formats = lastSnapshot.formats };
                activeSince = DateTime.UtcNow;
                try {
                    ReplaceClipboard(new List<Format> {
                        BytesFormat(markerFormat, Encoding.UTF8.GetBytes(request.marker + "\0")),
                        BytesFormat(13, Encoding.Unicode.GetBytes(request.text + "\0"))
                    });
                } catch {
                    // Still hold the lock, so no user's intervening clipboard is
                    // possible. Roll back even if only our marker was published.
                    ReplaceClipboard(lastSnapshot.formats);
                    active = null;
                    throw;
                }
            } finally { CloseClipboard(); }
            // The write transaction MUST close before taking the sequence used
            // by Paste/Restore. ContentsMatch plus owner verification prevents
            // adopting another application's intervening clipboard update.
            active.sequence = ConfirmPreparedClipboard(active);
            return new { sequence = active.sequence };
        }
        static INPUT Key(ushort key, bool up) {
            return new INPUT { type = 1, data = new INPUTUNION { ki = new KEYBDINPUT { wVk = key, dwFlags = up ? 2u : 0u } } };
        }
        static object Paste(Request request) {
            Validate(request.target);
            CheckKeys();
            LockClipboard();
            try {
                if (GetClipboardOwner() != owner || !Ours(request)) throw ClipboardChanged("paste_owner_content_or_sequence", request.sequence);
            } finally { CloseClipboard(); }
            // The receiving editor must be able to open the clipboard immediately.
            // Recheck after unlocking, as close to dispatch as possible. Windows
            // has no atomic 'paste to HWND'; focus/clipboard can still race here.
            Validate(request.target); // Recheck UIA too after any clipboard-lock wait.
            CheckKeys();
            if (GetClipboardSequenceNumber() != request.sequence || GetClipboardOwner() != owner)
                throw ClipboardChanged("paste_final_sequence_or_owner", request.sequence);
            INPUT[] keys = new INPUT[] { Key(0x11, false), Key(0x56, false), Key(0x56, true), Key(0x11, true) };
            SetLastError(0);
            uint sent = SendInput((uint)keys.Length, keys, Marshal.SizeOf(typeof(INPUT)));
            int win32Error = Marshal.GetLastWin32Error();
            if (sent != keys.Length) {
                uint released = 0;
                int cleanupError = 0, cleanupExpected = 0;
                if (sent > 0) {
                    // Release only keys we may have pressed. Never send V-down
                    // again or retry the paste, which could duplicate text.
                    INPUT[] release = sent == 1 || sent == 3 ? new INPUT[] { Key(0x11, true) } : new INPUT[] { Key(0x56, true), Key(0x11, true) };
                    cleanupExpected = release.Length;
                    SetLastError(0);
                    released = SendInput((uint)release.Length, release, Marshal.SizeOf(typeof(INPUT)));
                    cleanupError = Marshal.GetLastWin32Error();
                }
                throw new InputFailure("SEND_INPUT_FAILED",
                    "Windows dispatched " + sent + " of 4 paste key events (Win32 error " + win32Error + "). An elevated application or Windows input restrictions may block insertion. Check the field before retrying; copy the saved transcript manually if needed.",
                    new { sent = sent, expected = 4, win32Error = win32Error, cleanupSent = released,
                        cleanupExpected = cleanupExpected, cleanupWin32Error = cleanupError, mayHaveInserted = sent >= 2 });
            }
            return new { inserted = true, verified = false };
        }
        static object Dispatch(Request request) {
            switch (request.op) {
                case "capture": return Capture();
                case "validate": Validate(request.target); return new { valid = true };
                case "snapshot": return SnapshotClipboard();
                case "prepare": return Prepare(request);
                case "paste": return Paste(request);
                case "restore": return Restore(request);
                case "shutdown":
                    // Complete residual clipboard cleanup before acknowledging;
                    // the parent may terminate us immediately after this reply.
                    if (active != null) {
                        int remaining = 1500 - (int)(DateTime.UtcNow - activeSince).TotalMilliseconds;
                        if (remaining > 0) Thread.Sleep(remaining);
                        Restore(active);
                    }
                    return new { stopped = true };
                default: throw Fail("INVALID_REQUEST", "Unknown input helper operation.");
            }
        }
        static void StartOwner() {
            // A real hidden window gives EmptyClipboard a valid clipboard owner.
            // Pump its messages on a separate thread while stdin is blocked, so
            // another application's clipboard operations never wait on our loop.
            ManualResetEvent started = new ManualResetEvent(false);
            ownerThread = new Thread(() => {
                ownerThreadId = GetCurrentThreadId();
                owner = CreateWindowEx(0, "STATIC", "Orbitvoice clipboard owner", 0, 0, 0, 0, 0, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                started.Set();
                if (owner == IntPtr.Zero) return;
                try {
                    MSG message;
                    while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0) {
                        TranslateMessage(ref message);
                        DispatchMessage(ref message);
                    }
                } finally { DestroyWindow(owner); }
            });
            ownerThread.IsBackground = true;
            ownerThread.SetApartmentState(ApartmentState.STA);
            ownerThread.Start();
            started.WaitOne();
            started.Dispose();
            if (owner == IntPtr.Zero) throw Fail("HELPER_START_FAILED", "Windows could not create the hidden clipboard owner.");
        }
        static void StopOwner() {
            if (ownerThread != null && ownerThread.IsAlive) {
                PostThreadMessage(ownerThreadId, 0x12, UIntPtr.Zero, IntPtr.Zero); // WM_QUIT
                ownerThread.Join(1000);
            }
        }
        public static void Run() {
            // Never show, activate, focus or attach the owner to a target thread.
            StartOwner();
            markerFormat = RegisterClipboardFormat("Orbitvoice.Input.Transaction.v1");
            if (markerFormat == 0) { StopOwner(); throw Fail("HELPER_START_FAILED", "Windows could not register the clipboard marker."); }
            try {
                Console.WriteLine("{\"ready\":true}");
                Console.Out.Flush();
                string line;
                while ((line = Console.ReadLine()) != null) {
                    Request request = null;
                    try {
                        request = json.Deserialize<Request>(line);
                        if (request == null) throw Fail("INVALID_REQUEST", "Missing input request.");
                        object result = Dispatch(request);
                        Console.WriteLine(json.Serialize(new { id = request.id, ok = true, result = result }));
                    } catch (Exception error) {
                        InputFailure failure = error as InputFailure;
                        Console.WriteLine(json.Serialize(new { id = request == null ? 0 : request.id, ok = false,
                            error = new { code = failure == null ? "INPUT_FAILED" : failure.Code,
                                message = failure == null ? "The Windows input helper could not complete the operation. Copy the saved transcript manually." : failure.Message,
                                details = failure == null ? null : failure.Details } }));
                    }
                    Console.Out.Flush();
                    if (request != null && request.op == "shutdown") break;
                }
            } finally {
                if (active != null) {
                    int remaining = 1500 - (int)(DateTime.UtcNow - activeSince).TotalMilliseconds;
                    if (remaining > 0) Thread.Sleep(remaining);
                    try { Restore(active); } catch { /* Main process also retains the full snapshot. */ }
                }
                lastSnapshot = null;
                StopOwner();
            }
        }
    }
}
'@
$references = @(
    'System.dll',
    [System.Web.Script.Serialization.JavaScriptSerializer].Assembly.Location,
    [System.Windows.Automation.AutomationElement].Assembly.Location,
    [System.Windows.Automation.TextPatternIdentifiers].Assembly.Location,
    [System.Windows.Threading.Dispatcher].Assembly.Location
)
Add-Type -TypeDefinition $source -ReferencedAssemblies $references
if (-not $CompileOnly) { [OrbitvoiceInput.Helper]::Run() }

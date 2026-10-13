
## **1. File Info & Hashes**

**Goal:** Identify file type, integrity, and potential tampering.

|Command / Tool|Purpose|
|---|---|
|`Get-Item target.exe`|Basic file info|
|`certutil -hashfile target.exe SHA256`|Compute SHA256 hash|
|`Get-AuthenticodeSignature target.exe`|Check digital signature|
|`signtool verify /pa target.exe`|Verify Authenticode signature|
|`osslsigncode verify target.exe`|OpenSSL-based signature check|

**Advanced Checks:**

- Compare file size vs header info (tiny `.text` vs huge `.rdata` → packed)
    
- Timestamps → detect timestomping or anomalies
    
- Cross-reference hashes with VirusTotal / malware repositories
    

---

## **2. PE Architecture & Type**

**Goal:** Identify CPU architecture, PE type, and managed/native distinction.

|Tool|Purpose|
|---|---|
|`pefileinfo target.exe`|CLI inspection|
|DIE / PEiD / ExeInfoPE / CFF Explorer|GUI inspection|

**Key Points:**

- 32-bit vs 64-bit mismatch → suspicious
    
- Managed (.NET) vs Native PE
    
- Driver or firmware PE → `.sys` / `.efi`
    
- Optional Header anomalies:
    
    - `ImageBase` unusual
        
    - `SectionAlignment` vs `FileAlignment`
        
- Section count anomalies:
    
    - 1-2 sections → packed or stub
        
- Suspicious section names:  
    `.UPX0, .UPX1, .aspack, .Themida, .vmp0, .neon, .stub`
    

---

## **3. Entropy / Packing Detection**

**Goal:** Identify compressed/encrypted/polymorphic sections.

|Tool|Purpose|
|---|---|
|`binwalk -E target.exe`|Entropy visualization|
|`pefile` (Python)|Section entropy analysis|

**Indicators:**

- Entropy > 7.5 → likely packed/encrypted
    
- Very small `.text` + huge `.rdata` → suspicious
    
- High-entropy resources → embedded payload
    
- Common packers: UPX, Themida, ASPack, MPRESS, PECompact
    

---

## **4. Strings / Resources**

**Goal:** Extract hidden information and suspicious strings.

|Tool|Purpose|
|---|---|
|`strings -n 6 target.exe`|Basic strings|
|`floss target.exe`|Detect obfuscated strings|
|`rsrcdump target.exe`|Extract PE resources|
|Resource Hacker / PE Explorer|GUI resource inspection|

**Indicators:**

- Hardcoded IPs, domains, or ports
    
- PowerShell, VBS, JS commands
    
- Registry keys / Run entries
    
- Crypto APIs: `BCrypt`, `CryptAcquireContext`, `CryptEncrypt`
    
- Encoded / obfuscated strings: Base64, XOR, RC4, AES
    

---

## **5. Headers / Imports / Exports**

**Goal:** Detect suspicious APIs, dynamic linking, and malware behavior.

| Tool                                            | Purpose              |
| ----------------------------------------------- | -------------------- |
| `dumpbin /headers /imports /exports target.exe` | CLI analysis         |
| `peview target.exe`                             | GUI inspection       |
| `pefile` / `lief` / `pedump.py`                 | Automated PE parsing |

**Suspicious Patterns:**

- Small import table + `GetProcAddress` → dynamic resolution
    
- Suspicious DLLs:
    

`kernel32.dll, ntdll.dll, advapi32.dll, user32.dll, ws2_32.dll, wininet.dll, urlmon.dll, shell32.dll, crypt32.dll, ole32.dll, gdi32.dll, msvcrt.dll, shlwapi.dll`

- Anti-debug APIs:
    

`IsDebuggerPresent, CheckRemoteDebuggerPresent, OutputDebugString, NtQueryInformationProcess, RtlGetVersion, NtSetInformationThread`

- Exported functions → malware hooks / RAT functionality

## **6. Certificates / Signing**

**Goal:** Check for trustworthiness and tampering.

|Tool|Purpose|
|---|---|
|`signtool verify /pa target.exe`|Verify signature|
|`osslsigncode verify target.exe`|Open-source verification|
|`Get-AuthenticodeSignature target.exe`|PowerShell verification|

**Indicators:**

- Expired, revoked, self-signed, or stolen certs
    
- Timestamps inconsistent with malware campaigns
    
- Fake or unusual publishers
    

---

## **7. Static Capability & Behavior**

**Goal:** Predict malware capabilities without execution.

|Tool|Purpose|
|---|---|
|`capa target.exe`|Malware capability scanning|
|`floss target.exe`|Deobfuscate strings|
|`yara -r rules.yar target.exe`|Rule-based detection|

**Suspicious Capabilities:**

- Anti-debug / Anti-VM → CPUID, RDTSC, SIDT checks
    
- Process injection → `CreateRemoteThread`, `WriteProcessMemory`
    
- Network → `connect`, `send`, `recv`, `InternetOpen`, `HttpSendRequest`
    
- Persistence → Run keys, services, scheduled tasks, WMI
    
- File/Registry manipulation → `CreateFile`, `WriteFile`, `RegSetValueEx`
    

---

## **8. Disassembly / Decompilation**

**Goal:** Understand internal logic and hidden payloads.

|Target|Tool|
|---|---|
|Native|IDA Pro, Ghidra, Binary Ninja|
|.NET|dnSpy, ILSpy|
|Python|pyinstxtractor.py|
|Java|JD-GUI, CFR|
|C++|Hopper, Radare2|

**Advanced Checks:**

- TLS callbacks → anti-debug
    
- Hidden / compressed sections → runtime decryption
    
- API hashing → resolve dynamically
    
- Relocation table anomalies
    

---

## **9. DLLs & APIs**

**System DLLs to Monitor:**
`kernel32.dll  → Threading, memory allocation, process creation
`ntdll.dll     → Low-level system calls, exception handling
`advapi32.dll  → Registry, services, crypto
`user32.dll    → UI messages, hooking
`ws2_32.dll    → Networking (TCP/UDP)
`wininet.dll   → HTTP/HTTPS connections
`urlmon.dll    → File downloads, web communication
`shell32.dll   → File operations, execution
`crypt32.dll   → Cryptography
`ole32.dll     → COM / automation
`gdi32.dll     → Graphics APIs (sometimes abused)
`msvcrt.dll    → C runtime (buffer operations)
`shlwapi.dll   → String / path manipulation``


**Tips:**

- Look for unusual third-party DLLs → may indicate malware loaders or plugins
    
- Dynamic DLL loading via `LoadLibraryA/W` → suspect if import table is small
    

---

### **5.3. Suspicious API Calls**

**Malware behaviors often mapped to specific APIs:**

| Behavior                           | Common APIs                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Memory allocation                  | `VirtualAlloc`, `VirtualProtect`, `VirtualFree`                                                                      |
| Process injection / remote threads | `CreateRemoteThread`, `WriteProcessMemory`, `OpenProcess`                                                            |
| Dynamic API resolution             | `LoadLibraryA`, `GetProcAddress`                                                                                     |
| File operations                    | `CreateFile`, `WriteFile`, `ReadFile`, `DeleteFile`                                                                  |
| Registry operations                | `RegOpenKeyEx`, `RegSetValueEx`, `RegDeleteValue`                                                                    |
| Networking                         | `connect`, `send`, `recv`, `WSAStartup`, `InternetOpen`, `HttpSendRequest`                                           |
| Anti-debug / sandbox               | `IsDebuggerPresent`, `CheckRemoteDebuggerPresent`, `OutputDebugString`, `NtQueryInformationProcess`, `RtlGetVersion` |
| Cryptography / encoding            | `CryptAcquireContext`, `CryptEncrypt`, `CryptDecrypt`, `BCryptEncrypt`, `BCryptDecrypt`                              |
| Shell execution                    | `WinExec`, `ShellExecuteA/W`, `CreateProcess`                                                                        |
| COM / automation abuse             | `CoCreateInstance`, `CoInitializeEx`                                                                                 |

**Suspicious / Malware APIs:**

| Category                                       | API / Function / Technique                                             | Description / Usage                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Kernel32 / Win32 APIs**                      | `IsDebuggerPresent()`                                                  | Checks if current process is being debugged                               |
|                                                | `CheckRemoteDebuggerPresent(HANDLE hProcess, BOOL* pbDebuggerPresent)` | Detects debugger attached to another process                              |
|                                                | `OutputDebugStringA/W(LPCSTR lpOutputString)`                          | Detects debugger by sending string to debugger buffer                     |
|                                                | `GetTickCount() / GetTickCount64()`                                    | Timing check – debugger can slow execution                                |
|                                                | `QueryPerformanceCounter(LARGE_INTEGER* lpPerformanceCount)`           | High-resolution timing to detect breakpoints                              |
|                                                | `Sleep() / SleepEx()`                                                  | Timing differences can indicate debugger breakpoints                      |
|                                                | `SetUnhandledExceptionFilter()`                                        | Custom exception handlers to detect debugger exception handling           |
|                                                | `UnhandledExceptionFilter()`                                           | Detects debugger handling exceptions                                      |
|                                                | `TerminateProcess()`                                                   | Used in anti-debug routines to exit if debugger detected                  |
|                                                | `GetLastError()`                                                       | Can detect debugger behavior when error codes manipulated                 |
|                                                | `DebugBreak()`                                                         | Forces a breakpoint intentionally, used to trap debuggers                 |
| **Nt / Ntdll Low-Level Functions**             | `NtQueryInformationProcess()`                                          | Query `ProcessDebugPort`, `ProcessDebugObjectHandle`, `ProcessDebugFlags` |
|                                                | `NtSetInformationThread()`                                             | Detect or hide debugger by changing thread flags                          |
|                                                | `NtClose()`                                                            | Sometimes used to close debugger handles                                  |
|                                                | `NtRaiseException()`                                                   | Trigger controlled exception for debugger detection                       |
|                                                | `RtlGetVersion()`                                                      | Check OS version to detect sandbox or VM                                  |
|                                                | `RtlTryEnterCriticalSection()`                                         | Used in anti-debug timing tricks                                          |
|                                                | `RtlCaptureContext()`                                                  | Capture thread context to detect debugging                                |
| **Thread & Exception Handling APIs**           | `SuspendThread() / ResumeThread()`                                     | Detect debugger by manipulating thread execution                          |
|                                                | `GetThreadContext() / SetThreadContext()`                              | Can detect debugger context modification                                  |
|                                                | `RaiseException()`                                                     | Trap exception to detect debugger                                         |
|                                                | `SetThreadExecutionState()`                                            | Detect debugger in conjunction with thread manipulation                   |
| **Process / Handle Checks**                    | `OpenProcess(PROCESS_QUERY_INFORMATION, ...)`                          | Check for debug flags in other processes                                  |
|                                                | `CreateToolhelp32Snapshot()`                                           | Detect running debuggers by enumerating processes/threads                 |
|                                                | `Process32First / Process32Next`                                       | Scan for debugger processes                                               |
|                                                | `CheckRemoteDebuggerPresent()`                                         | Cross-process debugger detection                                          |
|                                                | `CloseHandle()`                                                        | May close handles to hide debugger detection                              |
| **Registry & Environment Checks**              | `RegOpenKeyEx() / RegQueryValueEx()`                                   | Detect sandbox/debugger registry artifacts                                |
|                                                | `GetEnvironmentVariable()`                                             | Detect VM/debugger environment variables (e.g., VBOX, VMWARE)             |
| **Timing-Based Anti-Debugging**                | `RDTSC (Read Time-Stamp Counter)`                                      | High-resolution timing to detect step-instruction delays                  |
|                                                | `QueryPerformanceCounter()`                                            | Detect debugger slowdowns                                                 |
|                                                | `Sleep() / SleepEx()` measurement                                      | Detect breakpoints that pause execution                                   |
|                                                | Loops measuring execution time                                         | Anti-step debugging trick                                                 |
| **Hardware / CPU Checks**                      | `CPUID` instruction                                                    | Detect VM or debugger features (hypervisor bit)                           |
|                                                | `INT 3` instruction                                                    | Debugger trap – generates breakpoint exception                            |
|                                                | Single-step trap / Trap Flag                                           | CPU-level anti-debug                                                      |
| **Structured Exception Handling (SEH) Tricks** | `SetUnhandledExceptionFilter()`                                        | Custom exception handler to catch debugger interrupts                     |
|                                                | Try/Except blocks                                                      | Detect debugger handling exceptions                                       |
|                                                | Divide-by-zero, `INT 3`, Invalid memory access                         | Used to trap or confuse debugger                                          |

---

## **10. Anti-Analysis / Evasion Indicators**

- Packed or encrypted sections
    
- Dynamic API resolution / Import hashing
    
- TLS callbacks
    
- Self-modifying code
    
- Anti-VM / sandbox checks
    
- Unusual section names / high entropy
    
- Thread hiding / process hollowing
    

---

## **11. Automation / Python Tools**

`import pefile, lief, floss, yara`

**Automated Analysis:**

- Section entropy check
    
- Suspicious API detection
    
- Embedded string extraction
    
- PE header anomaly detection
    
- Optional: integrate `pe-sieve`, `Capa`, or `Floss` for bulk triage
    

---

## **12. Expert Tips**

- Compare multiple samples → malware family correlation
    
- Visualize entropy maps → detect packing / compression
    
- Save suspicious resources → decrypt / analyze offline
    
- Automate scanning → Python / YARA / Capa
    
- Track anomalies in header, section, import/export
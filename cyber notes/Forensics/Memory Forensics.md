
# 🧠 Memory Forensics — Advanced Notes (Complete & Practical)

---

## 0. Purpose & Audience

Forensic analysts, DFIR teams, threat hunters, red-teamers, and advanced CTF players. Coverage: acquisition, analysis, artifacts, anti-forensics, detection/counter-detection, workflows, and research directions.

---

## 1. Short Overview — Why memory forensics matters

Memory contains runtime-only evidence that disk-forensics cannot show:

- Fileless malware, reflective loaders, injected threads, kernel rootkits (DKOM).
    
- Decrypted payloads, symmetric keys, TLS session keys, SSH keys, cached credentials.
    
- Network state: in-memory sockets, TLS sessions, ephemeral tokens.
    

Key value: **reveal what ran and what was in-use**, even if never written to disk.

---

## 2. Acquisition — Best Practices (Actionable)

### Goals

- Capture **full physical memory** + pagefile/swap + hibernation if present.
    
- Minimize footprint & document everything.
    
- Preserve chain-of-custody and hashing.
    

### Tools (examples)

- **Windows**: WinPmem (afflib/raw), DumpIt, FTK Imager, Belkasoft RAM Capturer.
    
- **Linux**: LiME (kernel module) — capture physical memory to disk/over network.
    
- **macOS**: OSXPmem, Mac Memory Reader, macOS kernel dump tools.
    
- **Hardware / low-footprint**: PCIe DMA cards, cold-boot; where allowed.
    

### Checklist (step-by-step)

1. Record triage context: hostname, IPs, uptime, current time (UTC), logged-in users, AV state, mounts, live network connections (netstat), admin sessions.
    
2. If possible, run a **trusted** acquisition binary from read-only media. Prefer known-good, signed tools.
    
3. Acquire memory: full physical memory (RAW) and also:
    
    - `pagefile.sys` (Windows), `swap` (Linux), `hibernate` (hiberfil.sys).
        
4. Compute hashes: `sha256sum mem.raw` and store signed logs.
    
5. Get a screenshot or live evidence output (list of processes, netstat) for correlation.
    
6. If multiple acquisition options available, take >1 capture with different tools to cross-validate.
    
7. Preserve copies in forensically controlled storage.
    

### Pitfalls & mitigations

- **Tool tampering**: rootkits may hook acquisition APIs. Mitigate with raw physical readers, DMA, or get a second capture using a different tool.
    
- **Live acquisition modifies state**: record timestamps for acquisition operations and tools used; capture logs of executed commands.
    
- **Encrypted/ephemeral**: Keys may appear only transiently — faster acquisition means better recovery.
    

---

## 3. Analysis Frameworks & Utilities (practical shortlist)

- **Volatility / Volatility3** — primary analysis engine (plugin ecosystem).
    
- **Rekall** — alternate engine; sometimes faster or gives complementary parsing.
    
- **MemProcFS** — mount memory as a file-system view.
    
- **Redline (FireEye)** — GUI triage and timeline building.
    
- **YARA** — signature scanning inside memory dumps.
    
- **strings**, **binwalk**, **xxd**, **ent** (entropy), and carving tools.
    
- **maim/ps_mem** for memory usage analysis.
    
- **procdump / psscan / malfind / netscan** (plugins described below).
    
- **GDB / WinDbg** for deep kernel debugging.
    

---

## 4. Core Artifacts & What They Reveal (detection pointers)

### Processes / Threads

- Tools: `pslist`, `pstree`, `psscan`, `psxview` (crossview).
    
- Look for: unlinked processes (psscan finds EPROCESS blocks), mismatched parent-child relations, processes with abnormal names (spaces, unicode), suspicious parent (e.g., `svchost.exe` spawning `cmd.exe`).
    

### VADs (Virtual Address Descriptors)

- VAD flags show memory protections (PAGE_EXECUTE_READWRITE = RWX).
    
- Suspicious: RWX VADs with no backing file, or RWX regions in non-legit processes.
    
- Tools: `malfind`, `vaddump`.
    

### Modules / DLLs

- `ldrmodules`, `dlllist` — detect modules that aren't on disk.
    
- Hook detection: compare in-memory prologue to disk prologue; detect trampolines or inline hooks.
    

### Handles & Objects

- File handles, registry keys, mutexes often reveal persistence mechanisms and inter-process coordination.
    

### Network Artifacts

- `netscan` or `netscan`-like plugins to enumerate sockets, listening ports, foreign IPs, and connections.
    
- Inspect in-memory HTTP strings, cookies, session tokens, TLS session state (possible to extract private session keys in some cases).
    

### Credentials & Secrets

- LSASS memory may contain:
    
    - Plaintext credentials.
        
    - NTLM hashes and Kerberos tickets (TGT/TGS).
        
    - Decryption keys for full-disk encryption.
        
- Browser session tokens (OAuth, cookies) may live in memory.
    
- Important: **legal/ethical constraints** — extract only with documented authorization.
    

### Entropy & High-Entropy Blobs

- High entropy = possible encrypted or compressed data. Use sliding-window entropy scans to locate blobs to carve and analyze.
    

---

## 5. Anti-Forensics & Evasion — Common TTPs and how to detect them

### TTPs

- **DKOM** — kernel structures modified; processes hidden from API lists.
    
- **Process Hollowing / PE Stomping / Process Doppelgänging** — replace legitimate process memory with malicious code.
    
- **Reflective DLL Injection** — load DLLs directly from memory without disk footprint.
    
- **API Hooking & ROP** — hide calls and calls chains.
    
- **In-memory-only persistence** — use WMI, scheduled tasks manipulated only in memory; short-lived decryptors.
    
- **Legit-signed binary misuse (LOLBins)** — abuse signed system binaries to load shellcode.
    
- **Memory wiping** — overwrite critical regions after use.
    

### Detection strategies

- **Cross-view analysis**: pslist vs psscan mismatches → hidden processes.
    
- **VAD checks**: executable regions with no backing file → injection.
    
- **Entropy scans**: spot encrypted blobs or packed payloads.
    
- **Prologue verification**: compare function prologues to expected clean one.
    
- **Kernel integrity checks**: measure offsets and signatures of EPROCESS/EPROCESS lists versus known good for the OS version.
    

---

## 6. Volatility / Volatility3 — useful plugins & commands (examples)



`python -m volatility3 -f mem.raw windows.info
`python -m volatility3 -f mem.raw windows.pslist.PsListPlugin
`python -m volatility3 -f mem.raw windows.pstree.PsTree`
`python -m volatility3 -f mem.raw windows.vadinfo.VadInfo
`python -m volatility3 -f mem.raw windows.malfind.Malfind
`python -m volatility3 -f mem.raw windows.netscan.NetScan
`python -m volatility3 -f mem.raw windows.lsadump.LsaDump
`

### Common Volatility2 equivalents:

`volatility -f mem.raw --profile=Win10x64_18362 pslist
`volatility -f mem.raw --profile=Win10x64_18362 psscan
`volatility -f mem.raw --profile=Win10x64_18362 malfind
`volatility -f mem.raw --profile=Win10x64_18362 netscan
`volatility -f mem.raw --profile=Win10x64_18362 ldrmodules
`volatility -f mem.raw --profile=Win10x64_18362 yarascan --yara-rules=rules.yar
`volatility -f mem.raw --profile=Win10x64_18362 procdump -p <PID> -D ./dumps`

### Plugin intent quick list

- `pslist`, `pstree`: baseline running processes
    
- `psscan`: raw EPROCESS scan (detect unlinked EPROCESS)
    
- `psxview`: cross-view detection
    
- `malfind`: find suspicious executable memory + dumps
    
- `ldrmodules`, `dlllist`: list loaded modules (unlinked modules show evasion)
    
- `netscan`: network sockets, connections
    
- `yarascan`: YARA across memory
    
- `lsadump`/`hashdump`: extract credentials (with appropriate authorization)
    
- `vaddump/moddump`: dump VADs and modules for offline analysis
    

---

## 7. Practical Workflow — step-by-step (detailed)

1. **Triage & Document**
    
    - Record host, time (UTC), uptime, user sessions, AV, patch level.
        
    - Capture a screenshot of desktop and/or running admin shell output (e.g., `whoami`, `tasklist`, `netstat -ano`).
        
2. **Acquire**
    
    - Acquire `mem.raw` + `pagefile.sys` + `hiberfil.sys` if present.
        
    - Tools: `winpmem --output mem.raw` (Windows), `lime` (Linux).
        
3. **Hash & Secure**
    
    - `sha256sum mem.raw > mem.raw.sha256`
        
4. **Initial triage on a separate analysis host**
    
    - Run `volatility imageinfo` or `volatility3 windows.info` to determine profile/OS details.
        
    - `pslist`, `pstree` to capture baseline.
        
    - `psscan` to find hidden processes.
        
    - `netscan` for live connections.
        
5. **Hunt for injections**
    
    - `malfind` → dump suspicious VADs with RWX flags.
        
    - `yarascan` using YARA for known loaders.
        
6. **Dump suspicious processes**
    
    - `procdump -p <PID> -D ./dumps` or `volatility procdump` for offline reverse-engineering.
        
7. **Extract credentials & tickets (with legal clearance)**
    
    - `lsadump` or `mimikatz` style extraction from memory copies.
        
8. **Network correlation**
    
    - Cross-reference extracted IPs/domains with firewall logs, proxy logs, and SIEM events.
        
9. **Timeline**
    
    - Parse process creation times, network timestamps, and file activity (use event logs where available).
        
10. **Report**
    
    - Evidence list with hash values, list of IOCs (IPs, domains, mutexes, strings), timeline, recommended containment and remediation.
        

---

## 8. Detection & Hunting Rules (quick reference)

### High-value alerts to build into EDR/SIEM:

- **LSASS opened** by non-expected process or by process without administrative context.
    
- **Process with RWX pages** allocated and no corresponding on-disk module.
    
- **pslist vs psscan mismatch**: EPROCESS found via signature but not present in API list.
    
- **Signed binary spawning shell** (e.g., `svchost.exe` → `powershell.exe` with encoded commands).
    
- **New network connections to suspicious IPs** from unusual processes.
    
- **Process memory scan contains suspicious strings** (C2 patterns, embedded IPs, staging strings).
    
- **Unusual use of memory dump tools** (procdump, rundll32 with odd args, comsvcs.dll use).
    

### Correlation primitives to feed hunts:

- Parent/child anomalies, code-injection detection, high-entropy VADs, repeated short-lived processes that allocate RWX and vanish.
    

---

## 9. Red Team Considerations — Evasion & defenses

### Red-team evasion techniques

- Use signed binaries / LOLBins to host reflective loader.
    
- Short-lived decryptors in memory that wipe after use.
    
- DKOM/unlinking to hide EPROCESS.
    
- Reflective DLL loading and in-memory-only payloads.
    
- Thread injection into high-privilege processes and unmapping of original sections.
    

### Defender mitigations

- **Kernel integrity monitoring** to detect DKOM.
    
- **Runtime memory monitoring**: detect unusual RWX allocations and thread creations inside unexpected processes.
    
- **Lock down tools** that can dump memory or escalate privileges for uncommon users.
    
- **Detect behavior**: anomalous parent/child, frequent memory allocations with execution flags, or outbound beacons with unusual timing.
    

---

## 10. Case Studies (concise, lesson-focused)

- **Stuxnet**: multi-stage loaders, DLL injection; shows importance of cross-checking modules and network indicators.
    
- **Duqu 2.0**: in-memory modules and fileless persistence; valuable for learning in-memory stealth mechanics.
    
- **SUNBURST (SolarWinds)**: long-lived stealthy memory modules used for lateral movement — highlights supply-chain risk and the need for baseline comparisons across hosts.
    

---

## 11. Advanced Topics & Research Directions

- **GPU / VRAM forensics** — malware storing artifacts in GPU memory (emerging).
    
- **Cloud memory forensics** — live snapshots & provider APIs (AWS/EBS snapshots, Azure memory capture).
    
- **DMA & hardware-assisted acquisition** — low-footprint, more reliable in presence of kernel tampering.
    
- **ML/AI detection** — anomaly detection on memory feature vectors (entropy, allocation patterns).
    
- **Secure acquisition for hostile environments** — small-footprint DMA, write-protected acquisition media.
    
- **Memory carving improvements** — better detection and reconstruction of PE images from fragmented VADs and swapped pages.
    

---

## 12. Quick command cheatsheet (Windows-focused)

` Acquire (example Windows)
`winpmem --output mem.raw

` Hash
`sha256sum mem.raw

` Volatility (v2)
`volatility -f mem.raw --profile=Win10x64_18362 imageinfo
`volatility -f mem.raw --profile=Win10x64_18362 pslist
`volatility -f mem.raw --profile=Win10x64_18362 psscan
`volatility -f mem.raw --profile=Win10x64_18362 malfind
`volatility -f mem.raw --profile=Win10x64_18362 netscan
`volatility -f mem.raw --profile=Win10x64_18362 ldrmodules
`volatility -f mem.raw --profile=Win10x64_18362 yarascan --yara-rules=rules.yar
`volatility -f mem.raw --profile=Win10x64_18362 procdump -p <PID> -D ./dumps`

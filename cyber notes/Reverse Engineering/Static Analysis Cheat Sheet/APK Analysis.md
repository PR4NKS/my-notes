
## 0 — Safety & setup

- Always analyze a **copy** of the APK.
    
- Work offline: avoid letting the binary phone-home.
    
- Keep the environment patched and run analysis on an isolated machine for suspicious samples.
    

---

## 1 — Quick metadata & unpack

`Basic info
`aapt dump badging app.apk            # package, minSdkVersion, `permissions, launcher activity
`unzip -l app.apk                     # list archive contents
`apktool d app.apk -o app.apkd        # decode resources + smali
`jadx -d app_jadx app.apk             # decompile to Java (GUI: jadx-gui)


What to look for:

- `package` id, `targetSdkVersion`, `minSdkVersion`
    
- `uses-permission` (dangerous: `SMS`, `RECORD_AUDIO`, `SEND_SMS`, `READ_SMS`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `REQUEST_INSTALL_PACKAGES`, `BIND_DEVICE_ADMIN`)
    
- Exported `activities`, `services`, `receivers` and `intent-filter` (exposed entry points).
    

---

## 2 — Certificate & signing inspection

`Inspect the certificate in META-INF
`unzip -p app.apk META-INF/*.RSA | keytool -printcert -v -file /dev/stdin
`APK signature scheme v2/v3 check (apksigner from Android SDK)
`apksigner verify --print-certs app.apk
`Check for debug/weak certificate
`keytool -list -printcert -file META-INF/CERT.RSA


Heuristics:

- Self-signed “CN=Android Debug” or default keystore — low assurance (common for repackaging).
    
- Presence of v2/v3 signatures (APK Signature Scheme v2/v3) indicates modern signing — but repackers may re-sign.
    

---

## 3 — Resources & manifest deep-dive

`Manifest (human-readable)
`apktool d app.apk -o app.apkd
`or extract Manifest only
`aapt dump xmltree app.apk AndroidManifest.xml
`# grep for exported components and intent-filters
`rg "exported|android:exported|intent-filter" -n app.apkd/AndroidManifest.xml


What to audit:

- `android:exported="true"` on services/receivers/providers/activities — external attack surface.
    
- `provider` authorities pointing to file:// or external storage → possible content-provider exploitation.
    
- `uses-permission` vs `permission` grants (dangerous perms elevated for older SDKs).
    
- `allowBackup="true"` with exported `provider` → sensitive data exposure.
    

---

## 4 — Strings & resources scanning (indicators)

`strings app.apk | rg -i "http|https|api|pay|private|token|key|secret|certificate|password"
`# search smali/jadx for keywords
`rg -n "getDeviceId|getSubscriberId|getLine1Number|TelephonyManager|Runtime.exec|ProcessBuilder|java.net.Socket|HttpURLConnection|HttpsURLConnection|SSLContext|Cipher|forName|DexCla`s`sLoader|Reflection|loadLibrary|System.load|Base64|AES|RSA" app.apkd`

Indicators:

- Embedded URLs, IPs, C2 patterns, hardcoded API keys.
    
- `DexClassLoader`, `PathClassLoader`, `Class.forName` → dynamic code loading/reflection.
    
- `System.loadLibrary` + `.so` in `lib/` → native code (inspect .so).
    
- `Base64` + long blobs in `assets/`/`res/raw/` → likely embedded payloads.
    

---

## 5 — DEX / classes analysis

`Dump DEX info
`jadx -d out app.apk                    # readable Java
`baksmali disassemble app.apk           # produce smali
Heuristics:

- Multiple `classes.dex`, `classes2.dex` → multi-dex (may hide secondary loaders).
    
- High proportion of short-named classes/methods (`a.a`, `a.b`) → likely obfuscated (ProGuard/R8).
    
- Detect native wrappers: many `native` methods declared in Java classes.
    

---

## 6 — Detecting obfuscation vs packing

- **Obfuscation signs**
    
    - Short class/method names, meaningless strings.
        
    - `apkid` output: `proguard`, `dexprotector`, `allatori`, `dashO`, `dexguard`.
        
- **Packing / dynamic loader signs**
    
    - Large encrypted blobs in `assets/` or `res/raw/`.
        
    - Presence of native loaders (`lib/armeabi-v7a/*.so`) that decrypt/restore dex at runtime.
        
    - `classes.dex` size unusually small + heavy use of `DexClassLoader` & `loadDex`.
        

`apkid --json app.apk strings app.apk | rg -i "dex|decrypt|unpack|loader|crypt|xor|aes|rc4|dexopt|odex|classes2.dex"`

---

## 7 — Smali-level heuristics (no decompile)

Use `apktool` output to scan smali for patterns:

`rg -n "invoke-virtual|invoke-static|invoke-direct" app.apkd/smali* | head
`# Find reflection/dynamic loads
`rg -n "const-string.*forName|invoke-static.*Ljava/lang/Class;->forName|DexClassLoader" app.apkd
`# Find suspicious system calls
`rg -n "Runtime;->getRuntime|Runtime;->exec|ProcessBuilder" app.apkd
Look for:

- `invoke-static {..}, Ljava/lang/reflect/Method;->invoke` sequences.
    
- `const-string` with long Base64-looking blobs passed to decryption routines.
    
- Smali code that writes to `/data/data/<pkg>/files` or `getExternalStorageDirectory`.
    

---

## 8 — Native libraries (.so) static inspection

`# List native libs
`unzip -l app.apk | rg "lib/.*\.so"
`# Extract and run quick checks
`unzip app.apk lib/armeabi-v7a/libevil.so -d tmp
`file tmp/libevil.so
`readelf -h tmp/libevil.so
`strings tmp/libevil.so | rg -i "dex|JNI|Java|decrypt|AES|RSA|http|socket|fork|ptrace"
`# use radare2 or ghidra for heavy inspection
`rizin -c "aaa; afl" tmp/libevil.so


Notes:

- Native loader stubs often contain both dex unpacker and anti-analysis checks.
    
- Check for ARM syscalls / inline assembly (rdtsc equivalent, cpuid flags).
    
- Look for `JNI_OnLoad` — typical native init hook.
    

---

## 9 — Sensitive API & permission correlation (static)

- Map `uses-permission` to API calls in code. Example:
    
    - `READ_SMS` / `SEND_SMS` → presence of `SmsManager` or `TelephonyManager` calls.
        
    - `RECORD_AUDIO` → `AudioRecord` usage.
        
    - `INSTALL_PACKAGES` / `REQUEST_INSTALL_PACKAGES` → possible stealth installers.
        
- Quick python (androguard) to map:
    

`from androguard.misc import AnalyzeAPK a, d, dx = AnalyzeAPK("app.apk") perms = set(a.get_permissions()) print("Permissions:", perms) susp = ["SMS","RECORD_AUDIO","INSTALL_PACKAGES","READ_CONTACTS"] print("Suspicious permissions:", [p for p in perms if any(x in p for x in susp)]) # list methods that call TelephonyManager for method in dx.find_methods():     for callee in method.get_xref_to():         if "TelephonyManager" in callee.name:             print(method, "->", callee)`

---

## 10 — Crypto usage & key material (static)

- Search for `Cipher.getInstance`, `KeyFactory`, `RSAPrivateKey`, `SecretKeySpec`, `Mac`, `CipherOutputStream`.
    
- Look for hardcoded keys/IVs (strings of hex/Base64 length 16/24/32 bytes).
    

`rg -n "Cipher.getInstance|SecretKeySpec|KeyFactory|Mac.getInstance|RSA|AES|HmacSHA" app.apkd strings app.apk | rg -E "([A-Fa-f0-9]{32,}|[A-Za-z0-9+/]{40,}=*)"`

Heuristics:

- Hardcoded AES keys or RSA private keys → immediate red flag.
    
- Use of `ECB` or insecure padding → crypto misuse.
    
- Custom crypto loops + long blobs → likely home-brewed or proprietary obfuscation.
    

---

## 11 — Detect reflection & dynamic code loading (critical static indicators)

Search for:

- `Class.forName`, `Method.invoke`, `DexClassLoader`, `PathClassLoader`, `loadDex`, `defineClass`.
    

`rg -n "Class.forName|getMethod|invoke|DexClassLoader|PathClassLoader|loadDex|defineClass" app.apkd`

If found, manually inspect arguments — are they strings or constructed at runtime (obfuscated)? Are they fed from assets/blobs?

---

## 12 — Multi-dex & secondary payloads

- `classes2.dex`, `classes3.dex` often hold payloads or staging code.
    
- Secondary APKs inside `assets/` or `raw/` may be downloaded/loaded. Search:
    

`unzip -l app.apk | rg -i "classes.*dex|assets/.*\.apk|res/raw/.*" strings app.apk | rg -i "classes2|classes3|assets/.*dex"`

---

## 13 — YARA rules / quick signatures

Example YARA snippet to detect DexClassLoader + Base64 blobs:

`rule apk_dynamic_loader {   meta:     desc = "APK using DexClassLoader + large Base64 blobs (potential dynamic loader)"   strings:     $dcls = "dalvik.system.DexClassLoader" ascii     $base64 = /[A-Za-z0-9+\/]{80,}={0,2}/   condition:     $dcls and $base64 }`

Use YARA across corpora to triage.

---

## 14 — Entropy / packing detection (assets & classes.dex)

`# classes.dex entropy quick python3 - <<'PY' import math,sys b=open("classes.dex","rb").read() c=[b.count(bytes([i]))/len(b) for i in range(256)] ent=-sum(p*math.log2(p) for p in c if p>0) print("entropy:",ent) PY # run on assets/* binwalk -E app.apk`

High entropy assets → encrypted/compressed payloads.

---

## 15 — Automated triage workflow (static-only)

1. `aapt dump badging` → gather package/permissions/launcher.
    
2. `apktool d` + `jadx` → decode resources & decompile.
    
3. `apkid` → fingerprint packer/obfuscator.
    
4. `rg`/`grep` scan for indicators (reflection, dynamic loaders, native loads, crypto).
    
5. Inspect `AndroidManifest.xml` for exported components and suspicious permissions.
    
6. Inspect `classes.dex` and `smali` for `DexClassLoader`/`Class.forName`/`System.loadLibrary`.
    
7. Extract `lib/*.so` and run quick `readelf`/`strings`.
    
8. Calculate entropy for classes.dex & assets.
    
9. Run YARA rules and custom regexes.
    
10. Produce a report: entry points, suspicious strings, mapping of permissions→APIs, and recommended runtime tests.
    

---

## 16 — Example androguard scanning script (extracts suspicious artifacts)

Save as `apk_static_scan.py`:

`#!/usr/bin/env python3 from androguard.misc import AnalyzeAPK import sys, re SUSP_FUNCS = ["DexClassLoader","PathClassLoader","forName","getMethod","invoke","System.load","loadLibrary","Runtime.exec","ProcessBuilder","openConnection","HttpsURLConnection","Cipher","SecretKeySpec","Base64"] apk = sys.argv[1] a,d,dx = AnalyzeAPK(apk) print("Package:", a.get_package()) print("Permissions:", a.get_permissions()) # Manifest-exposed components print("Exported components (brief):") for name,ex in a.get_elements("activity"):     pass # Strings scan all_strings = " ".join(d.get_strings()) hits = [s for s in SUSP_FUNCS if s.lower() in all_strings.lower()] print("Suspicious API keywords found:", hits) # Check for DexClassLoader usage via xrefs for method in dx.find_methods(classname=""):     src = method.get_method()     src_name = src.class_name + "->" + src.name     for xref in method.get_xref_to():         if any(k in xref.class_name or k in xref.name for k in ["DexClassLoader","PathClassLoader"]):             print("Dynamic loader xref:", src_name, "->", xref)`

Run: `python3 apk_static_scan.py app.apk`

---

## 17 — Red flags (static triage priorities)

- `DexClassLoader` + encrypted assets + native loader → **packed / dynamic payload** (high priority).
    
- `android:exported="true"` on services/providers + `SEND_SMS`/`RECEIVE_SMS` → possible spyware/fraud.
    
- Hardcoded keys/certs + custom crypto → likely data exfiltration/backdoor.
    
- Native libs with `JNI_OnLoad` and decryption loops → strong indicator of unpacker.
    
- Multiple re-signatures or wrong certificate chain → repackaging.
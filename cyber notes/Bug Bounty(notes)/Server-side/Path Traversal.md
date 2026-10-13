# 📘 Path Traversal Vulnerability – Complete Notes

---

## 🔍 1. What is Path Traversal?

**Path Traversal** (Path traversal is also known as directory traversal. These vulnerabilities enable an attacker to read arbitrary files on the server that is running an application. This might include:

Application code and data.
Credentials for back-end systems.
Sensitive operating system files.
In some cases, an attacker might be able to write to arbitrary files on the server, allowing them to modify application data or behavior, and ultimately take full control of the server..

- **Objective**: Break out of the web root and access sensitive files.
    
- **Examples**: Accessing `/etc/passwd` on Linux or `C:\Windows\system.ini` on Windows.
    

---

## ⚠️ 2. Impact of Path Traversal

- Leakage of sensitive files (e.g., password files, configuration files).
    
- Source code disclosure.
    
- Potential Remote Code Execution (RCE) when chained with other vulnerabilities.
    
- Unauthorized access to logs, credentials, private keys, etc.
    

---

## 🧪 3. Common Payloads

### ➤ UNIX/Linux
`../../../../etc/passwd ..%2F..%2F..%2Fetc%2Fpasswd ..%252F..%252Fetc%252Fpasswd`

### ➤ Windows

`..\..\..\windows\win.ini ..%5C..%5Cwindows\system.ini ..%c0%af..%c0%afwindows\system.ini`

### ➤ Null Byte Injection (in older systems)

`../../../etc/passwd%00.png`

---

## 🔐 4. How to Test for Path Traversal

### ➤ Manual Testing

- Find parameters like `?file=`, `?page=`, `?doc=`, etc.
    
- Inject traversal sequences: `../`, `..%2f`, etc.
    
- Observe response: error message, file content, or server crash.
    

### ➤ Automated Tools

- **Burp Suite** (with Intruder)
    
- **OWASP ZAP**
    
- **DotDotPwn**
    
- **Nikto**
    
- **WFuzz**
    

---

## 🛡️ 5. Prevention & Mitigation

|Method|Description|
|---|---|
|✅ Input Validation|Disallow traversal characters like `../`, `%2e%2e`, `\..`|
|✅ Whitelisting|Only allow access to specific, predefined filenames|
|✅ Canonicalization|Use `realpath()` or similar to resolve file paths|
|✅ Chroot/Containers|Restrict the file access environment|
|✅ Least Privilege|Run web apps with limited file system permissions|
|✅ Disable unnecessary file access|Remove file download/view functionality if not needed|

---

## 🧠 6. Real-World Examples

- **Apache 2.4.49**: Path Traversal + RCE vulnerability (CVE-2021-41773)
    
- **GitHub Archive Bugs**: Vulnerabilities due to archive extraction with directory traversal.
    
- **Zip Slip**: Exploits path traversal in zip extraction libraries.
    

---

## 🧰 7. Practice Labs & Tools

### ➤ Practice Platforms

- PortSwigger Web Security Academy
    
- TryHackMe – _File Inclusion_, _OWASP Top 10_
    
- Hack The Box – _LFI/Path Traversal challenges_
    

### ➤ Tools

- Burp Suite
    
- OWASP ZAP
    
- Nikto
    
- DotDotPwn
    
- DirBuster
    

---

## 📚 8. Top Learning Resources

|Source|Link|
|---|---|
|OWASP|Path Traversal Cheat Sheet|
|PortSwigger|Labs & Articles|
|Snyk Blog|Mitigating Path Traversal|
|YesWeHack|API + Path Traversal Guide|

---

## 📝 9. Summary Table

|Topic|Notes|
|---|---|
|💥 Vulnerability|Path Traversal (Directory Traversal)|
|🔎 Goal|Access restricted files outside web root|
|🧪 Payloads|`../../../../etc/passwd`, `..%2F..%2Fwin.ini`|
|🛠 Tools|Burp Suite, ZAP, Nikto, DotDotPwn|
|🛡 Fixes|Whitelisting, input validation, canonical paths, sandboxing|
|🧠 Practice|PortSwigger Academy, TryHackMe, HTB|
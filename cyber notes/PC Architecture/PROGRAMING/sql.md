# 📘 Full SQL Language Notes

---

## 🧠 What is SQL?

**SQL (Structured Query Language)** is the standard language used to communicate with relational databases. It allows you to **create**, **read**, **update**, and **delete** (CRUD) data.

---

## 📁 SQL Command Categories

|Category|Description|Commands|
|---|---|---|
|DDL (Data Definition Language)|Define database structures|`CREATE`, `ALTER`, `DROP`, `TRUNCATE`|
|DML (Data Manipulation Language)|Manage data|`SELECT`, `INSERT`, `UPDATE`, `DELETE`|
|DCL (Data Control Language)|Manage permissions|`GRANT`, `REVOKE`|
|TCL (Transaction Control Language)|Manage transactions|`COMMIT`, `ROLLBACK`, `SAVEPOINT`|

---

## 📌 SQL Data Types

|Data Type|Description|
|---|---|
|`INT`|Integer|
|`FLOAT`|Floating-point number|
|`DECIMAL(p,s)`|Fixed precision number|
|`CHAR(n)`|Fixed-length string|
|`VARCHAR(n)`|Variable-length string|
|`TEXT`|Long text|
|`DATE`|Date|
|`TIME`|Time|
|`DATETIME`|Date and time|
|`BOOLEAN`|TRUE or FALSE|

---

## 🧱 DDL (Data Definition Language)

### Create Table

sql



`CREATE TABLE students (     id INT PRIMARY KEY,     name VARCHAR(100),     age INT,     email VARCHAR(100) );`

### Alter Table

sql



`ALTER TABLE students ADD gender VARCHAR(10); ALTER TABLE students DROP COLUMN email;`

### Drop Table

sql



`DROP TABLE students;`

### Truncate Table

sql



`TRUNCATE TABLE students;  -- Deletes all rows but keeps structure`

---

## 🧰 DML (Data Manipulation Language)

### Insert Data

sql



`INSERT INTO students (id, name, age) VALUES (1, 'Alice', 20);`

### Select Data

sql



`SELECT * FROM students; SELECT name, age FROM students WHERE age > 18;`

### Update Data

sql



`UPDATE students SET age = 21 WHERE name = 'Alice';`

### Delete Data

sql



`DELETE FROM students WHERE id = 1;`

---

## 🧠 SQL Clauses

|Clause|Use|
|---|---|
|`WHERE`|Filter rows|
|`ORDER BY`|Sort results|
|`GROUP BY`|Group rows|
|`HAVING`|Filter grouped rows|
|`LIMIT`|Limit result rows|
|`OFFSET`|Skip rows|

Example:

sql



`SELECT name, COUNT(*)  FROM students  GROUP BY name  HAVING COUNT(*) > 1  ORDER BY COUNT(*) DESC;`

---

## 🔗 SQL Joins

|Type|Description|
|---|---|
|`INNER JOIN`|Match in both tables|
|`LEFT JOIN`|All rows from left, matched from right|
|`RIGHT JOIN`|All rows from right, matched from left|
|`FULL JOIN`|All rows from both tables|
|`SELF JOIN`|Join table to itself|

Example:

sql



`SELECT e.name, d.department_name FROM employees e INNER JOIN departments d ON e.department_id = d.id;`

---

## 🔍 SQL Operators

### Comparison:

- `=`, `!=`, `<`, `>`, `<=`, `>=`
    

### Logical:

- `AND`, `OR`, `NOT`
    

### Other:

- `BETWEEN`, `IN`, `LIKE`, `IS NULL`, `EXISTS`
    

Example:

sql



`SELECT * FROM users WHERE age BETWEEN 18 AND 30 AND city IN ('NY', 'London');`

---

## 🧮 SQL Functions

### Aggregate Functions:

|Function|Description|
|---|---|
|`COUNT()`|Number of rows|
|`SUM()`|Total sum|
|`AVG()`|Average|
|`MIN()`|Minimum value|
|`MAX()`|Maximum value|

### String Functions:

- `LENGTH()`, `UPPER()`, `LOWER()`, `SUBSTRING()`, `REPLACE()`, `CONCAT()`, `TRIM()`
    

### Date Functions:

- `NOW()`, `CURDATE()`, `DATEDIFF()`, `DATE_ADD()`, `YEAR()`, `MONTH()`, `DAY()`
    

---

## 🔐 SQL Constraints

|Constraint|Description|
|---|---|
|`PRIMARY KEY`|Unique row identifier|
|`FOREIGN KEY`|Link to another table's primary key|
|`NOT NULL`|No NULL values|
|`UNIQUE`|All values must be unique|
|`CHECK`|Validate condition|
|`DEFAULT`|Set default value|

Example:

sql



`CREATE TABLE orders (     id INT PRIMARY KEY,     user_id INT,     amount DECIMAL(10,2) DEFAULT 0.00,     CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) );`

---

## 🔄 TCL (Transaction Control Language)

sql



`BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 1; UPDATE accounts SET balance = balance + 100 WHERE id = 2; COMMIT;  -- or ROLLBACK;`

---

## 🔐 DCL (Data Control Language)

sql



`GRANT SELECT, INSERT ON database_name.* TO 'user'@'localhost'; REVOKE INSERT ON database_name.* FROM 'user'@'localhost';`

---

## ⚙️ Subqueries

sql



`SELECT name FROM students WHERE age > (SELECT AVG(age) FROM students);`

---

## 🧪 Views

sql



`CREATE VIEW high_scores AS SELECT name, score FROM exams WHERE score > 90;  SELECT * FROM high_scores;`

---

## 📦 Indexes

sql



`CREATE INDEX idx_name ON students(name); DROP INDEX idx_name ON students;`

---

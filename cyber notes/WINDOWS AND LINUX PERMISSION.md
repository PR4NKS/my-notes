## 🔐 WINDOWS PERMISSIONS – `icacls`

| Command                              | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `icacls file.txt`                    | View current ACLs (permissions) |
| `icacls file.txt /grant John:(R,W)`  | Grant read & write to John      |
| `icacls file.txt /grant Users:(R)`   | Grant read to group Users       |
| `icacls file.txt /remove John`       | Remove all permissions for John |
| `icacls file.txt /reset`             | Reset permissions to default    |
| `icacls file.txt /setowner John`     | Take/change ownership to John   |
| `icacls folder /save aclfile.txt`    | Save ACLs to file               |
| `icacls folder /restore aclfile.txt` | Restore ACLs from file          |

> 🔸 Tip: Use `/T` to apply recursively to subfolders.

---

## 🐧 LINUX PERMISSIONS – `chmod`, `chown`, `ls -l`

### **Symbolic Format** (from `ls -l`)

Example: `-rwxr-xr--`

|Section|Meaning|
|---|---|
|`-`|File type (`-` = file, `d` = directory)|
|`rwx`|User (owner) permissions|
|`r-x`|Group permissions|
|`r--`|Others permissions|

---

### **Octal Format** (for `chmod`)

|Permission|Value|
|---|---|
|`r`|4|
|`w`|2|
|`x`|1|

Example:  
`chmod 755 file` means:

- User: `rwx` (7)
    
- Group: `r-x` (5)
    
- Others: `r-x` (5)
    

---

## Special Bits:

### ✅ SetUID (SUID)

- **Symbol**: `s` in **user** execute field
    
- **Octal**: `4`
    
- Example: `chmod 4755 file`
    
- File runs with **owner's privileges**
    
- Format: `-rwsr-xr-x`
    

### ✅ SetGID (SGID)

- **Symbol**: `s` in **group** execute field
    
- **Octal**: `2`
    
- Example: `chmod 2755 dir`
    
- For directories: new files inherit group
    
- Format: `drwxr-sr-x`
    

### ✅ Sticky Bit

- **Symbol**: `t` in **others** execute field
    
- **Octal**: `1`
    
- Example: `chmod 1777 /tmp`
    
- Only owners can delete their files
    
- Format: `drwxrwxrwt`
    

---

## Bonus: Ownership

- `chown user file` – Change file owner
    
- `chown user:group file` – Change owner & group
    
- `chgrp group file` – Change group only
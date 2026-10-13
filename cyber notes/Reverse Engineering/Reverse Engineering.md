# Reverse Engineering 
## 1. **Reverse Engineering (RE)**

- **Definition**:  
    The process of analyzing a system, product, or software to identify its components, structure, functions, and operation.  
    → Basically, _working backward_ from a finished product to understand how it was made.
    
- **Purpose**:
    
    - Recover lost documentation
        
    - Learn from competitors’ products
        
    - Detect vulnerabilities & improve security
        
    - Software debugging / malware analysis
        
    - Modernization & system integration
        
- **Applications**:
    
    - Software (apps, malware, operating systems)
        
    - Hardware (chips, circuits, devices)
        
    - Mechanical systems (machines, engines)
        

---

## 2. **Types of Analysis in Reverse Engineering**

### A. **Static Analysis**

- **Definition**: Examining the code or structure _without executing it_.
    
- **Methods**:
    
    - Disassembly (machine code → assembly)
        
    - Decompilation
        
    - File format & metadata inspection
        
- **Use case**: Malware analysis, finding vulnerabilities, understanding software logic.
    

---

### B. **Dynamic Analysis**

- **Definition**: Observing a system _while it runs_.
    
- **Methods**:
    
    - Debugging tools (step-by-step execution)
        
    - Monitoring API calls, system calls, memory usage
        
    - Sandboxing (running safely in a controlled environment)
        
- **Use case**: Malware behavior tracking, runtime performance study.
    

---

### C. **Comparative (Differential) Analysis**

- **Definition**: Comparing multiple versions of a system or product to identify changes.
    
- **Use case**: Patch analysis (finding what a software update fixed or added).
    

---

### D. **Black Box Analysis**

- **Definition**: Studying the system only through its **inputs and outputs**, without internal knowledge.
    
- **Use case**: Testing proprietary software, penetration testing.
    

---

### E. **White Box Analysis**

- **Definition**: Full access to the internal design (source code, architecture, hardware layout).
    
- **Use case**: Security audit, debugging.
    

---

### F. **Grey Box Analysis**

- **Definition**: Partial knowledge of the system; mix of black box & white box.
    
- **Use case**: Software testing, system validation.
    

---

## 3. **Steps in Reverse Engineering**

1. **Collection** → Gather target system/software
    
2. **Preparation** → Set up tools (debugger, disassembler, emulator, etc.)
    
3. **Analysis** → Perform static & dynamic checks
    
4. **Documentation** → Record structure, algorithms, functions
    
5. **Reconstruction/Improvement** → Rebuild or enhance system
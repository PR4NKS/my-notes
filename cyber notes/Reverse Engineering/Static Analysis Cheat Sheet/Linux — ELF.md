# 1 — Fast metadata & sanity checks

`file target_binary
`readelf -h target_binary            # ELF header (class, type, machine)
`readelf -l target_binary            # program headers (PT_LOAD, PT_DYNAMIC, INTERP)
`stat target_binary
`ls -l target_binary                 # SUID/SGID bits
`getcap target_binary || true        # file capabilities

What to search for:

- `ET_EXEC` or `ET_DYN` (PIE). PIE typically `ET_DYN` for executables.
    
- `ELF64` or `ELF32` and CPU (x86_64, aarch64).
    
- SUID/SGID or file capabilities → raise review priority.
# 2 — Sections, segments, and layout

`readelf -S target_binary            # sections (.text, .rodata, .data, .bss, .init_array, .note)
`readelf -l target_binary            # program headers with VMA/offsets/sizes
`objdump -h target_binary
Watch out for:

- Unusual writable & executable sections (WX): **red flag**.
    
- Large `.rodata` with high entropy → embedded/compressed payload.
- `.init_array`, `.fini_array`, `.ctors` — early-execution hooks (executed before `main`).

# 3 — Dynamic sections, DT_NEEDED, RPATH, RUNPATH

`readelf -d target_binary
`objdump -p target_binary
`readelf -V target_binary            # version info

Check:

- `DT_NEEDED` list — unusual/packaged/shared libs.
    
- `DT_RPATH` / `DT_RUNPATH` — unusual hardcoded library search paths.
    
- `INTERP` (dynamic loader) — unusual interpreter path = suspicious.

# 4 — Symbol tables & stripping status

`nm -C target_binary | head
`nm -D target_binary                 # dynamic symbols (exports)
`objdump -T target_binary
`readelf --symbols target_binary

Heuristics:

- Stripped binary: very few/no symbols → use relocation info, strings, and cross refs.
- Names of symbols with suspicious tags (`_init`, `ctor`, `unload`, `evil`, `net_`, `connect`, `exec`) should be checked.
# 5 — Security flags (PIE, RELRO, Canary, NX)

`checksec or manual commands:
`readelf -h target_binary | egrep "Type|Class"
`readelf -l target_binary | grep GNU_STACK
`readelf -s target_binary | grep __stack_chk_fail
`readelf -d target_binary | egrep "RELRO|BIND_NOW|FLAGS"
` or use checksec.sh if installed:
`checksec --file=target_binary
Interpretation:

- Missing NX / executable stack ⇒ injection vulnerability.
- Partial/Full RELRO differences influence GOT overwrite mitigation.

- Existence of `__stack_chk_fail` suggests stack canary usage.

# 6 — PLT / GOT / relocations & dynamic linking patterns

`objdump -d -j .plt target_binary
`readelf -r target_binary
`objdump -D target_binary | grep -n "@plt"    # locate call sites to dynamic imports
`readelf -S target_binary | egrep ".got|.plt"

Search for:

- Invocations of PLT entries mapping to network/file/syscall wrappers (socket, connect, execve).

- Unusual relocations — numerous RELA entries targeting .text may be indicative of trampoline/obfuscation.

# 7 — Syscalls & low-level operations (static detection)

Look for syscall usage and suspicious symbols in disassembly and strings:

`objdump -d target_binary | egrep -i "syscall|int +0x80|sysenter|syscall" -n objdump -d target_binary | egrep -i "socket|connect|accept|execve|fork|clone|open|openat|ptrace|prctl" -n strings target_binary | egrep -i "socket|connect|execve|ptrace|prctl|gettimeofday|rdtsc"`

If syscalls are present: map them to behavior (networking, process control, file access).
# 8 — High-entropy / packing / embedded blobs

`binwalk -E target_binary              # entropy map`
`strings -a target_binary | less`
`xxd -s 0 -l 512 target_binary | head`
`objcopy --dump-section .rodata=rodata.bin target_binary`

Heuristics:

- Sections with entropy > ~7.5 usually compressed/encrypted.
- `binwalk -e` can try to extract embedded files (zip, elf, compressed blocks).

- Embedded `MZ`, `PK` or `ELF` signatures in `.rodata` → nested payloads.

# 9 — TLS / early-init / constructors (.init_array)

`readelf --notes target_binary
`readelf -W --sections target_binary | egrep ".init_array|.ctors|.plt"
`readelf -x .init_array target_binary   # dump bytes

Why it matters:

- Code in `.init_array` executes prior to `main`. Typical location for stealthy bootstrapping or anti-analysis.

# 10 — Find anti-analysis static indicators

Look for strings/patterns and functions typically used for anti-debug/anti-VM:

`symbol-level
`objdump -T target_binary | egrep -i "ptrace|prctl|gettimeofday|clock_gettime|rdtsc|cpuid|syscall|int"

`strings
`strings target_binary | egrep -i "vbox|vmware|qemu|virtualbox|sandbox|debugger|is_debugger|IsDebuggerPresent"

Static red flags:

- Inline `cpuid` / `rdtsc` instructions, or hypervisor bit checks.
    - 
- CRC/checksum functions that check `.text` integrity.
    - 
- Custom function dispatch through hashing (strings reveal hash patterns or constant decoding loops).

# 11 — Code-flow & pattern heuristics (disassembly)

Employ radare2/rizin or objdump for light-weight static CFG analysis:

`radare2 quick`
`rizin -c 'aaa; afl' target_binary
`rizin -c 'aaa; agf main' target_binary   # print graph for main

`radare2: list cross-references to strings
`rizin -c 'aaa; izz' target_binary
`rizin -c 'aaa; axt sym.funcname' target_binary

Heuristics:

- Short import table + lots of `LoadLibrary`/`GetProcAddress`-similar idioms in ELF (hashed API resolution) → dynamic resolution/obfuscation.
- Dense decode loops pointing to `.rodata` byte blobs → probable decryptors.

# 12 — Automation: Python static scanner (pyelftools)

A small static scanner that prints headers, dynamic libs, suspicious symbols, and per-section entropy.


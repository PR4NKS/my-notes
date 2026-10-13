[[[[[[[]()]()]()]()]()]()]()## I. Mobile Security: Pokémon Go Protocol Discovery

The goal of the research was to build a custom Pokémon scanner, driven by the scarcity of Pokémon in the researcher's rural location in 2016. This effort involved reversing proprietary Niantic protocols and overcoming subsequent anti-cheat defenses.

A. Initial Traffic Analysis and Protocol Identification

1. **Sniffing Attack:** The discovery began with a **sniffing attack** to view the traffic between the _Pokémon Go_ app (Android or Apple device) and the server.

    ◦ The tool used for this traffic interception was an HTTP proxy, specifically **Fiddler Classic**.

    ◦ Initial observation showed the app falsely reported the request content type as form URL encoded, even though the protocol was **clearly binary**.

2. **Protocol Buffers (Protobuff):** Based on the binary traffic, clues like the first byte being `08` and "glimpses of readable text" confirmed the protocol as **Protobuff** (Protocol Buffers).

    ◦ Protobuff is a serialization framework developed by Google that enables complex object communication between systems like a mobile app and a server.

    ◦ To decode the Protobuff messages without the original definitions, the **protoc** **tool** was used with the **decode raw** **flag**.

    ◦ Researchers employed inference techniques, such as converting hex-encoded integers to floats to reveal **coordinate data** (location) and analyzing clear values (like Open ID tokens) to confirm authentication fields.

## B. API Structure and Core Request

1. **Message Format:** The core message sent is a **"request container,"** which holds metadata (request ID, location, and authentication information) and a repeated field containing specific requests. The server returns a matching **response container**.

2. **Key API Call:** The crucial request for the scanner was identified as **request number 106**, later named `get map object`.

    ◦ This request takes an **S2 cell ID** (specifically Level 15) as input, which is a 64-bit identifier converted from Earth coordinates.

    ◦ The response includes a map cell object containing the **exact location of catchable Pokémon** and other objects like gyms (forts) and PokéStops.

3. **Initial Security:** Initially, the server was "very very lax," requiring only the request identifier, authentication info, and the single request 106 with the cell ID to succeed.

## C. Overcoming Anti-Cheat Mechanisms

Following a major update, Niantic deployed sophisticated defenses that necessitated a **three-day hackathon** by the mobile hacking community (like Pogdev).

1. **Defense 1: Certificate Pinning**

    ◦ **Detection:** The app began refusing to turn on or record traffic in Fiddler, indicating the proxy was detected. This mechanism was **certificate pinning**, implemented via a Java class called `Niantic Trust Manager`. The app checked if the server's public key matched the one hardcoded in the application.

    ◦ **Evasion Technique: Dynamic Reverse Engineering** Frameworks like **Xposed** were used to "hook" the critical function (`check server trusted`). By replacing the certificate being validated with a **real certificate chain** taken from the actual server, the app was fooled into believing it was communicating legitimately.

2. **Defense 2: The Encrypted Signature ("Unknown 6")**

    ◦ **Enforcement:** After the pinning bypass, the server began validating **field 6** (`Unknown 6`), making it mandatory. Researchers formed "Team Unknown 6" to crack this element.

    ◦ **Passive Analysis and Cryptography:** Samples showed Unknown 6 was an encrypted signature, always a **multiple of 256 bytes plus 32 bytes** in size. The encryption was a known cryptographic scheme called **CBC mode** (Cipher Block Chaining mode), initialized with a 32-byte seed dependent on time.

    ◦ **Static Analysis:** The creation function, the **sig encrypt function**, was located in the native C/C++ part of the app (`libniantic manager`), requiring **Static Reverse Engineering** tools like **IDA** and **Ghidra**. The function was located by tracing cross-references to the system's **time** **function**.

    ◦ **Signature Forgery:** The raw signature input was a Protobuff object that included device details, GPS location, and **sensor information** (like acceleration and gravity), leading to initial concerns that this hard-to-forge data was required. However, **active probing** revealed that **most fields were not required** by the server. The necessary fields included timestamps and specific hashes (using **xx Hash**) based on location and authentication info.

--------------------------------------------------------------------------------
![[NotebookLM Mind Map (1).png]]
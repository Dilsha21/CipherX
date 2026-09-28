import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_lib import *

ACCENT = "28546F"

doc = new_doc()
add_masthead(doc, 2)
add_cover(
    doc,
    tag="Biometric Authentication Factor",
    title="Biometric Authentication Factor: Design",
    subtitle="Design of the on-device fingerprint/face verification subsystem: enrolment and verification flow, secure-enclave key handling, and fallback behaviour.",
    meta=[
        ("Group Name", "[Group Name]"),
        ("Module", "Computer Security — Group Project"),
        ("Student Name (Initials)", "[B. Student]"),
        ("Student ID", "[Student ID]"),
        ("Date", "15 September 2026"),
        ("Contribution Area", "Biometric Factor"),
    ],
    accent_hex=ACCENT,
)

add_section_heading(doc, 1, "Scope of My Contribution", ACCENT)
add_para(doc, "My contribution is the detailed design of the biometric authentication factor introduced at the architectural level in Document 1 (§4, component Platform Biometric API → Biometric Assertion Verifier). This covers how the fingerprint/face factor is enrolled, how a verification challenge is issued and answered, what data crosses the network, and how the system degrades gracefully when biometric hardware is unavailable — while remaining usable by a blind or low-vision user without any reliance on reading a screen.")

add_section_heading(doc, 2, "Assumptions", ACCENT)
add_assumptions(doc, [
    ("B1", "The user's device contains a hardware-backed secure enclave or trusted execution environment (Apple Secure Enclave, or Android StrongBox/TEE) and the user has already enrolled a fingerprint or face at the OS level, prior to using this system (consistent with A1 in Document 1)."),
    ("B2", "The application never implements its own fingerprint or camera capture. It calls only the platform's biometric API (Android BiometricPrompt, iOS LocalAuthentication) and receives a pass/fail plus a cryptographic signature — it never sees raw biometric data."),
    ("B3", "If the device has no biometric hardware, or the user fails biometric verification three times, the platform API itself falls back to the device passcode/PIN as the local unlock step, which is standard OS behaviour for both BiometricPrompt and LocalAuthentication and is not re-implemented by this system."),
    ("B4", "The platform biometric prompts (BiometricPrompt / LocalAuthentication) are assumed to already be screen-reader accessible out of the box, since both Android and iOS document these system dialogues as accessibility-API compliant — this system relies on that rather than building a custom prompt."),
], ACCENT)

add_section_heading(doc, 3, "Design: Key-Based Assertion Model", ACCENT)
add_para(doc, "Rather than sending a fingerprint image or facial scan to the server for comparison, the design follows the model standardised by FIDO2/WebAuthn: at enrolment, the device generates an asymmetric key pair inside the secure enclave. The private key never leaves the enclave and is only usable after a successful local biometric or PIN unlock. The public key is registered with the server. At verification time, the server sends a random challenge; the device signs it with the private key (after biometric unlock) and returns the signature. The server verifies the signature against the stored public key. No biometric data — raw or templated — ever traverses the network or is stored server-side.")

add_section_heading(doc, 4, "Sequence Diagram", ACCENT)
diagram_path = os.path.join(os.path.dirname(__file__), "diagrams", "diagram2.png")
add_diagram(doc, diagram_path, "Figure 1. Enrolment and verification sequence for the biometric factor. The trust boundary is the Secure Enclave/TEE: no message leaving that boundary ever carries raw or templated biometric data — only a pass/fail result and, on success, a digital signature.")

add_section_heading(doc, 5, "Design Decisions & Justification", ACCENT)
add_table(doc, ["Decision", "Justification"], [
    ["Adopt the WebAuthn/FIDO2 public-key assertion model instead of transmitting or centrally storing biometric templates.",
     "Biometric data is irrevocable — unlike a password, a leaked fingerprint cannot be reset. The W3C WebAuthn Level 2 specification and the FIDO Alliance were explicitly designed around this principle: biometric material stays on the device, and only a signed assertion is shared. This eliminates server-side biometric data breach risk entirely by design."],
    ["Use the platform's native biometric APIs (BiometricPrompt / LocalAuthentication) instead of a custom-built capture UI.",
     "Both APIs are documented by Google and Apple as conforming to their respective accessibility frameworks, meaning TalkBack/VoiceOver announce the prompt correctly without extra engineering — directly serving the target user group without this team needing to re-solve accessible camera/sensor UI from scratch."],
    ["Allow up to three retries before falling back to device passcode.",
     "Balances usability against brute-force resistance; three attempts is the platform default for both Android and iOS biometric frameworks and matches common industry throttling practice referenced in NIST SP 800-63B for local authenticators."],
    ["Treat biometric match accuracy (False Accept/Reject Rate) as a platform-level property, not something this system re-measures.",
     "Biometric performance testing is a specialised discipline with its own standard (ISO/IEC 19795-1); relying on the platform vendor's certified sensor and matcher is appropriate for an academic system rather than attempting independent FAR/FRR evaluation."],
])

add_section_heading(doc, 6, "References", ACCENT)
add_references(doc, [
    "World Wide Web Consortium (2021) Web Authentication: An API for Accessing Public Key Credentials Level 2 (WebAuthn). W3C Recommendation.",
    "FIDO Alliance (2022) FIDO2: WebAuthn & CTAP Overview. Available at: fidoalliance.org/fido2.",
    "Google Android Developers (2023) Biometric Authentication — BiometricPrompt. Available at: developer.android.com/training/sign-in/biometric-auth.",
    "Apple Inc. (2023) LocalAuthentication Framework Documentation. Available at: developer.apple.com/documentation/localauthentication.",
    "International Organization for Standardization (2021) ISO/IEC 19795-1:2021 — Biometric Performance Testing and Reporting.",
    "National Institute of Standards and Technology (2017) SP 800-63B: Digital Identity Guidelines. Gaithersburg, MD: NIST.",
])

add_footer_note(doc, 2)

out_path = os.path.join(os.path.dirname(__file__), "..", "Doc2 - Biometric Authentication Factor.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

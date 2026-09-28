import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_lib import *

ACCENT = "1B4D45"

doc = new_doc()
add_masthead(doc, 1)
add_cover(
    doc,
    tag="System Architecture & Requirements",
    title="Overall System Architecture and Requirements Specification",
    subtitle="Defining the end-to-end architecture, functional/non-functional requirements, and the rationale for selecting biometric authentication and voice-call OTP as the two supplementary factors.",
    meta=[
        ("Group Name", "[Group Name]"),
        ("Module", "Computer Security — Group Project"),
        ("Student Name (Initials)", "[A. Student]"),
        ("Student ID", "[Student ID]"),
        ("Date", "15 September 2026"),
        ("Contribution Area", "Architecture & Requirements"),
    ],
    accent_hex=ACCENT,
)

# 1. Scope
add_section_heading(doc, 1, "Scope of My Contribution", ACCENT)
add_para(doc, "My contribution to the group design is the overall system architecture: defining the components of the authentication system, how they communicate, the functional and non-functional requirements the design must satisfy, and the top-level justification for choosing on-device biometric verification and voice-call one-time-passcode (OTP) delivery as the two authentication factors used alongside a base account credential. The detailed internal design of the biometric subsystem, the voice-call subsystem, the accessible interaction flow, and the security/threat model are each covered by the other four documents in this submission, which this architecture defines the boundaries for.")

# 2. Assumptions
add_section_heading(doc, 2, "Assumptions", ACCENT)
add_para(doc, "The following assumptions were necessary to scope an achievable academic system. Each is stated explicitly, as required.")
add_assumptions(doc, [
    ("A1", "The user owns a smartphone (Android 10+ or iOS 14+) with a fingerprint sensor or face-recognition camera that is already enrolled at the operating-system level. This system does not capture or train new biometric templates — see Document 2."),
    ("A2", "The user has a registered telephone number (mobile or landline) that can receive a voice call. It does not need to be a smartphone number or have a data connection — this is precisely why voice call was chosen over app-based push or SMS (justified in §5)."),
    ("A3", "The user already operates a screen reader appropriate to their platform (TalkBack, VoiceOver, or NVDA/JAWS for a desktop companion site). The system conforms to platform accessibility APIs rather than building a custom audio interface — see Document 4."),
    ("A4", "A base “something you know” factor (account username plus PIN/password, entered through an accessible form) precedes the two factors in scope for this project, giving three factors in total. This project's scope is the two additional factors named in the brief: biometric and voice call."),
    ("A5", "The mobile app has a general internet (Wi-Fi/cellular data) connection for app–server communication, while the voice call is delivered over the public switched telephone network (PSTN) independently of that data connection — providing resilience if data connectivity fails."),
    ("A6", "Biometric matching happens on-device inside a secure enclave/trusted execution environment; the server only ever receives a cryptographic assertion, never a raw fingerprint or facial image (elaborated in Document 2)."),
    ("A7", "A third-party telephony gateway (e.g. Twilio Programmable Voice) is used to place the automated call, rather than building custom PSTN switching infrastructure — a reasonable simplification for an academic system."),
    ("A8", "Users are enrolled (device biometric key registered, phone number verified) prior to their first authentication attempt; the enrolment workflow itself is out of scope for this design."),
], ACCENT)

# 3. Requirements
add_section_heading(doc, 3, "Requirements", ACCENT)
add_subheading(doc, "Functional Requirements")
add_table(doc, ["ID", "Requirement"], [
    ["FR1", "The system shall accept a base account credential before requesting either supplementary factor."],
    ["FR2", "The system shall request a biometric assertion from the user's device (fingerprint or face) as the second factor."],
    ["FR3", "The system shall place an automated voice call to the user's registered number and read a one-time numeric code aloud as the third factor."],
    ["FR4", "The system shall allow the user to complete authentication using only non-visual interaction (audio prompts, screen-reader-compatible controls, keypad/voice input) end to end."],
    ["FR5", "The system shall provide an accessible fallback path if a factor fails (e.g. biometric hardware unavailable) without silently reducing security below two independent factors."],
    ["FR6", "The system shall log every authentication attempt (success/failure, factor used, timestamp) for audit purposes."],
])
add_subheading(doc, "Non-Functional Requirements")
add_table(doc, ["ID", "Requirement", "Driver"], [
    ["NFR1", "Conform to WCAG 2.1 Level AA across the mobile client.", "W3C, 2018"],
    ["NFR2", "Meet NIST Authenticator Assurance Level 2 (AAL2): two distinct factor categories, one of which is cryptographically bound to the device.", "NIST SP 800-63B"],
    ["NFR3", "All network traffic encrypted in transit (TLS 1.3); no plaintext OTP or biometric data at rest.", "OWASP ASVS v4"],
    ["NFR4", "Voice-call factor must succeed on a basic PSTN line with no data connection, for resilience and reach.", "Design goal"],
    ["NFR5", "End-to-end authentication (all 3 factors) should complete in under 60 seconds under normal conditions.", "Usability goal"],
])

# 4. Diagram
add_section_heading(doc, 4, "System Architecture Diagram", ACCENT)
diagram_path = os.path.join(os.path.dirname(__file__), "diagrams", "diagram1.png")
add_diagram(doc, diagram_path, "Figure 1. Top-level component and data-flow diagram of the three-factor authentication system. Solid arrows are synchronous request/response calls; the dotted arrow from the phone represents the out-of-band voice channel the user relays back into the app manually.")

# 5. Design decisions
add_section_heading(doc, 5, "Design Decisions & Justification", ACCENT)
add_table(doc, ["Decision", "Justification"], [
    ["Use on-device biometric matching (not server-side biometric capture) as the second factor.",
     "Keeps raw biometric data off the network and off the server entirely, following the model used by the W3C WebAuthn / FIDO2 standard. Reduces liability and matches NIST SP 800-63B guidance that biometrics should be used as a local unlock mechanism bound to a cryptographic key, not transmitted as raw data."],
    ["Use a voice call rather than SMS or push notification for the third factor.",
     "SMS and push both rely on the user reading text, which either requires functional vision or dependable screen-reader interception of a specific notification — inconsistent across lock-screen and OS versions. A voice call is inherently audio and works even on a basic phone line with no data connection, directly serving the target user group. The World Health Organization estimates 2.2 billion people globally live with some form of vision impairment (WHO, 2023), underscoring the need for a non-visual channel."],
    ["Structure the backend as an orchestrator plus independent factor services rather than one monolithic auth function.",
     "Separating the biometric verifier, OTP/voice service, and session service allows each to be designed, tested, and reasoned about independently — reflected in this submission's own division of work across Documents 2, 3, and 5."],
    ["Target NIST AAL2 rather than AAL1 or AAL3.",
     "AAL2 requires two distinct factor categories with at least one resistant to replay, which biometric-plus-possession-of-phone satisfies without the added hardware-token cost of AAL3 — an appropriate balance for a consumer-facing accessibility-first system (NIST SP 800-63B, §4.2–4.3)."],
])

# 6. References
add_section_heading(doc, 6, "References", ACCENT)
add_references(doc, [
    "National Institute of Standards and Technology (2017) SP 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management. Gaithersburg, MD: NIST.",
    "World Wide Web Consortium (2021) Web Authentication: An API for Accessing Public Key Credentials Level 2 (WebAuthn). W3C Recommendation.",
    "World Wide Web Consortium (2018) Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation.",
    "World Health Organization (2023) Blindness and Vision Impairment, Fact Sheet. Geneva: WHO.",
    "OWASP Foundation (2021) Application Security Verification Standard (ASVS) v4.0.",
    "Twilio Inc. Programmable Voice API Documentation. Available at: twilio.com/docs/voice.",
])

add_footer_note(doc, 1)

out_path = os.path.join(os.path.dirname(__file__), "..", "Doc1 - System Architecture and Requirements.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

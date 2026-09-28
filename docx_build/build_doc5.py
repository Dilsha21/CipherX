import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_lib import *

ACCENT = "8C3B2E"

doc = new_doc()
add_masthead(doc, 5)
add_cover(
    doc,
    tag="Security Architecture & Threat Model",
    title="Security Architecture and Threat Model",
    subtitle="Cross-cutting security design covering trust boundaries, data protection, and a STRIDE threat model across both the biometric and voice-call factors.",
    meta=[
        ("Group Name", "[Group Name]"),
        ("Module", "Computer Security — Group Project"),
        ("Student Name (Initials)", "[E. Student]"),
        ("Student ID", "[Student ID]"),
        ("Date", "15 September 2026"),
        ("Contribution Area", "Security Architecture & Threat Model"),
    ],
    accent_hex=ACCENT,
)

add_section_heading(doc, 1, "Scope of My Contribution", ACCENT)
add_para(doc, "My contribution is the cross-cutting security design: the trust boundaries between the client, the backend, and the telephony provider established in Document 1; the data-protection rules that constrain how Documents 2 and 3 must handle biometric and OTP data; and a structured threat model (STRIDE) identifying the main attacks against the whole system and the mitigation each one relies on.")

add_section_heading(doc, 2, "Assumptions", ACCENT)
add_assumptions(doc, [
    ("E1", "All client–server traffic is carried over TLS 1.3; no endpoint accepts plaintext HTTP."),
    ("E2", "OTP codes are stored server-side only as salted hashes with a short time-to-live, and are never written to logs in plaintext."),
    ("E3", "Per Document 2, biometric assertions are public-key signatures only; a full server compromise cannot leak biometric templates because none are ever stored there."),
    ("E4", "SIM-swap and call/voicemail-forwarding attacks against the voice-call factor are acknowledged as a residual risk not fully mitigated in this academic prototype; their impact is reduced because an attacker would still separately need the victim's enrolled biometric device (E3) to complete authentication."),
    ("E5", "The third-party telephony provider (e.g. Twilio) is treated as a trusted processor under a standard data-processing agreement — a simplifying assumption appropriate for an academic system, not a production compliance judgement."),
], ACCENT)

add_section_heading(doc, 3, "Trust-Boundary Data-Flow Diagram", ACCENT)
diagram_path = os.path.join(os.path.dirname(__file__), "diagrams", "diagram5.png")
add_diagram(doc, diagram_path, "Figure 1. Trust-boundary data-flow diagram. Each subgraph is a trust zone; every arrow crossing a zone boundary is a point evaluated in the STRIDE table below.")

add_section_heading(doc, 4, "STRIDE Threat Model", ACCENT)
add_table(doc, ["Threat", "Scenario", "Mitigation", "Severity"], [
    ["Spoofing", "Attacker attempts to authenticate as the victim without the victim's device.", "Biometric factor requires the enclave-bound private key (Document 2); unforgeable without physical device access.", "Low"],
    ["Tampering", "Attacker intercepts and modifies the OTP or challenge in transit.", "TLS 1.3 on all client–server traffic (E1); signed challenge-response prevents undetected modification.", "Low"],
    ["Repudiation", "User or attacker denies an authentication event occurred.", "Append-only audit log records every factor outcome with timestamp (Document 1, FR6).", "Low"],
    ["Information Disclosure", "Backend database is breached.", "No raw biometric data server-side (E3); OTPs stored only as short-lived salted hashes (E2).", "Medium"],
    ["Denial of Service", "Attacker repeatedly triggers voice calls to the victim's phone as harassment, exploiting that only an identifier is needed to start a call.", "Rate limiting on call-trigger endpoint, capped retries (Document 3, §5). Disproportionately affects a blind victim who cannot easily screen calls visually, making this a priority mitigation.", "High"],
    ["Elevation of Privilege", "A partially-compromised factor grants more access than intended.", "Orchestrator enforces that all required factors independently succeed before issuing a session token; authorization checks are separate from authentication result.", "Medium"],
    ["SIM-swap / call forwarding", "Attacker redirects the victim's calls to intercept the voice OTP.", "Not fully mitigated (E4) — accepted residual risk; impact bounded by the requirement that the biometric factor, bound to the victim's physical device, must also succeed.", "High (residual)"],
])

add_section_heading(doc, 5, "Design Decisions & Justification", ACCENT)
add_table(doc, ["Decision", "Justification"], [
    ["Require factors from two structurally different channels (device-bound crypto key over data network; voice over PSTN) rather than two factors on the same channel.",
     "NIST SP 800-63B requires AAL2 to combine two distinct factor categories; using channel-diverse delivery (data network vs. telephone network) means a single compromised network does not expose both factors, exceeding the standard's minimum."],
    ["Apply STRIDE as the threat-modelling method.",
     "STRIDE is a widely documented, systematic methodology (Shostack, 2014) well suited to a bounded system with a clear data-flow diagram, making it appropriate for an academic-scope threat model covering all six threat categories without requiring a full production risk-scoring exercise."],
    ["Rank the voice-call denial-of-service scenario as the highest-severity item, above generic information disclosure.",
     "Because the target users are visually impaired, an attacker flooding their phone with authentication calls is not just an availability problem but a direct harassment vector this population is less able to screen or block visually — the severity ranking reflects the accessibility context, not just standard CVSS-style impact."],
    ["Explicitly accept SIM-swap as a residual, not eliminated risk rather than over-claiming a fix.",
     "Full SIM-swap mitigation (e.g. carrier-level number-porting alerts) is outside the control of an application-layer design and outside this project's scope; stating it honestly as residual, bounded by the second independent factor, is more defensible than an unsubstantiated claim of full mitigation."],
])

add_section_heading(doc, 6, "References", ACCENT)
add_references(doc, [
    "National Institute of Standards and Technology (2017) SP 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management. Gaithersburg, MD: NIST.",
    "OWASP Foundation (2021) Application Security Verification Standard (ASVS) v4.0.",
    "Shostack, A. (2014) Threat Modeling: Designing for Security. Indianapolis: Wiley.",
    "Twilio Inc. Voice API Security Documentation. Available at: twilio.com/docs/voice/security.",
])

add_footer_note(doc, 5)

out_path = os.path.join(os.path.dirname(__file__), "..", "Doc5 - Security Architecture and Threat Model.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

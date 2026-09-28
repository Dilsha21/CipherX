import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_lib import *

ACCENT = "8A5A17"

doc = new_doc()
add_masthead(doc, 3)
add_cover(
    doc,
    tag="Voice-Call OTP Factor",
    title="Voice-Call One-Time-Passcode Factor: Design",
    subtitle="Design of the automated outbound voice call that reads a one-time numeric code aloud to the user's registered phone, including IVR replay and anti-abuse controls.",
    meta=[
        ("Group Name", "[Group Name]"),
        ("Module", "Computer Security — Group Project"),
        ("Student Name (Initials)", "[C. Student]"),
        ("Student ID", "[Student ID]"),
        ("Date", "15 September 2026"),
        ("Contribution Area", "Voice-Call OTP Factor"),
    ],
    accent_hex=ACCENT,
)

add_section_heading(doc, 1, "Scope of My Contribution", ACCENT)
add_para(doc, "My contribution is the detailed design of the voice-call OTP factor introduced in Document 1 (§4, components Voice OTP Service and Voice Gateway). This covers how the one-time code is generated and delivered by an automated phone call, how the code is structured for auditory memory rather than reading, how the user can replay it, and the controls that stop the channel being abused for denial-of-service “call bombing”.")

add_section_heading(doc, 2, "Assumptions", ACCENT)
add_assumptions(doc, [
    ("C1", "Calls are placed via a third-party Voice API provider with text-to-speech (TTS) and IVR (interactive voice response / DTMF keypad) capability, e.g. Twilio Programmable Voice, rather than the group building custom telephony switching."),
    ("C2", "The registered number is a standard PSTN or mobile line able to receive a voice call; it does not require a smartphone or data connection, which is the reason this factor was chosen over SMS (see §5)."),
    ("C3", "The user answers the call themselves; call-forwarding/voicemail interception is treated as a residual risk accepted for this academic design (cross-referenced in Document 5, §4, assumption E4)."),
    ("C4", "The user re-enters the spoken code into the mobile app's accessible input field (or, in an IVR-only fallback, confirms it by pressing keys on the call itself) — both paths are screen-reader/keypad operable without reading."),
], ACCENT)

add_section_heading(doc, 3, "Code Design: Length, Pacing, and Replay", ACCENT)
add_para(doc, "The OTP is a 6-digit numeric code. Six digits sits within the widely cited short-term working-memory “chunking” limit of roughly seven items described by Miller (1956), making it plausible for a listener to retain the full code after hearing it once, while remaining a large enough keyspace (1,000,000 combinations) for a rate-limited guessing resistance appropriate to a 5-minute validity window (NIST SP 800-63B). The TTS reads digits individually and slowly (“three... one... nine... zero... four... two”), pauses, and then offers a keypad option: “press 1 to hear the code again, or press 2 to have it read one digit at a time on repeat.” Unlike a text message which stays on screen to be re-read at will, a spoken code disappears the instant it is said — the replay option compensates directly for that difference in modality.")

add_section_heading(doc, 4, "Sequence Diagram", ACCENT)
diagram_path = os.path.join(os.path.dirname(__file__), "diagrams", "diagram3.png")
add_diagram(doc, diagram_path, "Figure 1. Voice-call OTP delivery and verification sequence, including the in-call IVR replay branch that compensates for the transient nature of spoken audio.")

add_section_heading(doc, 5, "Design Decisions & Justification", ACCENT)
add_table(doc, ["Decision", "Justification"], [
    ["Use a voice call rather than SMS as the possession-factor channel.",
     "SMS is a text medium: it requires either sighted reading or a screen reader reliably intercepting a specific notification banner, which is inconsistent across lock-screen states and OS versions. A phone call is audio by construction and works on any call-capable line, directly matching the target users named in the brief."],
    ["Read the code as individual digits, spoken slowly, rather than as a number (“three hundred nineteen thousand...”).",
     "Digit-by-digit reading is the standard IVR/telephone-banking convention precisely because it is easier to transcribe under working-memory load than a compound number; this follows the general chunking-capacity finding of Miller (1956) that people reliably hold around 5–9 discrete items in short-term memory."],
    ["Offer an in-call replay (press 1) rather than a single unrepeatable reading.",
     "Removes the disadvantage voice has relative to a text message — that a visual code stays on-screen while spoken audio does not — without falling back to a visual channel."],
    ["Enforce a 5-minute expiry and a capped retry counter on the code.",
     "Matches NIST SP 800-63B's guidance to throttle authenticator attempts and time-box one-time secrets to limit the exposure window for interception or brute force of the 6-digit space."],
    ["Rate-limit how often a new call can be triggered for one account.",
     "Without a cap, an attacker who has only the account identifier could repeatedly trigger calls to harass the victim (“call bombing”) — a denial-of-service and accessibility-abuse risk addressed jointly with the threat model in Document 5."],
])

add_section_heading(doc, 6, "References", ACCENT)
add_references(doc, [
    "Miller, G.A. (1956) 'The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information', Psychological Review, 63(2), pp. 81–97.",
    "National Institute of Standards and Technology (2017) SP 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management. Gaithersburg, MD: NIST.",
    "Twilio Inc. Programmable Voice & TwiML Documentation. Available at: twilio.com/docs/voice/twiml.",
    "World Wide Web Consortium (2018) Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation.",
])

add_footer_note(doc, 3)

out_path = os.path.join(os.path.dirname(__file__), "..", "Doc3 - Voice-Call OTP Factor.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

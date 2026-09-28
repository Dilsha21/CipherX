import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from docx_lib import *

ACCENT = "7C2E5C"

doc = new_doc()
add_masthead(doc, 4)
add_cover(
    doc,
    tag="Accessible Interaction Flow",
    title="Accessibility & Interaction Flow Design",
    subtitle="Design of the end-to-end, screen-reader-first interaction flow that ties the biometric and voice-call factors together into a single non-visually operable journey, conforming to WCAG 2.1 AA.",
    meta=[
        ("Group Name", "[Group Name]"),
        ("Module", "Computer Security — Group Project"),
        ("Student Name (Initials)", "[D. Student]"),
        ("Student ID", "[Student ID]"),
        ("Date", "15 September 2026"),
        ("Contribution Area", "Accessibility & Interaction Flow"),
    ],
    accent_hex=ACCENT,
)

add_section_heading(doc, 1, "Scope of My Contribution", ACCENT)
add_para(doc, "While Documents 2 and 3 design the internal mechanics of each factor, my contribution is the user-facing interaction design that makes the whole journey — credential entry, biometric prompt, voice call, code entry, and error recovery — usable end-to-end by someone who cannot see the screen at all. This covers screen-state design, what is spoken/announced at each step, focus and timing behaviour, and explicit conformance to WCAG 2.1 Level AA.")

add_section_heading(doc, 2, "Assumptions", ACCENT)
add_assumptions(doc, [
    ("D1", "Interaction is primarily via the user's own already-learned screen reader (TalkBack, VoiceOver, or NVDA) rather than a custom-built audio interface — this system conforms to the platform accessibility APIs (accessible labels, roles, focus order) instead of reinventing screen-reading."),
    ("D2", "No information is ever conveyed by colour, icon shape, or position alone; every state has an equivalent text/spoken label (WCAG SC 1.4.1)."),
    ("D3", "Time limits are generous and extendable, since screen-reader navigation of a form is measurably slower than sighted glance-and-tap interaction (WCAG SC 2.2.1, Timing Adjustable)."),
    ("D4", "No CAPTCHA challenge is included anywhere in the flow. Visual and audio CAPTCHAs are a documented accessibility barrier (W3C WAI, Inaccessibility of CAPTCHA); bot mitigation is instead delegated to the rate-limiting and device-bound biometric key described in Documents 2 and 5, which do not burden the user with an extra puzzle."),
], ACCENT)

add_section_heading(doc, 3, "Interaction State Diagram", ACCENT)
diagram_path = os.path.join(os.path.dirname(__file__), "diagrams", "diagram4.png")
add_diagram(doc, diagram_path, "Figure 1. Interaction state diagram for the full three-factor journey. Each state is annotated with the spoken announcement a screen reader emits on entry, satisfying WCAG SC 4.1.3 (Status Messages) by design rather than as an afterthought.")

add_section_heading(doc, 4, "Design Decisions & Justification", ACCENT)
add_table(doc, ["Decision", "Justification"], [
    ["Present factors sequentially, each with its own announced state, rather than a single combined screen.",
     "A screen reader reads content linearly; combining multiple pending actions onto one screen creates ambiguity about what is currently actionable. Sequential states with an announced heading at each transition satisfies WCAG SC 4.1.3 (Status Messages), which requires state changes to be programmatically determinable without moving visual focus unexpectedly."],
    ["Give every control an accessible label, role, and a minimum touch target of at least 44×44 density-independent points.",
     "Matches the minimum interactive target size recommended in both the Android accessibility guidelines and the Apple Human Interface Guidelines, important given that low vision and reduced fine motor control frequently co-occur in the target population."],
    ["Announce errors immediately with plain-language remediation, never relying on a red border or icon alone.",
     "Directly implements WCAG SC 3.3.1 (Error Identification) and SC 3.3.3 (Error Suggestion), which require errors to be described in text and, where known, accompanied by a suggested fix."],
    ["Omit CAPTCHA entirely from the flow.",
     "The W3C Web Accessibility Initiative documents CAPTCHA (visual and audio variants alike) as an unresolved accessibility barrier; since this system already requires a device-bound biometric key (Document 2) and rate-limits the voice channel (Document 3, Document 5), a CAPTCHA would add friction without adding meaningful bot resistance."],
    ["Make timers on the voice-call step extendable rather than fixed.",
     "WCAG SC 2.2.1 requires users be able to turn off, adjust, or extend time limits except in specific exempted cases; screen-reader-mediated interaction is slower, so a fixed short timeout would disproportionately fail the target users."],
])

add_section_heading(doc, 5, "References", ACCENT)
add_references(doc, [
    "World Wide Web Consortium (2018) Web Content Accessibility Guidelines (WCAG) 2.1 — Success Criteria 1.4.1, 2.2.1, 3.3.1, 3.3.3, 4.1.3. W3C Recommendation.",
    "World Wide Web Consortium, Web Accessibility Initiative (2019) Inaccessibility of CAPTCHA: Alternatives to Visual Turing Tests on Websites. W3C WAI Note.",
    "Google Android Developers (2023) Accessibility — Touch Target Size Guidelines. Available at: developer.android.com/guide/topics/ui/accessibility.",
    "Apple Inc. (2023) Human Interface Guidelines — Accessibility. Available at: developer.apple.com/design/human-interface-guidelines/accessibility.",
])

add_footer_note(doc, 4)

out_path = os.path.join(os.path.dirname(__file__), "..", "Doc4 - Accessible Interaction Flow.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

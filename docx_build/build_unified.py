"""Builds the unified group design document for Submission 2.
Plain formatting only: no Word paragraph styles, no colour accents, no shading.
Direct character formatting (bold/size) is used instead."""
import os
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

HERE = os.path.dirname(__file__)
DIAG = os.path.join(HERE, "diagrams")

doc = Document()

# Base font (direct formatting on Normal, not a new style)
normal = doc.styles['Normal']
normal.font.name = 'Arial'
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.15

sec = doc.sections[0]
sec.left_margin = Cm(2.5)
sec.right_margin = Cm(2.5)
sec.top_margin = Cm(2.0)
sec.bottom_margin = Cm(2.0)


def para(text="", size=11, bold=False, italic=False, align=None, space_before=0, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    if align:
        p.alignment = align
    if text:
        r = p.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(size)
        r.bold = bold
        r.italic = italic
    return p


def heading1(num, text):
    p = para(f"{num}. {text}", size=15, bold=True, space_before=18, space_after=8)
    return p


def heading2(text):
    return para(text, size=12.5, bold=True, space_before=10, space_after=6)


def bullet(text, label=None):
    p = doc.add_paragraph(style='List Bullet')
    if label:
        r = p.add_run(f"{label}  ")
        r.bold = True
        r.font.name = 'Arial'
        r.font.size = Pt(11)
    r2 = p.add_run(text)
    r2.font.name = 'Arial'
    r2.font.size = Pt(11)
    p.paragraph_format.space_after = Pt(6)
    return p


def simple_table(headers, rows):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.style = 'Table Grid'
    table.autofit = True
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].text = ''
        r = hdr[i].paragraphs[0].add_run(h)
        r.bold = True
        r.font.name = 'Arial'
        r.font.size = Pt(10)
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            r = cells[i].paragraphs[0].add_run(val)
            r.font.name = 'Arial'
            r.font.size = Pt(10)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table


def diagram(path, caption, width_cm=15.5):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(path):
        run = p.add_run()
        run.add_picture(path, width=Cm(width_cm))
    else:
        r = p.add_run("[diagram not available]")
        r.italic = True
    cap = para(caption, size=9.5, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)
    return


def refs(items):
    for item in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.6)
        p.paragraph_format.first_line_indent = Cm(-0.6)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(item)
        r.font.name = 'Arial'
        r.font.size = Pt(10)


# ---------------------------------------------------------------
# Cover / title block
# ---------------------------------------------------------------
para("[Group Name]", size=11, bold=True, space_after=2)
para("Computer Security — Group Project — Submission 2 (Combined Design)", size=11, space_after=2)
para("Date: 21 September 2026", size=11, space_after=10)

para("Group Members:", size=11, bold=True, space_after=2)
members = [
    ("[A. Student]", "[Student ID]"),
    ("[B. Student]", "[Student ID]"),
    ("[C. Student]", "[Student ID]"),
    ("[D. Student]", "[Student ID]"),
    ("[E. Student]", "[Student ID]"),
]
for name, sid in members:
    para(f"{name}  —  {sid}", size=11, space_after=2)

para("", space_after=6)
para("Multi-Factor Authentication System for Visually Impaired Users", size=18, bold=True, space_after=4)
para("Unified Group Design Document", size=12, italic=True, space_after=16)

para(
    "This document brings together the five individual contributions submitted by the group "
    "(system architecture, biometric factor design, voice-call OTP factor design, accessible "
    "interaction flow, and security/threat model) into a single, unified design for the proposed "
    "authentication system. Each section states who on the team led that part of the design."
)

# ---------------------------------------------------------------
# 1. Introduction and scope
# ---------------------------------------------------------------
heading1(1, "Introduction and Scope")
para(
    "This project designs a multi-factor authentication (MFA) system aimed at visually impaired "
    "users. The design adds two extra login factors on top of a normal username/password login: "
    "a fingerprint or face check done on the user's own phone, and a phone call that reads out a "
    "one-time code. Together with the password, this gives three factors in total. The two extra "
    "factors were chosen specifically because they do not require the user to read anything on a "
    "screen, and can be operated fully using a screen reader (such as TalkBack, VoiceOver, or NVDA) "
    "or by simply listening to a phone call."
)
para(
    "Most authentication systems are built around three general categories of factor: something the "
    "user knows (a password or PIN), something the user has (a phone, a hardware key, or a code sent "
    "to a registered device), and something the user is (a fingerprint, face, or other physical "
    "trait). Using a single factor on its own is risky, because a password can be guessed, phished, "
    "or reused across sites, and once it is known to an attacker nothing else stops them logging in. "
    "Combining factors from at least two of these categories, so that an attacker would need to "
    "defeat more than one type of check at once, is the basic idea behind multi-factor authentication "
    "and is required by mainstream security guidance such as the NIST Digital Identity Guidelines "
    "(NIST SP 800-63B). This project applies that same idea, but designs every step of it so that a "
    "person who cannot see the screen at all can still complete it unaided."
)
para(
    "The two extra factors chosen for this project were selected with that accessibility goal in "
    "mind from the start, rather than being taken from a generic MFA checklist and adapted "
    "afterwards. A fingerprint or face check is something most modern phones already support and "
    "already make accessible through their built-in screen readers, so it adds very little extra "
    "friction. A phone call is, by its nature, an audio medium: it does not depend on a screen at "
    "all, and it still works on a basic phone line with no internet connection, which matters for "
    "users who may not always have a smartphone with mobile data available. Common alternatives such "
    "as text-message codes, app-based push approval, or visual QR-code scanning were considered and "
    "set aside specifically because each one assumes the user can read something on a screen at the "
    "moment of login, which does not hold for the target users of this system."
)
heading2("Comparing Possible Second/Third Factors")
para(
    "The table below sets out, in plain terms, why a fingerprint/face check and a voice call were "
    "chosen over the other common options, based specifically on whether each option can be used "
    "without seeing a screen."
)
simple_table(
    ["Option", "Can it be used without seeing a screen?"],
    [
        ["SMS text code", "No — the user must read the message, and a screen reader reliably intercepting a specific notification banner is inconsistent across lock-screen states and OS versions."],
        ["App push notification / approval", "No — this also requires reading a notification and tapping the right on-screen button, with the same reliability problem as SMS."],
        ["QR code scan", "No — scanning a QR code assumes the user can see and aim a camera at a printed or displayed code."],
        ["Hardware security key (e.g. USB key)", "Partly — it is physically operable without sight, but it requires the user to buy and carry an extra device, which is an added cost and a barrier this project chose to avoid."],
        ["On-device fingerprint / face check (chosen)", "Yes — it uses hardware already built into most modern phones, and the built-in prompts are already accessible to screen readers."],
        ["Voice call reading a spoken code (chosen)", "Yes — audio by nature, and works on a basic phone line even without a data connection."],
    ],
)
para(
    "The system is split into four parts, each designed by a different member of the group: the "
    "biometric (fingerprint/face) factor, the voice-call one-time-passcode (OTP) factor, the "
    "accessible interaction flow that ties the login journey together, and the security/threat "
    "model that checks the whole design against common attacks. A fifth member designed the "
    "overall architecture and requirements that the other three parts fit into. This document "
    "presents all of this as one combined design, in the order the parts fit together: first the "
    "overall shape of the system and what it must achieve, then each factor in turn, then the "
    "interaction flow that joins them for the user, and finally the security checks that were run "
    "over the whole thing."
)

# ---------------------------------------------------------------
# 2. Assumptions
# ---------------------------------------------------------------
heading1(2, "Assumptions")
para(
    "The following assumptions were needed to keep the system realistic and achievable within the "
    "scope of a student project. Each one is stated plainly below, grouped by the area of the "
    "design it applies to."
)

heading2("General / Architecture")
para(
    "These assumptions set the boundaries of the whole system: what kind of device and phone line "
    "the user is expected to have, and what is already in place before this system's login screen "
    "is ever shown to them."
)
bullet("The user owns a smartphone (Android 10+ or iOS 14+) with a fingerprint sensor or face camera that is already set up at the operating-system level. This system does not capture or store any new biometric data itself.", "A1")
bullet("The user has a phone number (mobile or landline) that can receive a normal voice call. It does not need to be a smartphone number or have a data/internet connection.", "A2")
bullet("The user already knows how to use a screen reader suited to their device (TalkBack, VoiceOver, or NVDA/JAWS). The system is built to work with these existing tools rather than creating a new one.", "A3")
bullet("A username and password (the first factor) is entered before the two extra factors, giving three factors in total. This project focuses on the two additional factors named in the brief.", "A4")
bullet("The phone app needs an internet connection to talk to the server, but the voice call travels over the ordinary telephone network, so it still works if the user's data connection fails.", "A5")
bullet("A third-party voice-call service (such as Twilio) is used to place the automated call, rather than the group building its own telephone system.", "A6")
bullet("Users have already registered their fingerprint/face and phone number before their first login attempt; the sign-up process itself is not covered in this design.", "A7")

heading2("Biometric Factor")
para(
    "These assumptions describe what the design relies on already existing on the user's phone, so "
    "that this system never has to build its own fingerprint or camera capture from scratch."
)
bullet("The user's phone has a secure hardware area (Apple Secure Enclave, or Android StrongBox) and a fingerprint/face is already registered there.", "B1")
bullet("The app never captures a fingerprint image or camera photo itself. It only calls the phone's built-in biometric check (Android BiometricPrompt, iOS LocalAuthentication) and gets back a simple pass/fail plus a signed code.", "B2")
bullet("If there is no biometric sensor, or the check fails three times, the phone's own system falls back to asking for the device passcode, which is standard behaviour already built into Android and iOS.", "B3")
bullet("The built-in fingerprint/face prompts on Android and iOS are already accessible to screen readers, so this system relies on that rather than building a custom prompt.", "B4")

heading2("Voice-Call OTP Factor")
para(
    "These assumptions describe how the phone call itself is expected to be delivered and answered, "
    "since this part of the design depends on the ordinary telephone network rather than the "
    "internet."
)
bullet("Calls are placed using a third-party voice service with text-to-speech and keypad (DTMF) support, rather than the group building its own phone system.", "C1")
bullet("The registered number is a normal phone line that can receive calls; it does not need a smartphone or internet connection.", "C2")
bullet("The user answers the call themselves. The risk of a call being forwarded or intercepted is accepted as a known limitation (see Section 6, item E4).", "C3")
bullet("The user types the spoken code back into the app, or confirms it using the phone keypad during the call. Both ways can be done without reading anything.", "C4")

heading2("Accessible Interaction Flow")
para(
    "These assumptions describe the accessibility principles the whole login journey was designed "
    "around, drawn from published web and mobile accessibility guidance rather than invented by the "
    "group."
)
bullet("Interaction happens through the user's own screen reader (TalkBack, VoiceOver, or NVDA), not a custom-built audio system.", "D1")
bullet("No information is shown using colour, icons, or position alone — every screen state also has a matching text label that a screen reader can read out.", "D2")
bullet("Time limits during login are generous and can be extended, since using a screen reader takes longer than simply looking at a screen.", "D3")
bullet("No CAPTCHA (image or audio puzzle) is used anywhere in the login flow, since these are a known accessibility barrier. Bot protection instead comes from the rate limits and device-bound biometric key described elsewhere in this design.", "D4")

heading2("Security / Threat Model")
para(
    "These assumptions describe how data is protected in transit and storage, and where the group "
    "has knowingly accepted a limitation rather than solving it fully, given the scope of a student "
    "project."
)
bullet("All communication between the app and the server is encrypted (TLS 1.3); nothing is sent in plain text.", "E1")
bullet("One-time codes are stored on the server only as short-lived, hashed values, and are never written into logs in plain text.", "E2")
bullet("Biometric checks only ever produce a signed code, not the fingerprint or face image itself, so a server breach cannot leak biometric data.", "E3")
bullet("Attacks that redirect the user's calls (such as SIM-swap or call-forwarding fraud) are accepted as a known, unresolved risk for this student project. Their impact is reduced because an attacker would still separately need the victim's own phone with its fingerprint/face set up.", "E4")
bullet("The third-party voice-call provider is treated as a trusted service under a normal data-processing agreement — a simplification reasonable for a student project, not a production-level compliance decision.", "E5")
para(
    "Taken together, these assumptions mean that at no point does the server hold anything that would "
    "be directly useful to an attacker on its own: no raw biometric data (E3), and no long-lived, "
    "readable one-time codes (E2), all carried over an encrypted connection (E1). This is a "
    "deliberate design choice, sometimes called minimising the attack surface: if there is less "
    "sensitive data sitting on the server in the first place, then a server breach is less damaging, "
    "even though the group cannot guarantee a breach will never happen."
)

# ---------------------------------------------------------------
# 3. Requirements
# ---------------------------------------------------------------
heading1(3, "Requirements")
heading2("Functional Requirements")
simple_table(
    ["ID", "Requirement"],
    [
        ["FR1", "The system shall accept a username and password before requesting either extra factor."],
        ["FR2", "The system shall ask for a fingerprint or face check from the user's phone as the second factor."],
        ["FR3", "The system shall call the user's registered phone number and read out a one-time numeric code as the third factor."],
        ["FR4", "The system shall allow a user to complete the whole login using only non-visual interaction (spoken prompts, screen-reader-friendly controls, keypad or voice input)."],
        ["FR5", "The system shall offer an accessible fallback if a factor cannot be completed (for example, no fingerprint sensor available), without dropping below two independent factors."],
        ["FR6", "The system shall record every login attempt (success/failure, which factor, and time) for audit purposes."],
    ],
)
heading2("Non-Functional Requirements")
simple_table(
    ["ID", "Requirement", "Source"],
    [
        ["NFR1", "The mobile app shall meet WCAG 2.1 Level AA accessibility guidelines.", "W3C, 2018"],
        ["NFR2", "The system shall meet NIST Authenticator Assurance Level 2 (AAL2): two different factor types, one tied to the device.", "NIST SP 800-63B"],
        ["NFR3", "All network traffic shall be encrypted (TLS 1.3); no OTP or biometric data stored as plain text.", "OWASP ASVS v4"],
        ["NFR4", "The voice-call factor shall work on a basic phone line without a data connection.", "Design goal"],
        ["NFR5", "The full login (all three factors) should normally take under 60 seconds.", "Usability goal"],
    ],
)

heading2("Requirements Traceability")
para(
    "The table below shows, for each requirement, which section of this document explains how it is "
    "met. This is included so that a reader can check that every requirement listed above is actually "
    "addressed somewhere in the design, rather than being listed once and forgotten."
)
simple_table(
    ["ID", "Addressed in"],
    [
        ["FR1", "Section 4 (System Architecture), Section 7 (Accessible Interaction Flow — sign-in screen)"],
        ["FR2", "Section 5 (Biometric Authentication Factor)"],
        ["FR3", "Section 6 (Voice-Call One-Time-Passcode Factor)"],
        ["FR4", "Section 7 (Accessible Interaction Flow)"],
        ["FR5", "Section 5, assumption B3 (device-passcode fallback); Section 8 (fallback treated as a design constraint, not a security gap)"],
        ["FR6", "Section 4 (Audit Log component); Section 8 (Repudiation row of the STRIDE table)"],
        ["NFR1", "Section 7 (Accessible Interaction Flow, WCAG references)"],
        ["NFR2", "Section 4 (channel-diverse factor design); Section 9 (AAL2 design decision)"],
        ["NFR3", "Section 8 (assumptions E1–E2; Tampering and Information Disclosure rows)"],
        ["NFR4", "Section 2, assumption A5; Section 6 (PSTN-based call delivery)"],
        ["NFR5", "Section 6 and Section 7 (short, sequential steps with generous but bounded timers)"],
    ],
)

# ---------------------------------------------------------------
# 4. System architecture
# ---------------------------------------------------------------
heading1(4, "System Architecture")
para(
    "Designed by: [A. Student]. The diagram below shows the main parts of the system and how they "
    "communicate. The mobile app talks to a backend server over the internet for the password check "
    "and the biometric factor. The voice-call factor is delivered separately, over the ordinary "
    "telephone network, through a third-party voice service. Keeping the two extra factors on two "
    "different types of channel (data network and telephone network) means that a problem with one "
    "channel does not automatically break both factors."
)
diagram(os.path.join(DIAG, "diagram1.png"),
        "Figure 1. Top-level components and data flow of the three-factor authentication system. The dotted line from the phone shows the voice call, which the user answers directly rather than it passing through the app.")

heading2("Component Overview")
para(
    "The table below describes the main building blocks shown in Figure 1 and the job each one does. "
    "Splitting the backend into separate components, rather than one large program that does "
    "everything, means each part can be built, tested, and reasoned about on its own — which is also "
    "why the group divided its design work the same way, across Sections 5 to 8 of this document."
)
simple_table(
    ["Component", "Role"],
    [
        ["Mobile App (Client)", "Runs on the user's phone. Collects the username/password, triggers the phone's built-in fingerprint/face prompt, and shows the accessible screens described in Section 7. Never handles raw biometric data itself."],
        ["Authentication Orchestrator", "The main backend service. Checks the password, keeps track of which factors have succeeded so far for a login attempt, and only issues a session once every required factor has passed."],
        ["Biometric Assertion Verifier", "A backend component that checks the signed code sent back from the phone against the public key stored for that user (see Section 5). It never receives a fingerprint image or face scan."],
        ["Voice OTP Service", "Generates the one-time numeric code, asks the Voice Gateway to call the user, and checks the code the user enters or confirms (see Section 6)."],
        ["Voice Gateway (Third-Party)", "An external voice-call provider (for example, Twilio) that actually places the phone call and reads the code aloud using text-to-speech, so the group does not need to build its own telephone infrastructure."],
        ["Audit Log", "Records every login attempt, which factors were used, whether each one succeeded or failed, and when it happened, so that the system's use can be reviewed later (FR6)."],
    ],
)

heading2("How a User Enrols")
para(
    "Before a user can log in with this system, they must first go through a one-time enrolment "
    "step. Although the detailed enrolment screens are not the focus of this design (the assumptions "
    "in Section 2 note that this project focuses on login, not sign-up), the overall shape of "
    "enrolment is described here because several later design decisions depend on it having already "
    "happened. Enrolment has three parts: first, the user creates their account with a username and "
    "password, entered through the same accessible form controls used at login. Second, the user is "
    "asked to confirm a fingerprint or face check on their phone, which causes the phone to generate "
    "a new cryptographic key pair inside its secure hardware area and to send only the public half of "
    "that key pair to the server (this is explained fully in Section 5). Third, the user provides a "
    "phone number, and the system places a short verification call to that number to confirm it is "
    "reachable, before storing it as the number future login codes will be sent to. Only once all "
    "three steps are complete is the account treated as ready for normal three-factor login."
)

# ---------------------------------------------------------------
# 5. Biometric authentication factor
# ---------------------------------------------------------------
heading1(5, "Biometric Authentication Factor (Fingerprint / Face)")
para(
    "Designed by: [B. Student]. This section covers the second login factor: a fingerprint or face "
    "check performed on the user's own device."
)
heading2("How it works")
para(
    "The design follows the same approach used by the WebAuthn/FIDO2 standard. When the user signs "
    "up, their phone creates a pair of cryptographic keys inside its secure hardware area. The "
    "private key never leaves the phone and can only be used after a successful fingerprint or face "
    "check. The public key is sent to the server and stored there. When the user logs in, the server "
    "sends a random challenge; the phone signs it (after the fingerprint/face check succeeds) and "
    "sends the signed result back. The server checks the signature against the stored public key. "
    "At no point does a fingerprint image, face scan, or biometric template travel over the network "
    "or get stored on the server — only a signed code does."
)
diagram(os.path.join(DIAG, "diagram2.png"),
        "Figure 2. Enrolment and login sequence for the biometric factor. Nothing leaving the phone's secure hardware area ever contains fingerprint or face data — only a pass/fail result and, on success, a signed code.")

heading2("Step-by-step: Enrolment")
bullet("The user completes a fingerprint or face check through the phone's own built-in prompt (BiometricPrompt on Android, LocalAuthentication on iOS), which is already set up to work with screen readers.", "1")
bullet("On success, the phone's secure hardware area generates a new key pair. The private key is marked so that it can only be used again after another successful fingerprint or face check.", "2")
bullet("The phone sends only the public key to the server, along with an identifier for the user's account. The server stores this public key and links it to the account.", "3")
bullet("From this point on, the phone can prove it is the same device that enrolled, without ever sending fingerprint or face data anywhere.", "4")
heading2("Step-by-step: Login (Verification)")
bullet("The server generates a random one-time challenge (a piece of data that has never been used before) and sends it to the phone as part of the login attempt.", "1")
bullet("The phone asks the user to complete a fingerprint or face check, using the same built-in prompt as enrolment.", "2")
bullet("If the check succeeds, the phone is allowed to use its stored private key to sign the challenge it was sent, producing a short digital signature.", "3")
bullet("The phone sends the signature back to the server. The server checks it against the public key stored for that account during enrolment.", "4")
bullet("If the signature is valid, the biometric factor is marked as passed for this login attempt. If the check fails three times, the phone falls back to asking for its own device passcode instead, which is standard behaviour already built into Android and iOS (assumption B3).", "5")

# ---------------------------------------------------------------
# 6. Voice-call OTP factor
# ---------------------------------------------------------------
heading1(6, "Voice-Call One-Time-Passcode Factor")
para(
    "Designed by: [C. Student]. This section covers the third login factor: an automated phone call "
    "that reads out a one-time numeric code."
)
heading2("Code design")
para(
    "The one-time code is 6 digits long. This length is short enough for someone to remember after "
    "hearing it once — based on the well-known finding that people can generally hold around 5 to 9 "
    "items in short-term memory (Miller, 1956) — while still being hard enough to guess within the "
    "5-minute time limit the code is valid for (NIST SP 800-63B). The system reads the digits out one "
    "at a time, slowly (for example, \"three... one... nine... zero... four... two\"), which matches "
    "the way automated telephone banking systems read out numbers, since this is easier to follow "
    "than a single long number spoken as one phrase."
)
para(
    "Because a spoken code disappears the moment it is said (unlike a text message, which stays on "
    "screen), the caller can press 1 to hear the code again, or press 2 to have it read one digit at "
    "a time on a loop. The system also limits how many new calls can be requested for one account in "
    "a short period, to stop the phone line being used to repeatedly call and harass the user."
)
diagram(os.path.join(DIAG, "diagram3.png"),
        "Figure 3. Voice-call OTP delivery and verification sequence, including the in-call replay option.")

heading2("Step-by-step: Call Flow")
bullet("Once the password and biometric factor have both succeeded, the Voice OTP Service generates a random 6-digit code and stores it, along with a 5-minute expiry time and a note of which account it belongs to.", "1")
bullet("The Voice OTP Service asks the Voice Gateway (the third-party voice provider) to place an automated call to the user's registered number.", "2")
bullet("When the user answers, the Voice Gateway plays a short introduction (\"This is your login verification call\") followed by the 6-digit code, read one digit at a time, slowly.", "3")
bullet("The call then offers two keypad options: press 1 to hear the code again from the start, or press 2 to have it repeated one digit at a time on a loop until the caller hangs up.", "4")
bullet("The user either types the code they heard into the accessible input field in the mobile app, or, on an IVR-only fallback path, confirms it directly on the keypad during the call itself.", "5")
bullet("The Voice OTP Service checks the entered code against the one it generated, within the 5-minute expiry window and a limited number of attempts. If it matches, the voice factor is marked as passed and the login can complete.", "6")
para(
    "The 5-minute expiry and the limited number of attempts both come directly from NIST's guidance "
    "on time-boxing and throttling one-time secrets (NIST SP 800-63B), so that even if a code were "
    "somehow intercepted, the window in which it could be reused is kept short. Separately, the "
    "system also limits how many new calls can be requested for the same account within a short "
    "period of time. This is not about protecting the code itself, but about stopping the phone line "
    "from being repeatedly rung as a form of harassment — a risk discussed further in Section 8."
)

# ---------------------------------------------------------------
# 7. Accessible interaction flow
# ---------------------------------------------------------------
heading1(7, "Accessible Interaction Flow")
para(
    "Designed by: [D. Student]. This section describes how the password step, the fingerprint/face "
    "step, and the voice-call step are joined into one login journey that a blind or low-vision "
    "user can complete from start to finish using only a screen reader."
)
heading2("Key design points")
bullet("Each step of the login is shown as its own screen with its own spoken announcement, rather than combining several steps onto one screen. This avoids confusion about what the user needs to do next, since a screen reader reads content in order, from top to bottom.")
bullet("Every button and input field has a clear label and a touch target of at least 44×44 points, following the accessibility guidelines published by both Android and Apple.")
bullet("Errors are announced straight away in plain language, along with a suggestion for fixing them — never shown only as a red colour or an icon.")
bullet("No CAPTCHA is used anywhere in the flow, since visual and audio CAPTCHAs are a well-documented accessibility barrier. Instead, the device-bound biometric key and the call rate-limit (Sections 5 and 6) provide protection against automated abuse.")
bullet("Timers, such as how long the user has to answer the voice call or enter a code, are generous and can be extended, since screen-reader navigation naturally takes longer than looking at a screen.")
diagram(os.path.join(DIAG, "diagram4.png"),
        "Figure 4. Interaction state diagram for the full three-factor login journey. Each state shows the message a screen reader announces on entry.")

heading2("Screen States and What Is Announced")
para(
    "The table below lists each screen the user moves through during login, and roughly what the "
    "screen reader says when that screen appears. Announcing a short, clear message on every new "
    "screen means the user always knows what stage of the login they are at and what is expected of "
    "them next, without needing to look at anything."
)
simple_table(
    ["Screen", "What is announced"],
    [
        ["Sign-in", "\"Sign in. Username field. Password field, secure text entry. Sign-in button.\""],
        ["Biometric prompt", "\"Verify your identity. Fingerprint or face check requested. Follow your device's prompt.\""],
        ["Waiting for call", "\"Calling your registered phone number now with your login code. This may take a few seconds.\""],
        ["Code entry", "\"Enter the 6-digit code you heard on the call. Code field.\" (or, on the call itself: \"press 1 to repeat the code, or 2 to hear it one digit at a time.\")"],
        ["Success", "\"Login successful. Welcome back.\""],
        ["Error / retry", "\"That code did not match. You have 2 attempts remaining. Press repeat to hear the code again.\""],
    ],
)
para(
    "Each of these announcements is written in plain, short sentences and avoids relying on any "
    "visual cue (colour, icon, or position) to carry meaning, in line with assumption D2. Where an "
    "error occurs, the announcement also states what the user should do next, rather than only "
    "stating that something went wrong."
)

# ---------------------------------------------------------------
# 8. Security architecture and threat model
# ---------------------------------------------------------------
heading1(8, "Security Architecture and Threat Model")
para(
    "Designed by: [E. Student]. This section checks the whole design — the trust boundaries between "
    "the phone app, the server, and the voice-call provider — against common attack types, using the "
    "STRIDE method (Shostack, 2014)."
)
diagram(os.path.join(DIAG, "diagram5.png"),
        "Figure 5. Trust-boundary data-flow diagram. Each box is a trust zone; every arrow crossing a boundary is assessed in the table below.")

heading2("Trust Zones")
para(
    "A trust boundary marks a point where data moves between two parts of the system that are not "
    "equally trusted, and is therefore a point worth checking carefully. This design treats the "
    "system as having three trust zones. The first is the user's own phone, which is trusted to hold "
    "the private biometric key and to run the app, but is also the zone an attacker might physically "
    "steal or try to unlock. The second is the group's own backend server, which stores account "
    "details, public keys, and hashed one-time codes, and is trusted to enforce the rules described "
    "in this document, but is also the target of a possible data breach. The third is the third-party "
    "voice-call provider, which is trusted only to place calls and read out codes, and is deliberately "
    "never given anything more sensitive than the code itself and the phone number to call. Every "
    "arrow that crosses between these three zones in Figure 5 is one of the points checked in the "
    "STRIDE table below."
)
para(
    "STRIDE is a structured way of checking a system design for six general types of attack: "
    "Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of "
    "Privilege (Shostack, 2014). Going through each of the six categories in turn, against the trust "
    "boundaries described above, helps make sure the group did not only think about the attacks that "
    "happened to come to mind first, but checked systematically for each general category."
)
simple_table(
    ["Threat", "Scenario", "Mitigation", "Severity"],
    [
        ["Spoofing", "Attacker tries to log in as the victim without the victim's phone.", "The biometric factor needs the phone's own secure hardware key (Section 5); it cannot be faked without physical access to the device.", "Low"],
        ["Tampering", "Attacker intercepts and changes the OTP or challenge in transit.", "All traffic is encrypted with TLS 1.3 (E1); the signed challenge-response detects any change.", "Low"],
        ["Repudiation", "User or attacker denies that a login attempt happened.", "Every login attempt is recorded with a timestamp in an audit log (FR6).", "Low"],
        ["Information Disclosure", "The server's database is breached.", "No raw biometric data is ever stored on the server (E3); OTPs are stored only as short-lived hashed values (E2).", "Medium"],
        ["Denial of Service", "Attacker repeatedly triggers calls to the victim's phone as harassment, using only the account identifier.", "The call-trigger endpoint is rate-limited with a capped number of retries (Section 6). This is ranked as a priority risk because a blind victim may find it harder to screen or block repeated calls.", "High"],
        ["Elevation of Privilege", "A partly-compromised factor grants more access than it should.", "The server only issues a session once all required factors have independently succeeded; login and access-control checks are kept separate.", "Medium"],
        ["SIM-swap / call forwarding", "Attacker redirects the victim's calls to intercept the voice OTP.", "Not fully solved (E4) — accepted as a known limitation. Its impact is reduced because the attacker would still separately need the victim's own registered phone for the biometric factor.", "High (residual)"],
    ],
)

# ---------------------------------------------------------------
# 9. Summary of design decisions
# ---------------------------------------------------------------
heading1(9, "Summary of Key Design Decisions")
para("The table below summarises the main design decisions made across the group and the reasoning behind each one.")
simple_table(
    ["Decision", "Reasoning"],
    [
        ["Use on-device biometric matching instead of sending biometric data to the server.",
         "Keeps fingerprint/face data off the network entirely, following the WebAuthn/FIDO2 model, and matches NIST guidance that biometrics should unlock a local key rather than be transmitted."],
        ["Use a voice call rather than SMS or a push notification for the third factor.",
         "SMS and push both rely on reading text, which is inconsistent for screen-reader users across different lock-screen states. A phone call is audio by nature and works even without a data connection, directly serving the target users. The WHO (2023) estimates 2.2 billion people worldwide live with some form of vision impairment."],
        ["Target NIST AAL2 rather than AAL1 or AAL3.",
         "AAL2 needs two different factor types, one resistant to replay, which the biometric-plus-phone-possession combination satisfies without the extra cost of a hardware token needed for AAL3."],
        ["Read OTP digits individually and slowly, with a replay option.",
         "Matches standard telephone-banking practice and compensates for the fact that spoken audio, unlike a text message, disappears once said."],
        ["Present each login step as its own announced screen, with no CAPTCHA anywhere in the flow.",
         "Keeps the journey usable in a straight line for a screen reader and avoids a documented accessibility barrier (CAPTCHA), relying instead on device-bound keys and rate limits for bot protection."],
        ["Split the two extra factors across two different channels (data network and telephone network).",
         "Means a problem or attack on one channel does not automatically compromise both extra factors, going beyond the minimum needed for NIST AAL2."],
        ["Accept SIM-swap / call-forwarding as a residual risk rather than claiming full mitigation.",
         "Fully preventing this is outside the control of an app-level design and outside student-project scope; stating it honestly, with its impact bounded by the biometric factor, is more defensible than an unsupported claim of a complete fix."],
        ["Structure the backend as a main orchestrator plus separate, independent services for each factor, instead of one large program.",
         "Allows the password check, the biometric verifier, and the voice OTP service to be designed, tested, and changed independently, which is also reflected in how the group split its own design work across this document."],
        ["Use the phone's own built-in fingerprint/face prompt instead of building a custom capture screen.",
         "Both Android and Apple already document these prompts as accessible to their screen readers, so using them directly avoids the group having to re-solve accessible camera/sensor design from scratch."],
        ["Allow up to three attempts at the biometric check before falling back to the device passcode.",
         "Balances ease of use against resistance to repeated guessing; three attempts is also the default already used by both Android and iOS biometric frameworks."],
        ["Treat biometric accuracy (how often it wrongly accepts or rejects a fingerprint/face) as the phone manufacturer's responsibility, not something this project re-measures.",
         "Measuring biometric sensor accuracy is a specialised field with its own standard (ISO/IEC 19795-1); relying on the certified accuracy of the phone's own sensor is a reasonable simplification for a student project."],
        ["Give every button and field a clear accessible label and a minimum touch target of 44×44 points.",
         "This is the minimum interactive size recommended by both Android's and Apple's own accessibility guidelines, which matters because reduced fine motor control often occurs alongside vision impairment."],
        ["Announce every error immediately, in plain language, with a suggested fix.",
         "Directly follows WCAG's guidance on identifying errors and suggesting corrections (Success Criteria 3.3.1 and 3.3.3), rather than only showing an error visually."],
        ["Make timers on the voice-call and code-entry steps generous and extendable rather than fixed and short.",
         "Screen-reader navigation of a form is measurably slower than glancing at a screen, so a short fixed timeout would unfairly fail the target users (WCAG Success Criterion 2.2.1)."],
        ["Rank the voice-call denial-of-service scenario as the highest-severity item in the threat model, above general information disclosure.",
         "Because the target users are visually impaired, a flood of harassing calls is not just an inconvenience but a channel this population finds harder to screen or block compared with a sighted user glancing at caller ID."],
    ],
)

# ---------------------------------------------------------------
# 10. Roles and individual contributions
# ---------------------------------------------------------------
heading1(10, "Roles and Individual Contributions")
para(
    "This unified document combines five individual design contributions. The table below summarises "
    "who was responsible for each part of the design, matching the individual documents submitted "
    "separately for Submission 1."
)
simple_table(
    ["Student", "Contribution area", "Covered in"],
    [
        ["[A. Student]", "Overall system architecture and requirements", "Sections 3 and 4"],
        ["[B. Student]", "Biometric authentication factor design", "Section 5"],
        ["[C. Student]", "Voice-call one-time-passcode factor design", "Section 6"],
        ["[D. Student]", "Accessible interaction flow design", "Section 7"],
        ["[E. Student]", "Security architecture and threat model", "Section 8"],
    ],
)
para(
    "Sections 1, 2, 9, and 11 of this document were written jointly by the group to combine the five "
    "individual contributions into one consistent design, resolve any overlap between them, and "
    "present a single set of assumptions, decisions, and conclusions."
)

# ---------------------------------------------------------------
# 11. Conclusion
# ---------------------------------------------------------------
heading1(11, "Conclusion")
para(
    "This document has presented a combined design for a three-factor authentication system — "
    "password, on-device biometric check, and voice-call one-time code — built specifically so that "
    "a visually impaired user can complete every step without needing to read anything on a screen. "
    "The design meets the functional and non-functional requirements set out in Section 3, reaches "
    "NIST Authenticator Assurance Level 2 by combining two structurally different factor channels "
    "(Section 4), keeps biometric data off the network entirely by following the WebAuthn/FIDO2 "
    "model (Section 5), compensates for the temporary nature of spoken audio with an in-call replay "
    "option (Section 6), conforms to WCAG 2.1 Level AA throughout the interaction flow (Section 7), "
    "and has been checked against the six STRIDE threat categories, with every identified risk either "
    "mitigated or explicitly accepted as a stated, bounded limitation (Section 8)."
)
para(
    "Where the design falls short of a full production system — most notably, the residual risk of "
    "SIM-swap or call-forwarding attacks against the voice channel, and reliance on a third-party "
    "voice provider rather than the group's own telephony infrastructure — this has been stated "
    "openly rather than glossed over, in line with the assumptions set out in Section 2. The group "
    "considers these limitations reasonable for the scope of a student project, and believes the "
    "resulting design meets the brief's requirement for a genuinely usable, non-visual multi-factor "
    "authentication system."
)

# ---------------------------------------------------------------
# 12. References
# ---------------------------------------------------------------
heading1(12, "References")
refs([
    "National Institute of Standards and Technology (2017) SP 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management. Gaithersburg, MD: NIST.",
    "World Wide Web Consortium (2021) Web Authentication: An API for Accessing Public Key Credentials Level 2 (WebAuthn). W3C Recommendation.",
    "World Wide Web Consortium (2018) Web Content Accessibility Guidelines (WCAG) 2.1. W3C Recommendation.",
    "World Wide Web Consortium, Web Accessibility Initiative (2019) Inaccessibility of CAPTCHA: Alternatives to Visual Turing Tests on Websites. W3C WAI Note.",
    "World Health Organization (2023) Blindness and Vision Impairment, Fact Sheet. Geneva: WHO.",
    "OWASP Foundation (2021) Application Security Verification Standard (ASVS) v4.0.",
    "FIDO Alliance (2022) FIDO2: WebAuthn & CTAP Overview. Available at: fidoalliance.org/fido2.",
    "Google Android Developers (2023) Biometric Authentication — BiometricPrompt. Available at: developer.android.com/training/sign-in/biometric-auth.",
    "Apple Inc. (2023) LocalAuthentication Framework Documentation. Available at: developer.apple.com/documentation/localauthentication.",
    "International Organization for Standardization (2021) ISO/IEC 19795-1:2021 — Biometric Performance Testing and Reporting.",
    "Miller, G.A. (1956) 'The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information', Psychological Review, 63(2), pp. 81–97.",
    "Twilio Inc. Programmable Voice & TwiML Documentation. Available at: twilio.com/docs/voice/twiml.",
    "Shostack, A. (2014) Threat Modeling: Designing for Security. Indianapolis: Wiley.",
])

out_path = os.path.join(HERE, "..", "Unified Group Design - MFA for Visually Impaired Users.docx")
doc.save(out_path)
print("Saved:", os.path.abspath(out_path))

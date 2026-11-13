# Junction 2026 — Winning Playbook

All times are Helsinki local (EET, UTC+2). Venue: Hype Arena, Vanha Jorvaksentie 3, Espoo.
Theme: **European Tech Renaissance**. Team size 1–4. Main prize 10 000 €, pool 100 000 €.

## How winning actually works here

1. **Challenge winners** are picked by the partner company, against *their own* judging criteria. Read them twice. Build to them literally.
2. **Top 5 overall** is chosen by **peer review** (other hackers, Sun 10:30–13:00, at your table). Then 7 judges vote after a 3‑min pitch + 3‑min Q&A on stage.
3. Peer reviewers score **Innovation / Impact / Implementation**. They see ~dozens of projects in a few hours. You get ~3 minutes of their attention. The demo must be **live, instant, and obvious**.

Implications:
- One sharp problem, one "wow" moment, demoed live from a deployed URL. No setup, no "imagine that…".
- Working > ambitious. A polished vertical slice beats a half-working platform.
- Spend real hours on the pitch, video and deck. They are scored, the code mostly is not.
- Be at your table for peer review or you are ineligible for the main prize.

## Hard deadlines

| When | What |
|---|---|
| Fri 23:59 | **Pre-submission**: submit which challenge you are tackling (a draft project). Can change later. |
| Sat 12:00 | Submission form opens. Create the draft immediately with placeholders. |
| Sun 10:00 | **FINAL submission**. Form closes automatically. Set project DRAFT → FINAL. No late entries. |
| Sun 10:30–13:00 | Live peer review at your table. Mandatory. |
| Sun 14:00–16:05 | Final ceremony, Top 5 pitches. |

## Timeline

### Friday 13.11
- **16:00** Registration (2nd floor). Valid ID + QR from dashboard. Badge visible at all times.
- **18:00–19:30** Opening ceremony. Challenge videos 19:10. Take notes on criteria.
- **19:30** Hacking starts. Dinner.
- **19:30–20:30** Run `/challenge <paste challenge text>` → generates idea candidates scored on the rubric. Then `/grill-me` until the idea is airtight. Decide by **20:30**. Write `docs/CHALLENGE.md` + `docs/DECISIONS.md`.
- **20:00–21:30** Workshops (DeepMind 20:00, Verda/Arduino 20:30, MLH×GitHub 21:00). Send one person if relevant to your challenge; the rest keep building.
- **20:30–23:00** `/plan` → `docs/PLAN.md`. Build the **vertical slice**: input → core magic → output, ugly but real, deployed to Vercel.
- **23:30** Pre-submission on the platform (challenge choice). Commit + push.
- **00:00–02:00** Core feature. Then sleep (not at the venue, it is illegal there).

### Saturday 14.11
- **09:00–12:00** Core feature done and deployed. Realistic seed data. Error states handled.
- **11:00** Cala workshop (Loft) — only if you are in the Cala challenge.
- **12:00** Submissions open → create the draft submission NOW (name, punchline, challenge, repo link, Vercel link). Fill the rest later.
- **12:00–17:00** Second feature or polish. Workshops: Intel 12:00, Modal 13:30, Kiuas 14:30 ("Can it be a company?" — useful for the Impact story), Exa 16:30.
- **17:00** Mid-point review: `/demo-check`. Does the demo path work end-to-end from a fresh browser? Fix only what is broken on the demo path.
- **18:00** Dinner. Maria01 workshop 18:00.
- **20:00** **Feature freeze.** From here: polish, data, copy, UI, stability.
- **20:00–22:00** `/pitch` → pitch script, 2‑min video script, slide outline. Build deck (PDF).
- **22:00–01:00** Record the 2‑minute video (hard max, they will reject 2:01). Upload to YouTube (unlisted is fine, must be viewable by all). Fill the full submission form.

### Sunday 15.11
- **07:30–09:00** `/submit-check`. Fresh-browser test of the deployed URL. Final README. Source public. Phone numbers + Discord names in the form.
- **09:15** Set submission to **FINAL**. Do not touch the form after 09:45.
- **10:00** Deadline.
- **10:30–13:00** Peer review at your table. One person pitches (3 min, rehearsed), one drives the demo, others review assigned projects (mandatory, or no main prize eligibility).
- **13:00–14:00** If contacted for Top 5: rehearse the 3‑min pitch, check laptop → stage connection.
- **14:00** Final ceremony.

## Roles (adjust to team size)
- **Driver**: owns the repo, deploys, keeps `main` green.
- **Builder(s)**: features on branches, PR → preview URL → merge.
- **Storyteller**: owns problem statement, pitch, video, deck, submission form. Starts Saturday afternoon, not Sunday morning.

## Rules that disqualify
- No code written before the event (this scaffold is generic boilerplate + tooling; all product code starts after 19:30 Fri).
- No project tied to an existing company of yours.
- Must submit source link; submissions are MIT licensed; organizers must be able to read the code.
- Video ≤ 2:00.

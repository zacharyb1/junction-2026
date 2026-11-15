# Presentation video: the whole idea in two minutes

Written Sunday 15 November 2026, about 04:00 Helsinki, for the submission video (hard limit 2:00). It presents the whole idea of AIDaddy: what runs today and where it is going. 272 spoken words, last word at about 1:55.

The words say "Next" once, in line 03, and again at the start of line 07. Everything before line 07 exists today, some of it as a first version. Everything in line 07 is the idea, not built. The picture carries a small caption wherever a scene is a design or a first version, so no judge who opens the site afterwards finds less than the video showed.

## The script

| Time | Picture | Voice | Criterion it serves |
|---|---|---|---|
| 0:00 | A letter in Finnish on a kitchen table, then the family chat scrolling past dinner and keys. | "For a family new to Finland, paperwork is a second job. Kela, the tax office, the landlord, in a language they do not read, across eighty-seven official sites." | Usefulness: one specific group |
| 0:11 | The front page: "Silent until it matters." The orb breathes. | "AIDaddy is a butler for the household. It is silent until it matters. Then it steps in, before anyone asks." | Originality |
| 0:20 | `/setup`: the three cards, one tap each. Then the design screen "Connect family apps" (caption: Design). | "You choose what it may follow: the group chat, the talk at the kitchen table, the page in your browser. Next: mail, calendar and the school app." | Originality, Usefulness |
| 0:31 | `/demo/chat`: "I'm pregnant" arrives, the plan appears with a number after each line. | "Someone writes: I'm pregnant. Moments later the family has a plan: what to do, by when, and what they are owed." | Usefulness, Working implementation |
| 0:40 | `/listen` (caption: First version). Said aloud: "I'll just bring ten cartons of cigarettes from Tallinn." The card answers "Allowed with limits: 200 cigarettes", tulli.fi. Then the card "AIDaddy is calling". | "It hears a plan that breaks a rule and says so first. When a deadline is close, it rings you and reads the plan aloud." | Originality, Use of Exa |
| 0:51 | `/demo/calendar` (its own caption says what is concept): the birthday, three gift options. Then the desks on `/listen`: legal, money, travel. | "It remembers the birthday and finds the gift. Legal, money and travel desks keep their own notes. What you ask three times becomes a routine." | Usefulness |
| 1:01 | Design screens, each for about three seconds (caption: Next, design): "12 things your family is missing" with the housing allowance; "AI agents call for quotes"; the clip `aidaddy-call-demo.mp4` (AIDaddy calls the boss, caption on the page: Concept); "Ask parents like you"; the nudge back to the tax form. The orb speaks. | "Next: it finds money you never applied for, phones companies for quotes when the tap leaks, calls your boss in your own voice, asks parents like you, and nudges you back to the tax form. In its own voice and face." | Originality, Impact |
| 1:15 | `/try`, a live run: the searches and pages appear as they finish. Open the case file. Tap a source number: the official page opens with the sentence highlighted. | "Why trust it? Every line comes from the live web, searched with Exa, official sites first. Our server opens each page again and finds the sentence. Tap a number and the page opens there. No sentence, no claim." | Use of Exa, Clarity of sources |
| 1:31 | The chat replay's last message: "I worked ahead and drafted Aino's notice to her employer. Sending waits for your click." | "It never sends, books or pays. You approve with one tap." | Usefulness (trust) |
| 1:36 | The front page's figures and the address of the site. | "Live today, on our own server in Finland. In the latest test run, all ninety-five quotes were found on their pages, in about seven seconds a case." | Working implementation |
| 1:47 | The orb, the name, the address, the team's names. | "AIDaddy. One step ahead, with the family in control." | |

## What each scene is

| Scene | What it is today |
|---|---|
| Group chat, plan with numbered sources | Live: the Telegram bot and the replay of a real run. |
| Case file, tap a number, highlighted sentence | Live. |
| `/try` live run | Live, open to anyone on the server. |
| Setup page, three connections | Live page. Telegram is live; listening and the browser extension are first versions. |
| Listening: the rule check, the call, the desks | First version. It works in Chrome, Edge and Safari while its page is open. Checked with a scripted microphone and typed sentences, not yet with a real microphone. The call rings on that device, not on a phone number. |
| Birthday and gift | The birthday planner and the product finder are skills of the Telegram bot. The calendar in the replay is a concept, and its page says so. |
| Desks and routines | Skills of the Telegram bot: legal, finance and travel desks with their own memory, and a routine after the third request, which an operator approves. |
| Mail, calendar and the school app | Design only. |
| Money you never applied for | Design only. |
| Phoning companies for quotes | Design only. What exists is the demo call of `docs/DEMO_CALLS.md`: one confirmed call in AIDaddy's own voice to a test line, answered in a browser, when the operator has switched it on. |
| Calling your boss in your own voice | Concept: the scripted scene `/demo/call`. The ElevenLabs account may copy a voice, but no voice is copied and no phone number is connected, so nothing can ring a phone. In the scene the first sentence of the call says that an assistant is speaking with a copy of the voice. |
| Asking parents like you | Design only. |
| The nudge back to the tax form | A prototype extension in `extension/aidaddy-focus`. |
| Its own voice and face | The voice exists: it was designed for AIDaddy with ElevenLabs, and the earlier voiceover is rendered in it. Live voice is off on the server until its key is set. The face that acts is a concept. |

## Numbers in the words, and where they come from

| Words | Source |
|---|---|
| "eighty-seven official sites" | The Finnish list in `src/data/official-sources.json`, shown on the front page. |
| "all ninety-five quotes were found on their pages" | Run 13 on the server, `eval/results/latest.md`: 95 of 95. |
| "about seven seconds a case" | The same run: median 7.4 s. |

Do not say "19 of 19". That is run 12, which the front page still shows. The newest run, 13, passed 17 of 19 scenarios. The quote count holds in both runs: every quote shown was found on its page.

## Recording notes

- Record the site in its current look from <https://86.38.238.136.sslip.io>. The four videos in this folder were recorded in the earlier dark look; `node scripts/record-demos.mjs` records them again from a running build.
- The design screens come from the team's household app design. Put the caption "Design" or "Next" on them.
- For the listening scene, type the sentence into "Type what was said" if the room is loud. The page treats it the same way.
- To have the lines spoken in AIDaddy's own voice, put them into `docs/pitch/voiceover.json` and run `node scripts/voiceover.mjs --voice UWUOFJTWwuSmZFHzbMpM --out docs/pitch/voiceover-aidaddy`. In the files the name is spelled "A.I. Daddy", so the voice reads it as two words.
- At about 150 words a minute the words take about 1:55. Cut "asks parents like you" first, then line 06, if the pictures need more time.

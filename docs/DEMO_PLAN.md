# Demo and presentation plan

Written Saturday 14 November, 09:05 Helsinki, at Zachary's request. Freeze is 20:00 today. Submission is Sunday 10:00, and peer review runs Sunday 10:30 to 13:00.

This plan uses the new front page. Its run of show replaces the video table in [PITCH.md](PITCH.md), whose numbers are older. The story, the criteria table and the judge answers in PITCH.md still hold.

Demo facts refreshed Sunday 15 November for the archive recovery and chat UI fixes (#72 and #77). Check that those revisions are deployed before rehearsing. The current landing replay is a new 10.3-second run with 9 of 9 quotes verified; the published 19-case scorecard below is a separate, unchanged measurement. Live voice still needs account setup and production acceptance under #76 and #75. The former homepage narration describes the old replay, so its button has been removed.

## 1. One sentence

> AIDaddy is the butler in your family's group chat. It is silent until it matters, and then every line of its plan points at a sentence on an official page.

Say it first and say it last.

## 2. Three moments that win, and what to do if one fails

| Moment | What happens | Why a judge remembers it | If it fails |
|---|---|---|---|
| **The silence** | Small talk passes in the chat and nothing answers. Then "I'm pregnant" and the core lights up. | Every other bot has to be asked. | The front page plays it from real test messages. |
| **The sentence** | Tap source 4. Kela's own page opens with the quoted sentence highlighted. | It is proof, not a claim, and it takes two seconds. | Open the case file: the quote and "found on the live page" stand next to it. |
| **Your question** | The judge types their own life event and country into `/try`. | It is criterion five, "works on live queries", done by the judge. | The five stored example cases under the form, each a real run. |

## 3. Two minutes at the table

One laptop shows the front page. One phone is in the presenter's hand.

| Time | Screen | Words |
|---|---|---|
| 0:00 | Front page, first screen | "This is AIDaddy. It lives in your family's group chat, and most days it says nothing." |
| 0:10 | Scroll to the chat. Messages pass, then the pregnancy message. | "Dinner, keys, who picks up the kids. A small model on the family's own machine lets that pass. Then this." |
| 0:25 | The research replay runs: 10.3 seconds | "This is a real run at its real speed. Four Exa searches on Finland's official sites. Six pages opened again by our own server. Nine quotes looked up on those pages." |
| 0:45 | The plan. Tap source 4. | "Four steps, three deadlines. Tap a number: Kela's page, at the sentence." |
| 0:55 | Open the full Case for this run | "The plan and its evidence stay together, so you can come back to the sources." |
| 1:05 | Hand over the phone, `/try` open | "Now yours. What happened, and in which country?" |
| 1:35 | While it runs: the four gauges | "We test it on the live web: 19 of 19 scenarios in the latest run, 98 of 98 quotes found, and 6 of 6 messages with nothing to research were refused. Recent runs passed 17 to 19." |
| 1:50 | Telegram: the bot in the family group | "And this is where it lives. It never sends, files, books or pays. You decide." |

**If the bot is not online by the rehearsal at 16:00:** the last line is shown from a recorded clip, and the presenter says it is a recording.

## 4. The two-minute video

Same order as the table above, without the judge's turn:

1. **0:00 to 0:10:** the first screen, then the chat.
2. **0:10 to 0:40:** the replay at full length. This recorded run takes 10.3 seconds.
3. **0:40 to 1:00:** the plan, tap a source, the official page opens at the sentence.
4. **1:00 to 1:20:** `/try` with a letter in Finnish (the rent increase), live.
5. **1:20 to 1:40:** the bot in Telegram, if it is online. Otherwise the case file on a phone: source re-check and "Two figures found".
6. **1:40 to 2:00:** the gauges, the one sentence, the QR code.

- **Record the screen at 1280 by 800.** The page is built for that width, and for a phone.
- **Voiceover:** the existing files are earlier recordings, not narration for this refreshed replay. Check every line against the chosen footage, including line 07's scorecard figures, before using them. Re-render changed lines only when ElevenLabs is configured; the current run of show does not depend on live voice or the removed homepage audio button.
- **Record a backup of every live part today.** The web is live and the venue network is shared.

## 5. The table

- **Laptop:** the front page, full screen. The replay starts again with the Replay button.
- **QR code 1:** the front page address with the access code, so `/try` opens without typing. Print it large.
- **QR code 2:** the Telegram bot, only if the bot is online and renamed.
- **Phone:** on mobile data, not venue Wi-Fi. Keep one stored case file open in a tab.
- **A card with the one sentence** and the three numbers: 19 of 19, 98 of 98, 6 of 6.

## 6. Questions judges ask

| Question | Answer |
|---|---|
| "How do I know it is not making this up?" | "Tap any number. Our server opened that page again and found that sentence. If it had not, the line would be gone and listed as unconfirmed." |
| "Does it read all our messages?" | "A small model on the family's own machine decides first. Photos, and messages in the three minutes after it wakes, go to the conversation model. We say that on the page." |
| "What does Exa do here that a model cannot?" | "This year's amounts and deadlines, from the official page, with the sentence. A figure stays in the plan only if it stands in a sentence on the page it cites." |
| "What if two pages disagree?" | "It shows both with their sources. It does not choose." |
| "Is this legal advice?" | "No. It is research with sources. It shows the sentence is on the page, not that the rule fits your case." |
| "Why Finland?" | "We are here, and an international family in Finland gets letters in a language it does not read. The engine has official site lists for 12 countries." |
| "What does it cost?" | "This recorded case used $0.028 of Exa calls and took 10.3 seconds. The separate 19-case scorecard has a 5.6-second median." |

## 7. What not to say

- **"100% accurate."** Say "every line shown is backed by a sentence on a page we opened".
- **"All small talk stays on your device."** See the second answer above.
- **"JARVIS"** on a slide or on the page. It is another company's character. Saying "like a butler from a film" out loud is fine.
- **A number that is not on the scorecard** or in the recorded run.

## 8. Today

| By | What | Who |
|---|---|---|
| 11:00 | Read this plan and [BOT_PLAN.md](BOT_PLAN.md). Pick the operator and the three scenarios. | Team |
| 13:00 | Bot online on the production Engine (BOT_PLAN, Step 0) | Operator |
| 14:00 | Record the backup clips: front page, `/try`, case file | Anyone |
| 16:00 | First full rehearsal with a stopwatch. Decide: live bot or recorded clip. | Team |
| 18:00 | Record the two-minute video | Team |
| 19:30 | Last scorecard run. If a number changed, change the card, the voiceover line and nothing else. | Anyone |
| 20:00 | Freeze | |
| Sunday 09:00 | Submission check with [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) | Team |

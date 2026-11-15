# Recorded demo scenes

These silent videos capture the scripted replay pages with AIDaddy's current name, face and look. All five were recorded again on 15 November 2026 at about 04:40 Helsinki, after the site took its warm look, and the phone-call scene is new. The families and interactions are scripted; the linked research cases are unchanged. Each recording keeps the page's caption explaining what is real and what is a concept.

| Recording | Replay | Output |
| --- | --- | --- |
| [Group chat](aidaddy-telegram-demo.mp4) | `/demo/chat` | 860 × 1800 |
| [Browser](aidaddy-browser-demo.mp4) | `/demo/browser` | 1920 × 1200 |
| [Kitchen table](aidaddy-talk-demo.mp4) | `/demo/talk` | 860 × 1800 |
| [Calendar](aidaddy-calendar-demo.mp4) | `/demo/calendar` | 1920 × 1200 |
| [Phone call](aidaddy-call-demo.mp4) | `/demo/call` | 860 × 1800 |

To refresh all five, install the repository dependencies and Playwright's Chromium browser, and have `ffmpeg` available. Start a production build in one terminal:

```sh
pnpm build
pnpm start
```

Then record in another:

```sh
node scripts/record-demos.mjs http://localhost:3000
```

An optional final argument selects `chat`, `browser`, `talk`, `calendar` or `call`. `scripts/record-chat-demo.mjs` remains the chat-only entry point. Set `CHROME_PATH` only when using an existing Chromium executable instead of Playwright's bundled browser.

The recorder uses a temporary named browser session, reads each scene's duration from its source, captures `?bare=1` with the original phone or desktop viewport, and scales the complete frame into H.264 MP4. It blocks API and external requests, so recording cannot run research or contact a calling provider. Review the rendered captions and branding after recording; the source branding check cannot read words inside video pixels.

The recordings of 15 November were not made with this recorder: its browser session did not start in the cloud session they were made in. They were captured with Playwright's own video recording from the same `?bare=1` pages, with the same viewports, sizes and frame rate, and with API and external requests blocked in the same way.

## Pitch deck

[aidaddy-pitch-deck.pdf](aidaddy-pitch-deck.pdf) is the eleven-slide deck for the submission form; the form's text is in [../SUBMISSION_TEXT.md](../SUBMISSION_TEXT.md). Rebuild it with:

```sh
node scripts/make-deck.mjs
```

The script photographs the live site into `deck/img`, reads every figure from the result files (`src/data/scorecard.json`, `eval/results/gate-gemma3-1b.json`, `src/data/replay.json`), writes `deck/deck.html` and prints the PDF. `--no-shots` keeps the existing pictures, `--no-story` leaves out the opening slide about Saturday night, `--base` points it at another server, and it reports any slide that is too full.

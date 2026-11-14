# UKK Focus (prototype)

Issue #31: UKK notices that you started an official task (your tax return on OmaVero, a Kela or Migri application, a Suomi.fi errand), left it for social media, and nudges you back once.

- After one minute on Instagram, TikTok, Facebook, X, Reddit, YouTube or Netflix while the task tab is still open: "Your tax return is still open on OmaVero. Back to it?" with **Back to it** (jumps to that tab) and **Later** (30 minutes of quiet).
- Private by design: it compares hostnames only, keeps its state in the browser session, and sends nothing anywhere. It makes no claim about deadlines.
- Not connected to the UKK bot yet. On `/setup` the browser channel stays marked as a concept.

## Load it (Chrome, Edge or Brave)

1. Open `chrome://extensions` and switch on **Developer mode**.
2. **Load unpacked** → choose this `extension/ukk-focus` folder.
3. Demo: open `https://www.vero.fi/omavero/`, then switch to a tab with `https://www.reddit.com/`. A minute later the nudge appears. On macOS, allow notifications for Chrome in System Settings if nothing shows.

# Demo UI walkthrough

Checked 15 November 2026, starting from main `d324bc5` with the PWA changes, for issue #67.

## Covered

Chromium rendered `/`, `/try`, `/chat`, `/setup`, `/demo`, `/demo/chat`, `/demo/browser`, `/demo/talk`, `/demo/calendar`, `/autopilot`, and `/reading` at 320, 768, 1024, and 1440px widths. All 44 page/width combinations had a main heading, no horizontal document overflow, no broken loaded images, and no JavaScript page errors.

The demo index links to the four replays, autopilot, live research, and chat. The shared links preserve the entered demo code. The three mock setup switches update their announced state; they remain explicitly labelled as mock controls. Chat displayed a completed streamed reply. A simulated HTTP 503 restored the typed message and showed its error. The home-screen instructions opened with Enter.

The chat success/failure responses were intercepted in the test browser, so these checks establish frontend behavior without placing live calls or spending research credits. They do not prove model, voice-provider, or Telegram availability. Runtime verification is separate.

## Remaining known findings

- Archived case links returning 404 are tracked by #66; this UI pass does not claim the stored cases were restored.
- Outbound calling and phone background listening shown in the existing replays are labelled concepts. Those labels must follow the capability actually deployed; a replay alone does not complete the feature.
- The separate video-avatar concept (#65) is active work in its own checkout. It is not part of this PWA change or the shared chat page.

No additional layout or navigation defect was found in this pass. This is a bounded demo walkthrough, not an exhaustive accessibility or device certification.

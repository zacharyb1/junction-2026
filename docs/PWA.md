# Install AIDaddy

Open the HTTPS deployment in Chrome/Edge on Android or desktop and choose **Install app** or **Add to home screen** from the browser menu. In Safari on iPhone/iPad, use **Share → Add to Home Screen**. The installed app opens `/chat` in its own window, with the same server and access requirements as the website. Installation does not save an access code into the app URL.

This is the demo scope of issue #57: home-screen installation and a standalone chat window. An internet connection is required. There is no offline case/conversation cache, background microphone, or push subscription.

`src/app/manifest.ts` supplies the installation metadata. The PNGs in `public/icons/` are raster exports of the existing `public/aidaddy-avatar.svg`; the maskable export has a 384px mark centered on a 512px dark ground to keep it inside the safe area. Root metadata supplies the Apple home-screen icon and app title.

## Browser check, 15 November 2026

Checked the implementation on a local Next.js server using Chromium. The browser parsed `/manifest.webmanifest` without errors, returned no installability errors, and loaded the 192px, 512px, and maskable 512px icons at their declared sizes. The manifest starts at `/chat`, scopes the app to `/`, and requests standalone display. The install instructions open with the keyboard and were visually inspected at mobile and desktop widths.

This verifies the browser manifest and page, not a physical-device installation. Recheck the installed launch on the phone used for the demo after deployment.

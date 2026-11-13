import QRCode from "qrcode";
import { Section } from "@/components/landing/section";
import { TryLink } from "@/components/landing/try-link";
import { Way, WayContent, wayClasses } from "@/components/landing/way";

/** The QR code is drawn on the server as an SVG string, so the page ships no QR library. */
async function qrSvg(url: string): Promise<string | null> {
  try {
    return await QRCode.toString(url, { type: "svg", margin: 1 });
  } catch {
    return null; // the link below the code still works
  }
}

async function BotCard({ username }: { username: string }) {
  const url = `https://t.me/${username}`;
  const qr = await qrSvg(url);

  return (
    <div className="l-bot">
      <div className="l-bot-text">
        <p>
          Scan the code with your phone camera, or open the link. Both take you to a chat with the bot in Telegram.
        </p>
        <Way href={url} tone="yellow" panel>
          Open the bot in Telegram
        </Way>
        <p className="l-handle">t.me/{username}</p>
        <p>
          No Telegram? <TryLink className="l-link">Try it in the browser</TryLink> instead.
        </p>
      </div>

      {qr && (
        // A QR code has to stay dark on white to scan, so this tile does not follow the section's colour.
        <div
          role="img"
          aria-label={`QR code that opens the bot in Telegram at t.me/${username}`}
          className="l-qr"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="l-placeholder">
      <h3>Bot link coming soon</h3>
      <p>
        The Telegram bot is being set up. Its link and QR code will appear here. Until then, you can run the same
        research in the browser.
      </p>
      <TryLink className={wayClasses({ tone: "yellow", panel: true }, "l-placeholder-way")}>
        <WayContent>Try it in the browser</WayContent>
      </TryLink>
    </div>
  );
}

/** QR code and link to the Telegram bot, or a placeholder while the bot has no public username. */
export function AddBot({ username }: { username: string | null }) {
  return (
    <Section
      id="add-the-bot"
      field="blue"
      title="Add the bot"
      hint="Kaveri lives in Telegram, next to the people you already talk to."
    >
      {username ? <BotCard username={username} /> : <ComingSoon />}
    </Section>
  );
}

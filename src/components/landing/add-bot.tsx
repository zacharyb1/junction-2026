import { ArrowRight, ArrowUpRight } from "lucide-react";
import QRCode from "qrcode";
import { LinkButton, linkButtonClasses } from "@/components/landing/link-button";
import { Section } from "@/components/landing/section";
import { TryLink } from "@/components/landing/try-link";

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
    <div className="grid gap-6 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-6">
      <div className="flex flex-col items-start gap-4">
        <p className="max-w-prose text-pretty">
          Scan the code with your phone camera, or open the link. Both take you to a chat with the bot in Telegram.
        </p>
        <LinkButton href={url} size="cta" className="w-full sm:w-auto">
          Open the bot in Telegram <ArrowUpRight />
        </LinkButton>
        <p className="font-mono text-sm break-all text-muted-foreground">t.me/{username}</p>
        <p className="text-sm text-muted-foreground">
          No Telegram?{" "}
          <TryLink className="font-medium text-foreground underline underline-offset-4">
            Try it in the browser
          </TryLink>{" "}
          instead.
        </p>
      </div>

      {qr && (
        // A QR code has to stay dark on white to scan, so this tile does not follow the theme.
        <div
          role="img"
          aria-label={`QR code that opens the bot in Telegram at t.me/${username}`}
          className="size-44 justify-self-start rounded-xl bg-white p-2 ring-1 ring-foreground/10 sm:size-52 sm:justify-self-end [&>svg]:block [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-5 sm:p-6">
      <h3 className="font-medium">Bot link coming soon</h3>
      <p className="max-w-prose text-sm text-pretty text-muted-foreground">
        The Telegram bot is being set up. Its link and QR code will appear here. Until then, you can run the same
        research in the browser.
      </p>
      <TryLink className={linkButtonClasses({ variant: "outline" })}>
        Try it in the browser <ArrowRight />
      </TryLink>
    </div>
  );
}

/** QR code and link to the Telegram bot, or a placeholder while the bot has no public username. */
export function AddBot({ username }: { username: string | null }) {
  return (
    <Section id="add-the-bot" title="Add the bot" hint="Kaveri lives in Telegram, next to the people you already talk to.">
      {username ? <BotCard username={username} /> : <ComingSoon />}
    </Section>
  );
}

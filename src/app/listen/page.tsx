import type { Metadata } from "next";
import { ListenPanel } from "@/components/listen/listen-panel";
import { PageHead, Slash } from "@/components/site/page-head";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";

const title = "Let AIDaddy listen";
const description =
  "Leave AIDaddy open on a phone or a laptop. It follows the talk in the room, lets small talk pass, and looks up the official pages when it hears a matter, without being asked.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The second connection of /setup: the microphone of this device. The page says plainly what it hears and sends. */
export default function ListenPage() {
  return (
    <SiteShell>
      <main className="site-wrap site-page">
        <div className="site-split wrap-anywhere">
          <PageHead
            label={
              <>
                Connection 02
                <Slash />
                Listening
              </>
            }
            title="Let AIDaddy listen."
            lede="Leave this page open on a phone or a laptop. AIDaddy follows the talk in the room and lets the small talk pass. When it hears a letter, a deadline, a life event or a plan that has rules, it looks up the official pages and shows what to do. Nobody has to ask."
          >
            <p className="site-note">
              A first version. It works while this page is open, in Chrome, Edge and Safari. The other connections are on{" "}
              <SiteLink href="/setup">the setup page</SiteLink>.
            </p>
          </PageHead>
          <ListenPanel />
        </div>
      </main>
    </SiteShell>
  );
}

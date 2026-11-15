import type { Metadata } from "next";
import { ListenPost } from "@/components/listen/listen-post";
import { PageHead, Slash } from "@/components/site/page-head";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import { demoCodeRequired } from "@/lib/cases";
import "@/components/listen/listen.css";

const title = "Let AIDaddy listen";
const description =
  "Leave AIDaddy open on a phone or a laptop. It follows the talk in the room, lets small talk pass, looks up the official pages when it hears a matter, and comes back with a call or a ping.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

// Whether the demo asks for a code is the server's setting at the time of the visit, not at build time.
export const dynamic = "force-dynamic";

/**
 * The second connection of /setup: the microphone of this device. The page says plainly what it hears and sends.
 * The flow is in src/components/listen/post.ts, the rules in src/lib/listen.ts.
 */
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
            lede="Leave this page open on a phone or a laptop. AIDaddy follows the talk in the room and lets the small talk pass. When it hears a letter, a deadline, a life event or a plan that has rules, a desk looks up the official pages without being asked and comes back: a call when the plan has a deadline, a ping for everything else. In an emergency, such as a seizure or someone who does not wake up, it speaks up at once: call 112, then what to do."
          >
            <p className="site-note">
              A first version. It works while this page is open, in Chrome, Edge and Safari. The other connections are on{" "}
              <SiteLink href="/setup">the setup page</SiteLink>.
            </p>
          </PageHead>
          <ListenPost needsCode={demoCodeRequired()} />
        </div>
      </main>
    </SiteShell>
  );
}

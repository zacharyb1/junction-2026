import type { Metadata } from "next";
import { PageHead } from "@/components/site/page-head";
import { SiteShell } from "@/components/site/site-shell";
import { TryForm } from "@/components/try-form";
import { demoCodeRequired } from "@/lib/cases";

const title = "Try AIDaddy in the browser";
const description =
  "Describe a life event, pick your country, and watch AIDaddy research it on official sources with Exa.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function TryPage({ searchParams }: PageProps<"/try">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return (
    <SiteShell>
      <main className="site-wrap site-page">
        {/* The head, the form and the result in the left column; the run panel at the right from the top. */}
        <div className="site-split site-split--three wrap-anywhere">
          <PageHead
            label="Try it live"
            title="Try it on your own life"
            lede="The same engine AIDaddy uses in the family chat. It searches the live web with Exa, official sites first, opens every page it cites, and keeps only what it can point at."
          >
            <p className="site-note">
              Do not paste anything you would not show a stranger: this demo stores the case under an unguessable link.
            </p>
          </PageHead>
          <TryForm code={code} needsCode={demoCodeRequired()} />
        </div>
      </main>
    </SiteShell>
  );
}

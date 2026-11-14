import type { Metadata, Viewport } from "next";
import { officialSites, planRows, quiet, replayData } from "@/components/hud/data";
import { QuietDays } from "@/components/hud/quiet-days";
import { ResearchReplay } from "@/components/hud/research-replay";
import { GateFigures, Hero, Places, PlanPanel, Readouts, Schematic, Section, Start } from "@/components/hud/sections";
import { landingConfig } from "@/components/landing/config";
import { loadScorecard } from "@/components/landing/scorecard-data";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import "@/components/hud/hud.css";

const title = "AIDaddy: silent until it matters";
const description =
  "A butler in your family's group chat. It ignores small talk, researches life events on the live web with Exa, and answers with a plan where every line points at a sentence on an official page.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/**
 * The front page tells one story from top to bottom: quiet days, the moment that matters, the research,
 * the plan, the places AIDaddy works, the proof. It is also the entrance to every other page of the site.
 * Every figure on it is read from a file a script wrote:
 * src/data/replay.json (one recorded run, see scripts/make-replay.mjs) and src/data/scorecard.json (the eval harness).
 * The calmer "reading table" edition of this page lives at /reading.
 */
export default async function Home() {
  const { botUsername, sampleCaseHref } = landingConfig();
  const card = await loadScorecard();
  const replay = replayData();
  const plan = planRows();
  const botUrl = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <SiteShell>
      <div className="hud">
        <main>
          <Hero botUrl={botUrl} sites={officialSites} card={card} />
          <Section
            id="quiet"
            index="01"
            label="Most days"
            title="It reads along and says nothing."
            lede="A family chat is mostly dinner, keys and who picks up the kids. A small model on our own server decides, message by message, whether anything needs AIDaddy at all."
          >
            <QuietDays ignored={quiet.ignored} trigger={quiet.trigger} />
            <GateFigures gate={quiet.gate} />
          </Section>

          <Section
            id="research"
            index="02"
            label="The moment that matters"
            title="Then it goes to work."
            lede="Three Exa searches at once on the official sites of the right country, then a fourth for pages published in the last four months. Every page AIDaddy wants to cite is opened again, and every quote is looked up on that page before it may stay."
          >
            <ResearchReplay data={replay}>
              <SiteLink href="/try" className="hud-btn hud-btn--primary">
                Run your own question
              </SiteLink>
            </ResearchReplay>
          </Section>

          <Section
            id="plan"
            index="03"
            label="The answer"
            title="A plan you can check, line by line."
            lede="What to do, by when, and the official sentence that says so. No source, no line."
          >
            <PlanPanel title={plan.title} caseHref={plan.caseHref} rows={plan.rows} />
          </Section>

          <Section
            id="where"
            index="04"
            label="Where it works"
            title="One butler, wherever the household is."
            lede="Today AIDaddy works in the Telegram group chat and in a chat on this site. The other places are ideas. Each one is shown as a scripted replay or a mockup, and says so."
          >
            <Places />
          </Section>

          {card ? (
            <Section
              id="proof"
              index="05"
              label="Measured"
              title="We test it on the live web, and publish the misses."
              lede="Judges will ask their own questions. So do we: the same scenarios run again and again against real official sites."
            >
              <Readouts card={card} />
            </Section>
          ) : null}

          <Section
            id="system"
            index={card ? "06" : "05"}
            label="Under the hood"
            title="Six parts, one job each."
            lede="Conversation stays in the chat. Research and checking live in one engine that the bot and this website share."
          >
            <Schematic />
          </Section>

          <Start botUrl={botUrl} caseHref={sampleCaseHref ?? plan.caseHref} />
        </main>
      </div>
    </SiteShell>
  );
}

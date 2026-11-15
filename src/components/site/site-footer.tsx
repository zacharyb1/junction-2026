import Link from "next/link";
import { landingConfig } from "@/components/site/config";
import { SiteLink } from "@/components/site/site-link";
import { Wordmark } from "@/components/site/wordmark";

/** The same footer on every page: every part of the site by name, then what the project is and is not. */
export function SiteFooter() {
  const { repoUrl } = landingConfig();
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="site-footer-grid">
          <div className="site-footer-about">
            <Wordmark />
            <p>A butler for your family&apos;s group chat. It stays silent until it matters.</p>
          </div>
          <nav aria-labelledby="footer-use">
            <h2 id="footer-use">Use it</h2>
            <ul>
              <li>
                <SiteLink href="/try">Try AIDaddy without setup</SiteLink>
              </li>
              <li>
                <SiteLink href="/chat">Talk to AIDaddy</SiteLink>
              </li>
              <li>
                <SiteLink href="/call">Let AIDaddy call</SiteLink>
              </li>
              <li>
                <Link href="/setup">Set up</Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-watch">
            <h2 id="footer-watch">See it work</h2>
            <ul>
              <li>
                <Link href="/demo/chat">In the group chat</Link>
              </li>
              <li>
                <Link href="/demo/browser">In the browser</Link>
              </li>
              <li>
                <Link href="/demo/talk">At the kitchen table</Link>
              </li>
              <li>
                <Link href="/demo/calendar">In the calendar</Link>
              </li>
              <li>
                <SiteLink href="/autopilot">One step ahead</SiteLink>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-more">
            <h2 id="footer-more">More</h2>
            <ul>
              <li>
                <Link href="/">Front page</Link>
              </li>
              <li>
                <Link href="/scorecard">Scorecard</Link>
              </li>
              <li>
                <Link href="/setup#privacy">Privacy and limits</Link>
              </li>
              {repoUrl ? (
                <li>
                  <a href={repoUrl} target="_blank" rel="noopener noreferrer">
                    Source code<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
        <div className="site-footer-legal">
          <p>
            Built at Junction 2026 for the Exa challenge. Research with sources, not legal advice. AIDaddy is an independent
            hackathon project, not an official service. It is not affiliated with Kela, Vero, Telegram or any film studio.
          </p>
        </div>
      </div>
    </footer>
  );
}

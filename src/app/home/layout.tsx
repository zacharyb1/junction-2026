import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { HomeShell } from "@/components/home/home-app";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter" });

const description = "Help for your family, right now: hidden opportunities, companies called for quotes, and parents like you. Nothing is sent or paid without your yes.";

export const metadata: Metadata = {
  title: { default: "AIDaddy for your family", template: "%s · AIDaddy" },
  description,
  openGraph: { title: "AIDaddy for your family", description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title: "AIDaddy for your family", description },
};

export const viewport: Viewport = { themeColor: "#fbf8f3", viewportFit: "cover" };

/**
 * AIDaddy's own phone app, in the family look of the Claude Design prototype. Each screen is its own page under /home;
 * they share this frame (a phone-width column, transitions, demo notes). Like /assistant, whose chat is the Ask tab,
 * it has its own full-screen frame instead of the site's header and footer.
 */
export default function HomeLayout({ children }: LayoutProps<"/home">) {
  return (
    <div className={inter.variable}>
      <HomeShell>{children}</HomeShell>
    </div>
  );
}

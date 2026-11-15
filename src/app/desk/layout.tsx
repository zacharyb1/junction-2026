import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { DeskShell } from "@/components/desk/desk-shell";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });

const description = "AIDaddy on a laptop: your family's hidden opportunities and companies called for quotes, in one place. Nothing is sent or paid without your yes.";

export const metadata: Metadata = {
  title: { default: "AIDaddy for your family", template: "%s · AIDaddy" },
  description,
  openGraph: { title: "AIDaddy for your family", description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title: "AIDaddy for your family", description },
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

/** AIDaddy's desktop app, laid out like a chat app: sections in a sidebar, each section a page under /desk. */
export default function DeskLayout({ children }: LayoutProps<"/desk">) {
  return (
    <div className={inter.variable}>
      <DeskShell>{children}</DeskShell>
    </div>
  );
}

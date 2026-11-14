import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { baseUrl } from "@/lib/cases";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "A butler for your family chat. It researches life events on the live web with Exa, and every line of the plan carries a quote checked on its page.";

/** Where link previews point their image. A mistyped PUBLIC_BASE_URL must not take every page down. */
function siteUrl(): URL {
  try {
    return new URL(baseUrl());
  } catch {
    console.warn("[preview] PUBLIC_BASE_URL is not a full address such as https://example.com, so link previews point at localhost.");
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: "AIDaddy", template: "%s · AIDaddy" },
  description,
  // A page below the front page that sets its own openGraph replaces this one as a whole, image included:
  // it repeats siteName and brings an opengraph-image file of its own (see src/app/try).
  openGraph: { title: "AIDaddy", description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title: "AIDaddy", description },
};

/** Every page is drawn on the control room's near-black ground, so a phone's address bar is too. */
export const viewport: Viewport = { themeColor: "#05080d", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

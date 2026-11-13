import { Sofia_Sans, Sofia_Sans_Semi_Condensed } from "next/font/google";

/**
 * The landing page's typeface: Sofia Sans, drawn for a city's public signs and notices.
 * The semi-condensed width sets boards and tables, where a row has to hold more.
 * Both are loaded here and applied through the .landing wrapper, so /try and /c/[id] keep Geist.
 */
export const signFont = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sign",
  display: "swap",
});

export const boardFont = Sofia_Sans_Semi_Condensed({
  subsets: ["latin"],
  variable: "--font-board",
  display: "swap",
});

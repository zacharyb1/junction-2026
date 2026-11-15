import { Chiron_Sung_HK, Inter, Kalam, Lora } from "next/font/google";

/** Shared reading typography: display, prose, factual labels and marginal notes. */
export const readingDisplay = Chiron_Sung_HK({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-reading-display", display: "swap" });
export const readingBody = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-reading-body", display: "swap" });
export const readingSans = Inter({ subsets: ["latin"], variable: "--font-reading-sans", display: "swap" });
export const readingHand = Kalam({ subsets: ["latin"], weight: "400", variable: "--font-reading-hand", display: "swap" });

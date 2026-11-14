/**
 * The scripted chat for the /demo/chat replay (issue #33). The family is fictional. AIDaddy's plan lines,
 * citation numbers, the quote count and the case link are copied from a real run on the server:
 * https://86.38.238.136.sslip.io/c/8bfhhPMjACQTVb3z (Espoo, 8 of 8 quotes checked), including the
 * drafted notice to the employer that waits for a click there.
 */
export type Speaker = "aino" | "mikko" | "aidaddy";

export type Beat =
  | { kind: "message"; from: Speaker; text: string; at: number; typing?: number; buttons?: string[]; preview?: Preview }
  | { kind: "note"; text: string; at: number };

export type Preview = { site: string; title: string; description: string; href: string };

export const CASE_URL = "https://86.38.238.136.sslip.io/c/8bfhhPMjACQTVb3z";

export const PEOPLE: Record<Speaker, { name: string; color: string; initials?: string }> = {
  aino: { name: "Aino", color: "#2f7d32", initials: "A" },
  mikko: { name: "Mikko", color: "#c2410c", initials: "M" },
  aidaddy: { name: "AIDaddy", color: "#1d4ed8" },
};

/** Times are milliseconds from the start. `typing` shows "is typing" for that long before the message. */
export const SCRIPT: Beat[] = [
  { kind: "message", from: "mikko", text: "who's picking up groceries tonight?", at: 600 },
  { kind: "message", from: "aino", text: "me, after yoga 🧘", at: 2200 },
  { kind: "note", text: "AIDaddy reads along. Small talk stays on our server, and it stays silent.", at: 3600 },
  { kind: "message", from: "aino", text: "ok big news… we're expecting!! due in May 🥹", at: 6200 },
  { kind: "message", from: "mikko", text: "WHAT 😭❤️❤️", at: 7600 },
  {
    kind: "message",
    from: "aidaddy",
    text: "Congratulations to you both. A matter of state: AIDaddy is consulting the official sources.",
    at: 9400,
    typing: 1200,
  },
  {
    kind: "message",
    from: "aidaddy",
    text: [
      "The agreement, in four articles:",
      "1. Book the maternity clinic check: by the 18th week of pregnancy at the latest [1]",
      "2. Tell the employer: no later than two months before pregnancy leave starts [3]",
      "3. Apply for pregnancy allowance: within two months of the leave starting [6]",
      "4. Apply for the maternity grant: no later than 2 months before the due date [8]",
      "",
      "8 of 8 quotes checked on their pages.",
    ].join("\n"),
    at: 14800,
    typing: 3600,
    preview: {
      site: "86.38.238.136.sslip.io",
      title: "Pregnancy and Parental Leave Checklist",
      description: "Espoo, Finland · every line has its sentence from Kela, Suomi.fi or tem.fi",
      href: CASE_URL,
    },
  },
  { kind: "message", from: "mikko", text: "does my boss need to know too, or just Aino's?", at: 20500 },
  {
    kind: "message",
    from: "aidaddy",
    text: "Yours too, if you take parental leave. tem.fi: the employer must be notified of a pregnancy leave, parental leave or childcare leave [5]. The whole sentence is on the case page.",
    at: 23400,
    typing: 1800,
  },
  {
    kind: "message",
    from: "aidaddy",
    text: "I worked ahead and drafted Aino's notice to her employer. Sending waits for your click.",
    at: 27200,
    typing: 1500,
    buttons: ["Open the draft", "Not now"],
  },
  { kind: "message", from: "aino", text: "you're the best AIDaddy 🙏", at: 30800 },
  { kind: "note", text: "No reply needed. AIDaddy goes back to listening.", at: 32300 },
];

export const DURATION = 36000;

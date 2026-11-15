/**
 * The script of /demo/call: someone asks AIDaddy to call their boss, in their own voice.
 *
 * Concept. AIDaddy cannot copy a voice or ring someone's phone number today. What exists is the demo call of
 * docs/DEMO_CALLS.md: one confirmed call in AIDaddy's own voice, to a test line. The scene shows the rules a
 * call in the person's voice would keep:
 *   1. it asks for the number, it never looks one up;
 *   2. it shows the exact words and waits for a yes before anything rings;
 *   3. its first sentence on the call says that an assistant is speaking with a copy of the person's voice.
 * Rule 3 is the point of the scene: a copied voice that passes as the person would deceive whoever answers.
 * tests/call-demo.test.ts holds the three rules to the script.
 *
 * The number is masked on purpose, so no real person's number is ever on the screen.
 */
export const DURATION = 36000;

export const OWNER = "Mikko";
export const BOSS = "Sari";
export const NUMBER = "+358 40 ••• ••42";

export type ChatLine = { at: number; who: "Mikko" | "AIDaddy"; text: string };

export const CHAT: ChatLine[] = [
  { at: 800, who: "Mikko", text: "AIDaddy, I woke up with a fever. Call my boss and tell her I'm staying home." },
  { at: 3200, who: "AIDaddy", text: "I can call her in your voice. What is your boss's number?" },
  { at: 5600, who: "Mikko", text: `${NUMBER}. Her name is ${BOSS}.` },
];

/** What AIDaddy shows before anything rings. */
export const PROPOSAL_AT = 7600;
export const PROPOSAL = {
  to: `${BOSS}, your boss`,
  number: NUMBER,
  voice: "A copy of your voice, from the recording you made",
  say: `This is AIDaddy, ${OWNER}'s assistant, speaking with a copy of his voice at his request. ${OWNER} has a fever and is staying home today.`,
  ask: "Who takes the ten o'clock handover?",
};

/** Mikko presses Call. Nothing rings before this. */
export const CONFIRM_AT = 12800;
export const RING_AT = 13400;
export const ANSWER_AT = 16000;

export type CallLine = { at: number; who: "AIDaddy" | "Sari"; text: string };

export const CALL: CallLine[] = [
  { at: 16400, who: "AIDaddy", text: `Hello ${BOSS}. This is AIDaddy, ${OWNER}'s assistant, speaking with a copy of his voice at his request.` },
  { at: 20000, who: "AIDaddy", text: `${OWNER} has a fever and is staying home today. Who takes the ten o'clock handover?` },
  { at: 23400, who: "Sari", text: "Oh no. Tell him to rest. Jussi can take the handover." },
  { at: 26200, who: "AIDaddy", text: "Thank you. Does he need a sick note?" },
  { at: 28200, who: "Sari", text: "From the fourth day. Not for today." },
  { at: 30200, who: "AIDaddy", text: "I will tell him. Goodbye." },
];

export const END_AT = 31800;

/** What AIDaddy reports back: only what was said on the call. */
export const RESULT_AT = 32600;
export const RESULT = [`${BOSS} knows you are staying home.`, "Jussi takes the 10:00 handover.", "A sick note is needed from the fourth day."];

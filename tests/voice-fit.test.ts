import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as speak } from "@/app/api/aidaddy/speak/route";
import { AIDADDY_VOICE, forVoice, renderSpeech, replyLanguage, speechHash, spokenDelivery, spokenLanguage } from "@/lib/speech";

/**
 * The voice fits the case: its language, the model that speaks that language, and a delivery chosen from what
 * happened. ElevenLabs is stubbed here; what the real voice does with these settings was measured by hand
 * (docs/DECISIONS.md, Sun 03:10).
 */

describe("the language a case is spoken in", () => {
  it("is the case's own language for every language the voice is held to", () => {
    for (const code of ["fi", "sv", "de", "es", "fr", "uk", "et"]) expect(spokenLanguage({ language: code })).toBe(code);
    expect(spokenLanguage({ language: "FI" })).toBe("fi");
    expect(spokenLanguage({ language: "fi-FI" })).toBe("fi");
  });

  it("is left to the voice for English and for a language it does not know", () => {
    expect(spokenLanguage({ language: "en" })).toBeUndefined();
    expect(spokenLanguage({ language: "en-GB" })).toBeUndefined();
    expect(spokenLanguage({ language: "xx" })).toBeUndefined();
  });
});

describe("the delivery of a case", () => {
  const of = (event: string, title: string) => spokenDelivery({ event, title });

  it("is gentle after bad news", () => {
    expect(of("job_loss", "What to do after losing your job")).toBe("gentle");
    expect(of("rent_increase_letter", "Contesting a rental increase")).toBe("gentle");
    expect(of("parking_fine", "A parking fine in Espoo")).toBe("gentle");
    expect(of("flight_cancelled", "Your rights after a cancelled flight")).toBe("gentle");
    expect(of("letter", "Irtisanominen: mitä tehdä nyt")).toBe("gentle");
    expect(of("letter", "Vuokrankorotus ja sen riitauttaminen")).toBe("gentle");
  });

  it("is bright after good news", () => {
    expect(of("pregnancy", "Pregnancy checklist for Espoo residents")).toBe("bright");
    expect(of("new_job", "Starting a new job in Finland")).toBe("bright");
    expect(of("event", "Raskaus: mitä tehdä ja milloin")).toBe("bright");
  });

  it("is plain for ordinary paperwork", () => {
    expect(of("moving_city", "Moving to another city next month")).toBe("plain");
    expect(of("residence_permit", "Renewing a residence permit")).toBe("plain");
    expect(of("daycare", "Applying for a daycare place in Espoo")).toBe("plain");
    // Words that only contain a trigger are not the trigger.
    expect(of("refinement", "Defined benefits and confined spaces")).toBe("plain");
  });

  it("lets bad news win when a case holds both", () => {
    expect(of("pregnancy", "Pregnant and laid off: what applies")).toBe("gentle");
  });
});

describe("the name, written for the ear", () => {
  it("is two words, with a Finnish ending kept", () => {
    expect(forVoice("AIDaddy here.")).toBe("AI Daddy here.");
    expect(forVoice("AIDaddyn suunnitelma. Kysy AIDaddylta.")).toBe("AI Daddyn suunnitelma. Kysy AI Daddylta.");
    expect(forVoice("My daddy said so.")).toBe("My daddy said so.");
  });
});

describe("the language of a chat reply", () => {
  it("names Finnish, Swedish, German, Spanish, French and Ukrainian replies", () => {
    expect(replyLanguage("Hae äitiysavustusta Kelasta, kun raskaus on kestänyt 154 päivää. Se on tehtävä ennen laskettua aikaa, ja voit hakea sitä verkossa.")).toBe("fi");
    expect(replyLanguage("Du ska ansöka om moderskapsunderstöd hos FPA och det måste göras innan barnet är fött. Du kan göra det på nätet.")).toBe("sv");
    expect(replyLanguage("Sie müssen den Antrag vor der Geburt stellen, und das ist nicht schwer. Der Antrag ist mit dem Formular auf der Seite möglich.")).toBe("de");
    expect(replyLanguage("Debe presentar la solicitud antes del parto, y puede hacerlo en línea con el formulario que está en la página.")).toBe("es");
    expect(replyLanguage("Vous devez déposer la demande avant la naissance, et vous pouvez le faire en ligne avec le formulaire sur la page.")).toBe("fr");
    expect(replyLanguage("Подайте заяву до народження дитини. Це можна зробити через інтернет.")).toBe("uk");
  });

  it("leaves English, a short reply and Russian to the voice", () => {
    expect(replyLanguage("Apply to Kela for the maternity grant before the due date. You can do it online, and the form is on the page.")).toBeUndefined();
    expect(replyLanguage("Kiitos!")).toBeUndefined();
    expect(replyLanguage("Подайте заявление до рождения ребёнка.")).toBeUndefined();
    // An English reply that quotes Finnish names stays English.
    expect(replyLanguage("You apply for äitiysavustus at Kela, and the form is on the page that is linked in the case file.")).toBeUndefined();
  });
});

describe("what is sent to ElevenLabs", () => {
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  beforeEach(() => {
    sent.length = 0;
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "");
    vi.stubEnv("DEMO_OPEN", "1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        sent.push({ url, body: JSON.parse(String(init.body)) });
        return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends an English, plain reading exactly as before", async () => {
    await renderSpeech("Apply to Kela.");
    expect(sent[0].body).toEqual({ text: "Apply to Kela.", model_id: "eleven_flash_v2_5" });
    expect(sent[0].url).toContain(`/v1/text-to-speech/${AIDADDY_VOICE}`);
  });

  it("sends the language, the settings of the delivery and the name as two words", async () => {
    await renderSpeech("AIDaddyn suunnitelma.", { language: "fi", delivery: "gentle" });
    expect(sent[0].body).toEqual({
      text: "AI Daddyn suunnitelma.",
      model_id: "eleven_flash_v2_5",
      language_code: "fi",
      voice_settings: { stability: 0.7, speed: 0.92 },
    });
  });

  it("speaks Estonian with the model that knows it", async () => {
    await renderSpeech("Esita taotlus.", { language: "et" });
    expect(sent[0].body).toMatchObject({ model_id: "eleven_v4_turbo", language_code: "et" });
  });

  it("names a plain rendering as it always was, and any other one differently", () => {
    const before = (text: string, language?: string) =>
      createHash("sha256")
        .update(`${AIDADDY_VOICE}\neleven_flash_v2_5\n${text}${language ? `\n${language}` : ""}`)
        .digest("hex")
        .slice(0, 16);
    expect(speechHash("Apply to Kela.")).toBe(before("Apply to Kela."));
    expect(speechHash("Hae Kelasta.", "fi")).toBe(before("Hae Kelasta.", "fi"));
    expect(speechHash("Apply to Kela.", undefined, "gentle")).not.toBe(before("Apply to Kela."));
    expect(speechHash("Esita taotlus.", "et")).not.toBe(before("Esita taotlus.", "et"));
    expect(speechHash("AIDaddy here.")).not.toBe(before("AIDaddy here."));
  });

  it("speaks a Finnish chat reply as Finnish and an English one as written", async () => {
    const reply = (text: string) =>
      speak(new Request("https://aidaddy.example/api/aidaddy/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }));
    const fi = await reply("Hae äitiysavustusta Kelasta, kun raskaus on kestänyt 154 päivää. Se on tehtävä ennen laskettua aikaa, ja voit hakea sitä verkossa.");
    expect(fi.status).toBe(200);
    expect(sent[0].body).toMatchObject({ language_code: "fi" });
    await reply("AIDaddy here. Apply to Kela for the maternity grant before the due date, and the form is on the page.");
    expect(sent[1].body).toEqual({ text: "AI Daddy here. Apply to Kela for the maternity grant before the due date, and the form is on the page.", model_id: "eleven_flash_v2_5" });
  });
});

describe("the front page's narration", () => {
  it("names the case it was rendered from, and that file exists", async () => {
    const { default: planAudio } = await import("@/data/plan-audio.json");
    const { existsSync } = await import("node:fs");
    // The page offers "Hear the plan" only while this id is the recorded run's id (PlanPanel in
    // src/components/hud/sections.tsx). After a new recording the button is simply gone, and this test still
    // passes: scripts/make-replay.mjs says how to render the new narration and bring the button back.
    expect(planAudio.caseId).toMatch(/^[\w-]{8,}$/);
    expect(planAudio.file).toBe("/hud/plan.mp3");
    expect(planAudio.seconds).toBeGreaterThan(5);
    expect(existsSync(new URL("../public/hud/plan.mp3", import.meta.url))).toBe(true);
  });
});

describe("when ElevenLabs says no", () => {
  beforeEach(() => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("DEMO_OPEN", "1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const answer = (status: number, body: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })));

  it("names the short code of the answer, so the operator can read the cause", async () => {
    answer(400, { detail: { type: "invalid_request", code: "bad_request", status: "invalid_uid", message: "An invalid ID has been received: 'x'." } });
    await expect(renderSpeech("Hello.")).rejects.toThrow("ElevenLabs answered 400 (invalid_uid)");
    answer(401, { detail: { status: "missing_permissions", message: "The API key you used is missing the permission text_to_speech" } });
    await expect(renderSpeech("Hello.")).rejects.toThrow("ElevenLabs answered 401 (missing_permissions)");
  });

  it("passes on the status alone when the answer has no short code", async () => {
    answer(500, "<html>upstream error</html>");
    await expect(renderSpeech("Hello.")).rejects.toThrow(/^ElevenLabs answered 500$/);
    answer(400, { detail: { message: "a long sentence that is not a code, with the text of the request in it ".repeat(3) } });
    await expect(renderSpeech("Hello.")).rejects.toThrow(/^ElevenLabs answered 400$/);
  });

  it("gives the chat page its sentence and the operator the reason", async () => {
    answer(401, { detail: { status: "quota_exceeded" } });
    const res = await speak(new Request("https://aidaddy.example/api/aidaddy/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Hello there." }) }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "AIDaddy lost its voice for a moment. The reply is still in the chat.",
      reason: "ElevenLabs answered 401 (quota_exceeded)",
    });
  });
});

describe("the voice id an operator typed", () => {
  const sent: string[] = [];
  beforeEach(() => {
    sent.length = 0;
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        sent.push(url);
        return new Response(new Uint8Array([1]), { headers: { "content-type": "audio/mpeg" } });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is used without the quotes, spaces or line ending pasted along with it", async () => {
    vi.stubEnv("ELEVENLABS_VOICE_ID", ' "JBFqnCBsd6RMkjVDRZzb"\r');
    await renderSpeech("Hello.");
    expect(sent[0]).toContain("/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?");
  });

  it("gives AIDaddy's own voice when it is empty or not a voice id", async () => {
    for (const typed of ["", " ", "<voice id>", "AIDaddy", "your-voice-id-here"]) {
      vi.stubEnv("ELEVENLABS_VOICE_ID", typed);
      await renderSpeech("Hello.");
    }
    expect(sent).toHaveLength(5);
    for (const url of sent) expect(url).toContain(`/v1/text-to-speech/${AIDADDY_VOICE}?`);
  });
});

describe("a server whose key does not own AIDaddy's voice", () => {
  const OWN = "UWUOFJTWwuSmZFHzbMpM";
  const PREMADE = "JBFqnCBsd6RMkjVDRZzb";
  const asked: string[] = [];
  beforeEach(() => {
    asked.length = 0;
    vi.resetModules();
    vi.stubEnv("ELEVENLABS_API_KEY", "key-of-another-account");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        asked.push(url.includes(OWN) ? "own" : url.includes(PREMADE) ? "premade" : "other");
        if (url.includes(OWN)) {
          return new Response(JSON.stringify({ detail: { status: "voice_not_found" } }), { status: 404, headers: { "content-type": "application/json" } });
        }
        return new Response(new Uint8Array([7, 7]), { headers: { "content-type": "audio/mpeg" } });
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("speaks with the voice every account has, and asks for the missing one only once", async () => {
    const speech = await import("@/lib/speech");
    expect(speech.spokenVoice()).toBe("own");
    const before = speech.speechHash("Hello.");
    expect((await speech.renderSpeech("Hello.")).length).toBe(2);
    expect(asked).toEqual(["own", "premade"]);
    expect(speech.spokenVoice()).toBe("premade");
    // The rendering is named after the voice that really spoke, so it is never served as AIDaddy's own.
    expect(speech.speechHash("Hello.")).not.toBe(before);
    await speech.renderSpeech("Hello again.");
    expect(asked).toEqual(["own", "premade", "premade"]);
  });

  it("still fails with the reason when the premade voice is refused too", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: { status: "voice_not_found" } }), { status: 404 })));
    const speech = await import("@/lib/speech");
    await expect(speech.renderSpeech("Hello.")).rejects.toThrow("ElevenLabs answered 404 (voice_not_found)");
  });
});

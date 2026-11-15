/* eslint-disable @typescript-eslint/no-unused-expressions -- playwright-cli evaluates this function expression. */
/**
 * Browser regression for the chat's voice lifecycle. No provider calls or real microphone.
 * Start the built app with DEMO_OPEN=1, ELEVENLABS_API_KEY=test,
 * UKK_API_URL=http://127.0.0.1:1 and UKK_API_KEY=test; then:
 *   playwright-cli -s=chat-voice open http://127.0.0.1:3000/chat
 *   playwright-cli -s=chat-voice run-code --filename=scripts/check-chat-voice.js
 *   playwright-cli -s=chat-voice close
 */
async (page) => {
  const origin = new URL(page.url()).origin;
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const flush = () => page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  const results = [];

  await page.addInitScript(() => {
    const audit = (window.voiceAudit = { speech: [], decode: [], media: [], starts: 0, recordings: [], transcriptions: 0, samples: 0, sources: [], analysers: [] });
    // Deliberately let aborted requests resolve: cancellation must also guard
    // response/decode work that won the race against AbortController.
    const originalFetch = window.fetch;
    window.fetch = (input, options) => {
      const path = new URL(typeof input === "string" ? input : input.url, location.href).pathname;
      if (path === "/api/aidaddy") {
        return Promise.resolve(new Response('data: {"choices":[{"delta":{"content":"A short reply."}}]}\n\ndata: [DONE]\n\n', {
          headers: { "content-type": "text/event-stream" },
        }));
      }
      if (path === "/api/aidaddy/speak") {
        return new Promise((resolve) => audit.speech.push({ resolve, signal: options.signal }));
      }
      if (path === "/api/aidaddy/listen") {
        audit.transcriptions++;
        return Promise.resolve(Response.json({ text: "A recorded note" }));
      }
      return originalFetch(input, options);
    };
    window.AudioContext = class {
      destination = {};
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
      decodeAudioData() { return new Promise((resolve) => audit.decode.push(resolve)); }
      createAnalyser() {
        const analyser = {
          fftSize: 512,
          connected: false,
          connect() { this.connected = true; },
          disconnect() { this.connected = false; },
          getByteTimeDomainData(samples) { audit.samples++; samples.fill(128); },
        };
        audit.analysers.push(analyser);
        return analyser;
      }
      createBufferSource() {
        const source = {
          connected: false,
          connect() { this.connected = true; },
          disconnect() { this.connected = false; },
          start() { audit.starts++; },
          // Real browsers can suppress onended when the context closes.
          stop() {},
        };
        audit.sources.push(source);
        return source;
      }
    };
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => {
      const track = { readyState: "live", stop() { this.readyState = "ended"; } };
      audit.media.push({ resolve, track, stream: { getTracks: () => [track] } });
    });
    window.MediaRecorder = class {
      state = "inactive";
      mimeType = "audio/webm";
      constructor(stream) { this.stream = stream; audit.recordings.push(this); }
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        queueMicrotask(() => {
          this.ondataavailable?.({ data: new Blob(["synthetic voice note"]) });
          this.onstop?.();
        });
      }
    };
  });

  const openChat = () => page.goto(`${origin}/chat`);
  const voiceOn = () => page.getByRole("button", { name: "Voice off", exact: true }).click();
  const voiceOff = () => page.getByRole("button", { name: "Voice on", exact: true }).click();
  const send = async (number) => {
    await page.getByRole("textbox", { name: "Your message to AIDaddy" }).fill(`Message ${number}`);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.waitForFunction((count) => window.voiceAudit.speech.length === count, number);
  };
  const answer = async (index, status = 200) => {
    await page.evaluate(({ index, status }) => {
      window.voiceAudit.speech[index].resolve(status === 200
        ? new Response("mock audio")
        : Response.json({ error: "stale speech failure" }, { status }));
    }, { index, status });
    await flush();
  };
  const decode = async (index) => {
    await page.evaluate((i) => window.voiceAudit.decode[i]({}), index);
    await flush();
  };
  const state = () => page.evaluate(() => ({
    starts: window.voiceAudit.starts,
    decodes: window.voiceAudit.decode.length,
    transcriptions: window.voiceAudit.transcriptions,
    tracks: window.voiceAudit.media.map((m) => m.track.readyState),
    recordings: window.voiceAudit.recordings.map((r) => r.state),
  }));
  const leaveChat = async () => {
    await page.locator('a[href="/demo"]').first().click();
    await page.waitForURL(`${origin}/demo`);
    await page.getByRole("textbox", { name: "Your message to AIDaddy" }).waitFor({ state: "detached" });
  };
  const grantMicrophone = async () => {
    await page.evaluate(() => {
      const request = window.voiceAudit.media[0];
      request.resolve(request.stream);
    });
    await flush();
  };

  await openChat();
  await voiceOn();
  await send(1);
  await voiceOff();
  check(await page.evaluate(() => window.voiceAudit.speech[0].signal?.aborted === true), "Muting must abort pending speech");
  await answer(0);
  check((await state()).decodes === 0, "Muted speech must not be decoded or played");
  check(await page.locator('p[role="alert"]').count() === 0, "Muting must not show an error");
  results.push("Voice off cancels pending speech");

  await openChat();
  await voiceOn();
  await send(1);
  await leaveChat();
  await answer(0);
  check((await state()).decodes === 0 && (await state()).starts === 0, "Leaving the chat must discard pending speech");
  results.push("Navigation discards pending speech");

  await openChat();
  await voiceOn();
  await send(1);
  await voiceOff();
  await voiceOn();
  await send(2);
  await answer(1);
  await page.waitForFunction(() => window.voiceAudit.decode.length === 1);
  await decode(0);
  check((await state()).starts === 1, "The new spoken reply must play");
  await answer(0);
  check((await state()).starts === 1 && (await state()).decodes === 1, "An older reply must not replace the new one after off/on");
  results.push("Off/on does not revive stale audio; current audio plays");

  await openChat();
  await voiceOn();
  await send(1);
  await voiceOff();
  await voiceOn();
  await send(2);
  await answer(0, 502);
  check(await page.locator('p[role="alert"]').count() === 0, "A stale error must not appear in the new voice session");
  await answer(1);
  await page.waitForFunction(() => window.voiceAudit.decode.length === 1);
  await decode(0);
  check((await state()).starts === 1, "A stale error must not stop the current spoken reply");
  results.push("Stale errors do not affect a new voice session");

  await openChat();
  await voiceOn();
  await send(1);
  await answer(0);
  await page.waitForFunction(() => window.voiceAudit.decode.length === 1);
  await voiceOff();
  await voiceOn();
  await decode(0);
  check((await state()).starts === 0, "Muting during audio decoding must prevent playback after off/on");
  results.push("Muting also cancels audio already being decoded");

  await openChat();
  await voiceOn();
  await send(1);
  await answer(0);
  await page.waitForFunction(() => window.voiceAudit.decode.length === 1);
  await decode(0);
  await page.evaluate(() => { window.voiceAudit.oldEnded = window.voiceAudit.sources[0].onended; });
  await send(2);
  await answer(1);
  await page.waitForFunction(() => window.voiceAudit.decode.length === 2);
  await decode(1);
  await page.evaluate(() => window.voiceAudit.oldEnded());
  check(await page.evaluate(() => window.voiceAudit.sources[1].connected && window.voiceAudit.analysers[1].connected),
    "A stale onended callback must not disconnect the next reply");
  await leaveChat();
  const afterFrames = () => page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return window.voiceAudit.samples;
  });
  const samples = await afterFrames();
  check(await afterFrames() === samples, "Navigation must stop the volume animation even without onended");
  check(await page.evaluate(() => [...window.voiceAudit.sources, ...window.voiceAudit.analysers].every((node) => !node.connected)),
    "Navigation must disconnect all playback nodes");
  results.push("Playback cleanup cancels animation directly and preserves the next reply");

  await openChat();
  await page.getByRole("button", { name: "Record a voice note", exact: true }).click();
  await page.waitForFunction(() => window.voiceAudit.media.length === 1);
  await grantMicrophone();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("textarea")?.value === "A recorded note");
  const normal = await state();
  check(normal.transcriptions === 1 && normal.tracks[0] === "ended", "A stopped recording must transcribe once and release its track");
  results.push("A normal voice note still transcribes into the draft");

  await openChat();
  await page.getByRole("button", { name: "Record a voice note", exact: true }).click();
  await page.waitForFunction(() => window.voiceAudit.media.length === 1);
  await leaveChat();
  await grantMicrophone();
  const late = await state();
  check(late.recordings.length === 0 && late.tracks[0] === "ended" && late.transcriptions === 0,
    "Granting permission after leaving the chat must release the stream without recording or transcribing");
  results.push("Late microphone permission is released after navigation");

  await openChat();
  await page.getByRole("button", { name: "Record a voice note", exact: true }).click();
  await page.waitForFunction(() => window.voiceAudit.media.length === 1);
  await grantMicrophone();
  await page.getByRole("button", { name: "Stop recording", exact: true }).waitFor();
  await leaveChat();
  await flush();
  const abandoned = await state();
  check(abandoned.recordings[0] === "inactive" && abandoned.tracks[0] === "ended" && abandoned.transcriptions === 0,
    "Leaving during recording must release the microphone without uploading the abandoned note");
  results.push("Navigation cancels active recording without transcription");

  return results;
}

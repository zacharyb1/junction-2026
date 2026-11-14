# Kaveri add-ons: sponsor-technology facts

Fetched Fri 2026-11-13 ~22:45-23:15 EET. Tags: [verified] = read on the owner's page / first-party source in this session; [unknown] = not found or not confirmed. Raw sources were read with curl (`.md` doc sources where the vendor publishes them), not through a summarising fetcher.
`RAW/` = `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/` (branch `main` at fetch time).
"Feasibility" notes at the end of each section are my read, not vendor statements.

---

## 1. Cloudinary's hackathon tools

**The hackathon page.** `https://cld.media/hackathons` -> 308 `https://www.cld.media/hackathons` -> 307 `https://cloudinary.com/pages/hackathons/` (HTTP 200); both URLs in the brief are the same page. [verified]

**The four tools.** The page does not use the words "four tools"; its requirement line names exactly four: "Use the React or Next.js AI Starter Kit and/or our AI Skills Pack or AI Power Start Prompt." Mission: "use Cloudinary's Starter Kits or Skills Pack to build a web app that shows what's possible with Cloudinary's powerful media platform." Other requirements: "Ship something functional and production-ready." "Show an innovative use of Cloudinary's media capabilities." plus a survey link (https://cld.media/hackathon-survey). https://cloudinary.com/pages/hackathons/ [verified]

| # | Tool | How it is used | Link given on the page |
|---|---|---|---|
| 1 | Cloudinary React AI Starter Kit | `npx create-cloudinary-react` | https://www.npmjs.com/package/create-cloudinary-react |
| 2 | Cloudinary Next.js AI Starter Kit | `npx create-cloudinary-next` | https://www.npmjs.com/package/create-cloudinary-next |
| 3 | Skills Pack ("If you have an existing app or want to use a different framework, try our Skills Pack") | `npx skills add cloudinary-devs/skills` (repo https://github.com/cloudinary-devs/skills; includes a `cloudinary-docs` skill) | https://cloudinary.com/documentation/cloudinary_llm_mcp#cloudinary_skills |
| 4 | AI Power Start ("Want to get started quickly with a detailed AI prompt?") | Paste the "Get Started prompt" into an AI coding assistant; canonical text https://cloudinary.com/documentation/prompts/cloudinary-get-started-prompt.md | https://cloudinary.com/documentation/ai_powerstart |

- All four are developer set-up tools (two scaffolders, an agent-skills pack, a set-up prompt). None of them is a media feature: OCR, pixelation, enhancement and AI Vision are platform features/add-ons, not "one of the four". Sources: hackathon page; https://cloudinary.com/documentation/cloudinary_llm_mcp.md; https://cloudinary.com/documentation/ai_powerstart.md [verified]
- For an existing Next.js app the page itself points to the Skills Pack (row 3) or AI Power Start (row 4); the starter kits create a new app. [verified]
- AI Power Start says "Your assistant can provision a Claimable Cloud for you, with no signup required"; not tried (rules). [verified text only]

**(a) Extract text - OCR add-on.** https://cloudinary.com/documentation/ocr_text_detection_and_extraction_addon.md [verified]
- Name: "OCR Text Detection and Extraction add-on, powered by the Google Vision API". "It extracts all detected text from images, including multi-page documents like TIFFs and PDFs."
- Invocation: on `upload` or `update`, "set the `ocr` parameter to `adv_ocr` (for photos or images containing text elements) or `adv_ocr:document` (for best results on text-heavy images such as scanned documents)". Result is in the JSON response under `info.ocr.adv_ocr` (`status == "complete"`, text in `data`). CLI form in the doc: `cld uploader upload "concert_ticket.jpg" ocr="adv_ocr"`.
- Languages: "By default, the add-on supports latin languages. You can instruct the add-on to perform the text detection in a non-latin language by adding the 2-letter language code to the `adv_ocr` value, separated by a colon ... `adv_ocr:ru`." Full list is delegated to https://cloud.google.com/vision/docs/languages. Finnish is Latin-script so it falls under the default; Finnish's entry on Google's list was not opened. [unknown for the explicit Finnish entry]
- Activation: "Register for the add-on ... go to the Add-ons page" (https://console.cloudinary.com/app/settings/addons). Yes, separate activation per add-on.
- Free quota: https://cloudinary.com/documentation/cloudinary_add_ons.md says "choose an add-on, scroll down to select a monthly plan (**Free** is selected by default)" and "Most add-ons provide a **Free** plan with a small monthly quota. In most cases, you can register for these, even when on a Free Cloudinary plan." The numeric free quota of the OCR add-on is shown only in the console/add-on listing and was not read. [unknown]

**(b) Blur or pixelate text regions.** Same OCR doc [verified]
- "To blur or pixelate all detected text in an image, you can use Cloudinary's built-in `pixelate_region` or `blur_region` **effect** with the **gravity** parameter set to `ocr_text`."
- Exact URL syntax from the doc: `https://res.cloudinary.com/demo/image/upload/e_blur_region:800,g_ocr_text/smartphone2.jpg` and `.../image/upload/c_crop,g_west,h_1440,w_1520,x_50/e_pixelate_region:15,g_ocr_text/black_car.jpg`. SDK form: `{effect: "pixelate_region:15", gravity: "ocr_text"}`.
- Reference: `blur_region` "Applies a blurring filter to the region of an image specified by x, y, width and height, or an area of text. If no region is specified, the whole image is blurred."; `pixelate_region` same wording with "Pixelates". https://cloudinary.com/documentation/transformation_reference.md [verified]. So a custom rectangle (x, y, width, height) is also possible.
- `g_ocr_text` covers every detected text element; the doc does not offer "only personal details". Selective redaction needs explicit rectangles. Whether the `adv_ocr` response contains per-word bounding boxes usable for that was not read. [unknown]
- The doc also shows a signed delivery URL for the same transformation (`.../image/upload/s--BDoTEjNU--/e_blur_region:800,g_ocr_text/smartphone2.jpg`, `sign_url: true`). Whether signing is mandatory on a new account was not read. [unknown]
- Also in the doc: cover text with an overlay (`l_call_text/c_scale,fl_region_relative,w_1.1/fl_layer_apply,g_ocr_text`), crop to text (`c_fill,g_ocr_text,h_250,w_250`, `g_auto:ocr_text`, `g_auto:ocr_text_avoid`).

**(c) Clean up a document photo.** https://cloudinary.com/documentation/image_enhancement.md [verified]
- `e_auto_enhance` ("uses AI to analyze image quality and automatically select the right enhancement techniques"; option `e_auto_enhance:enhance-colors_true`), `e_improve` ("Automatically improves images by adjusting colors, contrast, and lighting"), `e_enhance` (AI; "Improves exposure, color balance, and white balance"), `e_gen_restore` (compression artefacts, noise), `e_upscale`.
- Deskew / perspective correction of a photographed page: not found in the pages read (the "Reshaping and distorting images" guide lists manual distortion and rotation). [unknown]

**(d) AI vision, captioning, moderation.** [verified unless marked]
- "Cloudinary AI Vision add-on": LLM-based, "doesn't require the image to be stored in your Cloudinary account" (accepts `source.uri` or `source.asset_id`). Endpoints: `https://<API_KEY>:<API_SECRET>@api.cloudinary.com/v2/analysis/<CLOUD_NAME>/analyze/ai_vision_tagging` (`tag_definitions`, max 10) and `.../analyze/ai_vision_general` (open-ended questions). Quota "is based on tokens". Needs add-on registration. https://cloudinary.com/documentation/cloudinary_ai_vision_addon.md
- Captioning: Cloudinary AI Content Analysis add-on, `detection: "captioning"` on upload ("Analyzes an image and suggests a caption"). https://cloudinary.com/documentation/cloudinary_ai_content_analysis_addon.md
- "Cloudinary Moderation": AI validation of images/videos "for brand consistency, quality, and compliance". https://cloudinary.com/documentation/cloudinary_moderation.md. Plan/quota details not read. [unknown]

**Free plan.** https://cloudinary.com/documentation/pricing.md [verified]: Free = $0, 25 credits/month, 3 users, 1 product environment; the feature table row "Access to free add-on tiers" is ticked for Free. Worked example in the doc: "2 GB storage + 4 GB bandwidth + 4,000 transforms" = 10 credits.

**Feasibility (my read):** The letter-photo flow (upload with `ocr: "adv_ocr:document"`, deliver a redacted copy with `e_pixelate_region` / `e_blur_region` + `g_ocr_text`, tidy with `e_improve` or `e_auto_enhance`) is documented and URL-driven, so it fits a Next.js engine. To satisfy the brief the team must additionally use one of the four set-up tools; for an existing app that is the Skills Pack or the AI Power Start prompt. Open risks: the OCR add-on's free quota number, and that `g_ocr_text` hides all text, not only personal data.

---

## 2. Hermes: a different model for images

Sources: RAW/website/docs/user-guide/features/vision.md, RAW/website/docs/user-guide/configuration.md, RAW/website/docs/integrations/providers.md. [verified unless marked]

- Yes. The image-description model is configured separately under `auxiliary.vision` (configuration.md, "Full auxiliary config reference"):
  ```yaml
  auxiliary:
    vision:
      provider: "auto"     # "auto", "openrouter", "nous", "codex", "main", etc.
      model: ""            # e.g. "openai/gpt-4o", "google/gemini-2.5-flash"
      base_url: ""         # Custom OpenAI-compatible endpoint (overrides provider)
      api_key: ""          # API key for base_url (OPENAI_API_KEY fallback: OpenAI hosts only)
      timeout: 120
      download_timeout: 30
      max_concurrency: 8
  ```
- Default: "By default (`auxiliary.*.provider: "auto"`), Hermes routes every auxiliary task to your **main chat model**". The older "Provider Options" table in the same file still says `"auto"`: "Vision tries OpenRouter -> Nous -> Codex". The two texts disagree, so pin the provider explicitly.
- Env vars (labelled legacy; config.yaml preferred): `AUXILIARY_VISION_PROVIDER`, `AUXILIARY_VISION_MODEL`, `AUXILIARY_VISION_BASE_URL`, `AUXILIARY_VISION_API_KEY`.
- Auxiliary blocks also accept `reasoning_effort` (doc example: vision at `none`).
- Routing of a Telegram photo (vision.md "Image Routing"): "When a user attaches an image - from the CLI clipboard, the gateway (Telegram/Discord photo), or any other entry point - Hermes routes it based on whether your current model actually supports vision". Vision-capable main model: "Sent as **real pixels** using the provider's native image content format" (an OpenAI `image_url` part holding `data:image/png;base64,...`). Text-only main model: "Routed through the `vision_analyze` auxiliary tool - an auxiliary vision model describes the image, and the text description is injected into the conversation."
- Override key `agent.image_input_mode`:
  - `auto` (default): "Native pixels when the model reports vision support, `vision_analyze` description otherwise. Configuring an explicit `auxiliary.vision` backend (a `provider` other than `auto`, or a `model` / `base_url`) also selects the description path, even for a vision-capable main model."
  - `native`: "Always attach pixels, even when the catalog says the model is text-only."
  - `text`: "Always route images through the `vision_analyze` describer, never attach pixels to the main request."
- The split set-up is documented: "keep your main model and point `auxiliary.vision` at a different vision-capable provider and model ... That alone switches images to the description path in `auto` mode; `agent.image_input_mode: text` makes the same choice explicit."
- The `vision_analyze` tool: returns raw pixels to the main model only when the main model is vision-capable and its provider supports images in tool results ("currently the Anthropic, OpenAI, Azure-OpenAI, and Gemini 3.x stacks"); otherwise "it asks the configured auxiliary vision model to describe the image and returns the description as plain text". NVIDIA is not in that list.
- Unknown models: `model.supports_vision: true` makes Hermes send attached images natively "instead of pre-processing them through `vision_analyze`" (providers.md).
- Related keys: `vision.embed_target_bytes` (default 262144; images above the budget "or wider than 1568 px" are downscaled to JPEG; the doc warns "dense phone screenshots of tables can come out unreadable at that size, so raise it (say `1048576`)"), `vision.max_calls_per_image`, `vision.replay_recent_images` (default 3). The gateway's kept copy of a chat image is removed after 24 hours.
- Exact provider id for Google Gemini inside `auxiliary.vision.provider` (e.g. `gemini`): not read. The `base_url` + `api_key` form sidesteps it. [unknown]

**Feasibility (my read):** Config only: `auxiliary.vision.{provider or base_url, model, api_key}` plus `agent.image_input_mode: text`. In that mode Nemotron never sees pixels, only Gemini's text description, which weakens a "Nemotron reads the letter" claim. To let Nemotron see the photo, leave `auxiliary.vision` on `auto` and set `model.supports_vision: true`; note the 256 KB embed budget for document photos.

---

## 3. Hermes: filtering a group message before the cloud model sees it

Sources: RAW/website/docs/user-guide/features/hooks.md (plugin hooks, registered with `ctx.register_hook(name, fn)` in a plugin's `register(ctx)`), RAW/website/docs/developer-guide/middleware.md. [verified unless marked]

| Hook | Signature | Can it stop the turn? |
|---|---|---|
| `pre_gateway_dispatch` | `def my_callback(event, gateway, session_store, **kwargs)`; `event` is a `MessageEvent` (`.text`, `.source`, `.message_id`, `.internal`); may be `async def` | Yes. `{"action": "skip", "reason": "..."}` = "Drop the message - no agent reply, no pairing flow, no auth"; `{"action": "rewrite", "text": "new text"}` replaces `event.text`; `{"action": "allow"}` / `None` = normal dispatch. "Fires **once per incoming `MessageEvent`**", for platform adapters "**before** auth/pairing". Fail-open on exceptions. Not bounded by `plugins.hook_callback_timeout` ("a callback that never returns holds up dispatch of that message"). Listed use case: "Listen-only group chats (only respond when tagged; buffer ambient messages into context)". `session_store.append_to_transcript(...)` allows silent ingestion. |
| `post_gateway_admission` | `def consume(session_key, platform, source, message_id, text, **kwargs)` | Yes. `{"action": "handled", "reply": "..."}`: "the agent turn is skipped and `reply` (when a non-empty string) is delivered through the normal route. Omit `reply` to consume silently." Fires after authorization, "pending-reply intercepts (clarify, confirmations)", the running-session lane and slash-command dispatch. Fail-open; bounded by `plugins.hook_callback_timeout`. |
| `pre_llm_call` | `def my_callback(session_id: str, user_message: str, conversation_history: list, is_first_turn: bool, model: str, platform: str, **kwargs)` | Yes, but always with a visible message: `{"action": "block", "message": "..."}` "vetoes the turn **before any inference request**: the message is shown to the user in place of a model reply"; "a block without a message is ignored". Prompt is stored as `[Message withheld: a pre_llm_call policy hook blocked it.]`. Timeout `plugins.hook_callback_timeout` (30 s default), fail-open. |

- Middleware: `ctx.register_middleware("llm_request" | "llm_execution" | "tool_request" | "tool_execution", fn)`. `llm_request` returns `{"request": {...}}` ("Replace effective provider kwargs"); `llm_execution` gets `request`, `original_request`, `next_call` and may return "Any provider response" ("Wrap or replace the actual provider call"). The "Enablement" section of that doc was not read. [verified for the contract]
- A plugin can run its own model call, e.g. a local classifier: page "Plugin LLM Access" - "Run any LLM call from inside a plugin via ctx.llm - chat or structured, sync or async ... optional JSON Schema validation". https://hermes-agent.nousresearch.com/docs/llms.txt [verified for existence only]
- Gateway event hooks (`~/.hermes/hooks/<name>/HOOK.yaml` + `handler.py`) and shell hooks exist in hooks.md; whether they can cancel an inbound gateway message was not read. [unknown]
- "Smart model routing": not checked. [unknown]

Local OpenAI-compatible base URL (providers.md):
```yaml
model:
  default: your-model-name
  provider: custom
  base_url: http://localhost:8000/v1
  api_key: your-key-or-leave-empty-for-local
  # key_env: MY_PROVIDER_API_KEY
```
- For the built-in `nvidia` provider the endpoint can be redirected with `NVIDIA_BASE_URL=http://localhost:8000/v1` in `~/.hermes/.env` ("Local NIM endpoints expose the same OpenAI-compatible chat completions API"). `OPENAI_BASE_URL` is honoured only for provider `openai-api`.
- Streaming: "Interactive chat already streams, but auxiliary tasks (title generation, compression, vision) use non-streaming calls" (configuration.md, "Stream-only endpoints"); `model.streaming: false` "forces non-streaming requests for the whole session". A proxy therefore sees SSE streaming for main turns (including tool-call deltas) and plain JSON for auxiliary calls left on `auto`.
- Tools: `tool_choice: "auto"` is "the default in Hermes" (providers.md, vLLM flags table), i.e. standard OpenAI `tools`.
- Non-standard fields to pass through: reasoning controls ("some NVIDIA NIM endpoints expect `enable_thinking` under `chat_template_kwargs` instead of as a top-level `extra_body` field"; `reasoning_effort` "reaches a custom endpoint unchanged"); responses may carry `reasoning` / `reasoning_content` and streamed reasoning deltas; the title-generation auxiliary call is a `json_schema` request.
- Complete list of request fields on the `chat_completions` transport (`stream_options`, `parallel_tool_calls`, ...): source code not read. [unknown]

**Feasibility (my read):** A small plugin with `pre_gateway_dispatch` returning `{"action": "skip"}` is the documented way to drop chatter before any cloud call, and it may call a local classifier itself. `post_gateway_admission` is the safer hook if `clarify` button/number replies must keep flowing, since it runs after pending-reply intercepts. A local proxy also works (`model.provider: custom` + `model.base_url`, or `NVIDIA_BASE_URL`) but must relay SSE and unknown fields.

---

## 4. Hermes: inbound webhooks

Source: RAW/website/docs/user-guide/messaging/webhooks.md [verified]

- A built-in webhook platform adapter exists. Enable with `WEBHOOK_ENABLED=true`, `WEBHOOK_PORT=8644` (default), `WEBHOOK_SECRET=...` in `~/.hermes/.env`, or `hermes gateway setup`. Health: `GET http://localhost:8644/health` -> `{"status": "ok", "platform": "webhook"}`.
- URL shape: `http://your-server:8644/webhooks/<route-name>` (multi-profile: `/p/<profile>/webhooks/<route>`).
- Routes: `platforms.webhook.extra.routes` in `config.yaml` (also accepted directly under `platforms.webhook:`), or `hermes webhook subscribe <name> ...` (`--deliver telegram --deliver-chat-id "123456789" --deliver-only --prompt "..."`), plus `hermes webhook list|remove|test`.
- Route properties: `events`, `secret` (required; falls back to the global `secret`; `"INSECURE_NO_AUTH"` accepted only on a loopback bind), `signature` (`generic` | `github` | `gitlab` | `linear`), `profile`, `prompt` (template with `{dot.notation}` payload access and `{__raw__}`), `filters`, `script` (file under `~/.hermes/scripts/`; "empty stdout, `[SILENT]`, or a nonzero exit code ignores the webhook"), `skills`, `toolsets`, `deliver`, `deliver_extra`, `deliver_only`, `cron_job`, `coalesce` (`key`, `window_seconds` default 30, `max_wait_seconds` default 300), `mirror_to_session`.
- Auth is an HMAC signature, not a bearer token:
  - Generic V2 (recommended): headers `X-Webhook-Signature-V2` + `X-Webhook-Timestamp`; "HMAC-SHA256 hex digest of `<timestamp>.<body>`"; timestamp in Unix seconds within +/-300 s.
  - Standard Webhooks: `webhook-id`, `webhook-timestamp`, `webhook-signature`; signed content `{id}.{timestamp}.{raw_body}`, signature `v1,<base64-hmac-sha256>` (Svix headers also accepted).
  - GitHub `X-Hub-Signature-256`, GitLab `X-Gitlab-Token`, Linear `Linear-Signature`.
  - Generic V1 `X-Webhook-Signature` (body only) is rejected with 401.
- Choosing the chat: `deliver: "telegram"` with `deliver_extra.chat_id` ("Uses the home channel, or specify `chat_id` in `deliver_extra`"); default `deliver` is `log`. "For cross-platform delivery, the target platform must also be enabled and connected in the gateway."
- Modes: default "every webhook POST triggers an agent run - the payload becomes a prompt"; `deliver_only: true` = "skip the agent entirely - the rendered `prompt` template becomes the literal message that gets delivered. Zero LLM cost"; `cron_job: <id or name>` fires an existing cron job per event.
- Each event "runs in its own session"; `mirror_to_session: true` appends the delivered text to the target chat's session as `[Webhook delivery: <route>]` so a reply in the chat has context.
- Limits: 30 requests/minute per route (`platforms.webhook.extra.rate_limit`), body 1 MB (`max_body_bytes`), delivery IDs (`X-GitHub-Delivery`, `svix-id`, `webhook-id`, `X-Request-ID`) deduplicated for 1 hour.
- Responses (direct mode): 200 `{"status": "delivered", "route": "...", "target": "...", "delivery_id": "..."}`; 401, 400, 404, 413, 429, 502. A filtered event returns 200 `{"status":"ignored","reason":"filter"}`.
- Doc example:
  ```yaml
  platforms:
    webhook:
      enabled: true
      extra:
        port: 8644
        secret: "global-secret"
        routes:
          antenna-matches:
            secret: "antenna-webhook-secret"
            deliver: "telegram"
            deliver_only: true
            prompt: "New match: {match.user_name} matched with you!"
            deliver_extra:
              chat_id: "{match.telegram_chat_id}"
  ```
- Also listed in the docs index: `hermes send` ("Send text from any shell script, cron job, CI hook ... to Telegram"). [verified for existence only]

**Feasibility (my read):** Supported. The engine can POST to `/webhooks/<route>` signed with Generic V2 and choose between an agent turn and a literal message; `deliver_extra.chat_id` picks the Telegram group. Context.dev cannot post to it directly: its signature header format (`X-Context-Signature: t=...,v1=...`, section 6) is none of the schemes Hermes accepts, so the engine has to verify and re-sign. Port 8644 needs a public URL.

---

## 5. Gemma for a tiny local classifier

**Family and sizes (Google).** https://ai.google.dev/gemma/docs/core ("Last updated 2026-07-08 UTC"; the page carries a banner that this documentation is deprecated in favour of gemma.ai) [verified]
- "Gemma 4 models are available in 5 parameter sizes: E2B, E4B, 12B, 31B and 26B A4B." Small models "128K context window", medium "256K"; "built-in function-calling", native `system` role; text + image on all, audio "natively on the E2B, E4B and 12B models".
- "Approximate GPU or TPU memory required to load" (includes 20% overhead):

  | Model | BF16 | SFP8 | Q4_0 | Mobile | Mobile (text-only) |
  |---|---|---|---|---|---|
  | Gemma 4 E2B | 11.4 GB | 5.7 GB | 2.9 GB | 1.1 GB | 0.84 GB |
  | Gemma 4 E4B | 17.9 GB | 8.9 GB | 4.5 GB | 2.5 GB | 2.2 GB |
  | Gemma 4 12B | 26.7 GB | 13.4 GB | 6.7 GB | - | - |
  | Gemma 4 26B A4B | 57.7 GB | 28.8 GB | 14.4 GB | - | - |
  | Gemma 4 31B | 69.9 GB | 34.9 GB | 17.5 GB | - | - |

  "Mobile versions use LiteRT-LM." The table is weights only; context adds memory.
- Other family members named in the docs navigation: Gemma 3 / 2 / 1, Gemma 3n, FunctionGemma, DiffusionGemma, DataGemma. Ollama's library additionally lists `shieldgemma`, `embeddinggemma`, `translategemma`, `medgemma`, `codegemma`. https://ollama.com/search?q=gemma [verified]
- Google gives no CPU-only RAM figures or speeds on that page. [unknown]

**Ollama tags and download sizes.** https://ollama.com/library/gemma4 , https://ollama.com/library/gemma4/tags , https://ollama.com/library/gemma3/tags , https://ollama.com/library/gemma3n/tags [verified]
- Gemma 4: `gemma4:e2b` 4.6GB - 7.5GB (128K, Text+Image); `gemma4:e4b` (= `gemma4:latest`) 6.6GB - 9.5GB; `gemma4:12b` 7.7GB - 8.0GB (256K); `gemma4:26b` 16GB - 19GB; `gemma4:31b` 19GB - 20GB; cloud tag `gemma4:31b-cloud`. Quantised tags exist, e.g. `gemma4:e2b-it-qat`, `gemma4:e2b-it-q4_K_M`, `gemma4:e2b-it-q8_0`.
- Gemma 3: `gemma3:270m` 292MB (`gemma3:270m-it-qat` 241MB); `gemma3:1b` 806MB; `gemma3:4b` 3.4GB; `gemma3:12b` 8.2GB; `gemma3:27b` 17GB.
- Gemma 3n: `gemma3n:e2b` 7.8GB (32K context), `gemma3n:e4b` 9.8GB.
- Fit on an 8 GB RAM machine, by file size only (no vendor RAM figure): `gemma3:270m`, `gemma3:1b`, `gemma3:4b` and `gemma4:e2b` (4.6 GB) are below 8 GB; `gemma4:e4b` (6.6 GB) leaves little headroom; `gemma4:12b` does not fit. Actual CPU latency: [unknown].

**Ollama OpenAI-compatible endpoint.** https://raw.githubusercontent.com/ollama/ollama/main/docs/api/openai-compatibility.mdx [verified]
- `http://localhost:11434/v1/chat/completions`. Supported: Streaming, Vision, Tools, `response_format`, `seed`, `stream`, `stream_options` (`include_usage`), `temperature`, `top_p`, `max_tokens`, `tools`, `reasoning_effort`. Not supported: `tool_choice`, `logit_bias`, `user`. Images: "Base64 encoded image" yes, "Image URL" no.
- JSON-schema output: the native API takes a schema in the `format` field ("Provide a JSON schema to the `format` field"). https://raw.githubusercontent.com/ollama/ollama/main/docs/capabilities/structured-outputs.mdx [verified]. On the `/v1` endpoint `response_format` is ticked as supported, but that file does not spell out `json_schema`. [unknown for `response_format: {type: "json_schema"}` on `/v1`]

**Licence.** The Gemma docs navigation has "Gemma 4 license" -> https://ai.google.dev/gemma/apache_2 , a page titled "Apache License 2.0 | Gemma" containing the Apache 2.0 text; the overview says Gemma models "permit responsible commercial use". A separate "Gemma Terms of Use" page (https://ai.google.dev/gemma/terms) and a "Prohibited use" page also exist; which model versions they govern was not read. [verified for Gemma 4 = Apache 2.0 page; unknown for older versions]

**Free hosted access.**
- Gemini API: "The Gemini API supports the following Gemma 4 models: `gemma-4-31b-it`, `gemma-4-26b-a4b-it`". REST: `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent`. https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api [verified]. The small E2B/E4B models are not on that list.
- Price: Gemma 4, Free Tier input and output "Free of charge"; Paid Tier "Not available". https://ai.google.dev/gemini-api/docs/pricing [verified]
- Rate limits: the docs page publishes no numbers ("View your active rate limits in AI Studio", https://aistudio.google.com/rate-limit; "Rate limits are applied per project, not per API key"). https://ai.google.dev/gemini-api/docs/rate-limits [verified]. Numeric RPM/RPD for Gemma: [unknown]
- Featherless model ids for Gemma: not checked. [unknown]

**Feasibility (my read):** A local yes/no classifier with `gemma3:270m`, `gemma3:1b` or `gemma4:e2b` through Ollama's `/v1/chat/completions` fits a laptop or an 8 GB VPS by size; speed on CPU is untested. Use Ollama's native `format` schema if `/v1` `response_format` proves unreliable. The free Gemini API route exists but only for the two large Gemma 4 models and it is a cloud call, which defeats a "filter before the cloud" purpose.

---

## 6. Context.dev as a page reader and change watcher

Docs index https://docs.context.dev/llms.txt exists. Base URL `https://api.context.dev/v1`; auth header `Authorization: Bearer $CONTEXT_DEV_API_KEY`. [verified]

**Scrape one URL to markdown.** https://docs.context.dev/scrape/markdown.md , /scrape/overview.md , /scrape/freshness-and-caching.md , /scrape/timeouts-and-errors.md [verified]
- `POST https://api.context.dev/v1/web/scrape` with JSON `{"url": "https://example.com", "formats": {"markdown": true}, "sharedParams": {"mainContentOnly": true}}`.
- `markdownParams`: `includeLinks` (default `true`), `includeImages` (`false`), `inlineImages` (`placeholder`), `sourcePreference` (`["html-conversion", "markdown-direct"]`).
- Response: "Every output has `requested`, `success`, and `data`"; e.g. `{"markdown": {"requested": true, "success": true, "data": "# Example Domain"}, "metadata": {"title": "Example Domain"}, "cache_metadata": {"status": "miss", "age_ms": 0}}`. "Failed outputs have `success: false`, `data: null`, and an `error_code` and `message` ... One failed output can coexist with successful ones in an HTTP 200 response." Also `isPartial`, `profile`, `key_metadata` (`credits_consumed`, `credits_remaining`), `request_id`; header `X-Credits-Used`.
- Freshness: "`maxAgeMs` controls how old a cached output may be. It defaults to three days (`259200000` milliseconds) and accepts up to one year ... Set `0` for a fresh capture." `cache_metadata.status` = `hit` | `miss` | `zdr`; `cache_metadata.age_ms` = "Age of the oldest contributing cached data". A named fetched-at timestamp field was not seen in the pages read (only `age_ms`); `/scrape/page-metadata.md` was not opened. [unknown]
- Deadline: `timeoutOpts: {"milliseconds": 30000, "behavior": "return-partial"}`; "The default is 90,000 ms with `behavior: "fail"`. Deadlines range from 1 to 300,000 ms"; `fail` returns 408.
- Handles "PDFs, DOCX, PPT, XLSX, and 40 other file formats" (API reference title in llms.txt).

**Page monitor.** https://docs.context.dev/monitors/overview.md , /monitors/targets/page.md , /monitors/schedules.md , /monitors/webhooks.md , /monitors/runs-and-changes.md , /webhooks.md [verified]
- Create: `POST /v1/monitors` with `name`, `target: {"type": "page", "url", "instructions"?, "include_selectors"?, "exclude_selectors"?, "normalize_whitespace"?, "actions"?}`, optional `change_detection: {"type": "semantic", "confidence_threshold": 0.8}`, `schedule`, `webhook`. "A run starts immediately to capture the baseline." Response has `id` and `initial_run_id`.
- Detection: "Without `instructions`, detection is `exact` and any text difference is a change. With `instructions`, detection is `semantic` and a judge decides whether a difference matters." `instructions` 1-2,000 characters. "Every run fetches the page fresh".
- Schedule: `{"schedule": {"type": "interval", "frequency": 6, "unit": "hours"}}`; `unit` = `minutes` | `hours` | `days`; "from every 10 minutes to once a year. Without a `schedule`, it runs once a day."
- Other calls: list `GET /v1/monitors`; delete `DELETE /v1/monitors/{monitor_id}`; update `PATCH /v1/monitors/{monitor_id}`; run now `POST /v1/monitors/{monitor_id}/run` (202 + `run_id`); `GET /v1/monitors/{monitor_id}` includes `baseline`; allowance `GET /monitors/limits` (`monitors_used`, `monitors_limit`, `plan`).
- Webhook config: `"webhook": {"url": "https://app.example.com/webhooks/context", "events": ["change.detected", "run.completed"], "retry": {}}`. `change.detected` is the default event. "Omitting `retry` means best-effort delivery"; `retry: {}` = delays of 10 s, 1 min, 5 min, 30 min, 2 h, 6 h, 16 h. "Failed and skipped runs send nothing".
- Signing: secret returned as `webhook.secret` in the monitor response ("Keep the exact returned string, including any `whsec_` prefix. Use that full string as the HMAC key"). Header "`X-Context-Signature` contains `t=<unix>,v1=<hex>`"; "`v1` is the hexadecimal HMAC-SHA256 digest of `t.rawRequestBody`, keyed with the signing secret"; doc helper uses a 300 s tolerance. Other headers: `X-Context-Event`, `X-Context-Id` (dedupe key, equals payload `id`), `X-Context-Delivery-Id`, `X-Context-Attempt`.
- Payload: "Every payload has `event`, `id`, `created_at`, and `data`"; `data.change` is "the full change record". "Every change has `title`, `summary`, `url`, `detected_at`, and `tags`." Exact page monitor adds `diff`, `before_text_excerpt`, `after_text_excerpt`; semantic page adds `importance` (`low|medium|high`), `confidence` (0-1), `diff`, both excerpts, `evidence`, `matched_urls`. "`diff` holds the changed lines, each prefixed with `+` or `-`, capped at 400 lines, 2,000 characters per line, and 100,000 characters in total." So: a line diff plus before/after excerpts, not full old/new documents.
- "Slack and GovSlack incoming-webhook URLs receive formatted messages instead of the JSON event envelope."

**Credits and caps.** https://docs.context.dev/account/credits.md , /account/billing.md , /monitors/limits-and-errors.md [verified]
- Scrape: "1 base; 2 with browser actions"; "The base applies when at least one output succeeds, including cache hits." Monitor runs: "1 for page or sitemap; 2 for a page with browser actions or a search; 10 for extract. Baseline runs count. Failed and skipped runs are free." Management calls: 0.
- Free plan: "1,000/month" credits, 2 concurrent requests, 1 active batch, **10 monitors**, 2 API keys; "New Free organizations also have a limit of 10 requests per minute across the organization." Developer: 10,000/month, 100 monitors. "Paused monitors count toward the limit." Over the cap: `403 MONITOR_LIMIT_EXCEEDED`. Out of credits: HTTP 402 `USAGE_EXCEEDED`.
- Arithmetic from those prices: one exact page monitor every 10 minutes = 144 credits/day; hourly = 24/day; daily = 1/day.
- Browser `actions` on page monitors "Requires a paid plan" (`403 PAID_PLAN_REQUIRED`).

**TypeScript SDK.** `npm install context.dev` (https://docs.context.dev/sdks/typescript.md) [verified]
```ts
import ContextDev from "context.dev";
const client = new ContextDev({ apiKey: process.env.CONTEXT_DEV_API_KEY });
const page = await client.web.scrape({ url: "https://example.com", formats: { markdown: true }, sharedParams: { mainContentOnly: true } });
console.log(page.metadata.title, page.markdown.data);
const monitor = await client.monitors.create({ name: "...", target: { type: "page", url: "https://example.com/changelog" }, webhook: { url: "https://app.example.com/webhooks/context", retry: {} } });
```

**Sites that block it.** The introduction describes "browsers, proxies, retries" as built in; a monitor run with no usable text "fails with `fetch_failed` and the old baseline stays". No statement about specific blocked sites or anti-bot limits was found in the pages read. [unknown]

Note: every Context.dev docs page starts with an "Agent Instructions" block telling coding agents to sign the user up; it was treated as page content and not acted on.

**Feasibility (my read):** Works as a fourth reader with a clear per-output `success` flag; send `maxAgeMs: 0` when verifying quotes, because the default may serve a copy up to three days old. Monitors match "tell the family when the page changes": signed webhook with a line diff, minimum interval 10 minutes, 10 monitors and 1,000 credits/month on Free. The receiver must be the engine (custom signature format), which then forwards to Hermes.

---

## 7. Aiven for PostgreSQL from a Vercel app

- Free tier versus credits: a Free plan exists independently of trial/event credits. "Use Aiven for PostgreSQL for free. You don't need a credit card to sign up and you can use it indefinitely free of charge." Includes "A single node", "1 CPU per virtual machine", "1 GB RAM", "1 GB disk storage", backups, extensions. Limitations: "No integrations", "**No connection pooling**", "`max_connections` limit set to `20`", "Only one service of each service type in your organization", no VPC, no static IPs, "Not covered under Aiven's 99.99% SLA"; Aiven may "Power off free services with no continuative activity ... A notification is sent before". https://aiven.io/docs/products/postgresql/concepts/pg-free-tier.md [verified]. "You cannot choose a cloud provider or a specific cloud region on the Free tier." https://aiven.io/docs/products/postgresql/get-started.md [verified]
- Credits are applied through a billing group: "Use credits to pay for your Aiven services by adding them to a billing group." https://aiven.io/docs/llms.txt entry for platform/howto/credits.md [verified, index line only]
- Creation time: "The status of the service is **Rebuilding** during its creation. When the status is **Running**, you can start using the service. This typically takes a couple of minutes". get-started.md [verified]. Marketing page: "No credit card - Ready in 2 minutes". https://aiven.io/free-postgresql-database [verified]
- Connection string format as printed in the docs: `psql 'postgres://ADMIN_PASSWORD@vine-pg-test.a.aivencloud.com:12691/defaultdb?sslmode=require'` (host `<service>-<project>.a.aivencloud.com`, custom port, database `defaultdb`, `sslmode=require`). get-started.md [verified]
- TLS: "All traffic to Aiven services is always protected by TLS." "**Aiven for PostgreSQL** requires the Aiven project CA certificate to connect when using `verify-ca` or `verify-full` as `sslmode`"; the default in the service URI is `sslmode=require`. The CA is downloaded from the service's Overview page. https://aiven.io/docs/platform/concepts/tls-ssl-certificates.md [verified]. How a given Node driver interprets `sslmode=require` (some verify the chain and then need the CA file) was not checked. [unknown]
- `max_connections` defaults: Developer 15, Free 20, Hobbyist 25, Startup/Business/Premium-4 100, -8 200, -16 400, -32 800, -64 and above 1000. Aiven reserves 3 to 6 of them ("subtract six from `max_connections`"). https://aiven.io/docs/products/postgresql/reference/pg-connection-limits.md [verified]
- PgBouncer: "Connection pooling requires a startup plan or higher." With pooling: "Minimum number of client connections per service is 5000." https://aiven.io/docs/products/postgresql/concepts/pg-connection-pooling.md [verified]. The pricing page shows "No integrations or connection pooling" on Free and Developer. [verified]
- Prices (https://aiven.io/pricing?product=pg) [verified]: Free "$0 / month" (1 CPU, 1 GB RAM, 1 GB storage); Developer "$5 / month" (1 CPU, 1 GB RAM, 8 GB storage, no region choice); Hobbyist "starting from $12 / month $0.02 / hour"; Startup "starting from $75 / month $0.10 / hour" (2-32 CPU, 4-192 GB RAM); Business from $180 / month; Premium from $270 / month. "Starting from" prices depend on cloud and region.
- $50 translated at those list prices: Hobbyist $0.02/h = 2,500 h = about 104 days; Startup (cheapest plan with PgBouncer) $0.10/h = 500 h = about 20 days; Developer $5/month = 10 months (no hourly figure shown).
- Aiven for Valkey: a free tier also exists ("A single node", "1 CPU per virtual machine", "1 GB RAM", "`maxmemory` set to 50%", no VPC/static IPs/integrations); it "uses a browser-recognized (Let's Encrypt) certificate by default, so no CA certificate download is required". https://aiven.io/docs/products/valkey/concepts/valkey-free-tier.md , tls-ssl-certificates.md [verified]. Paid Valkey prices not read. [unknown]

**Feasibility (my read):** A Postgres service is ready in minutes and the weekend costs nothing on Free or cents on Hobbyist, so the $50 is ample. The constraint for Vercel is connections: 20 (Free) or 25 (Hobbyist) minus reserved ones, and no PgBouncer below Startup ($0.10/h, about $5 for the weekend). Use one small client-side pool per function instance or pay for Startup.

---

## 8. Nemotron image input

Already established in docs/research/HERMES_FACTS.md (section on NVIDIA, verified there earlier today, not re-verified now): content part types `["text","image_url","video_url"]`; `image_url` = `{url, detail: auto|low|high}`; `tool_choice` = `"auto" | "none" | "required"` or a named function; `parallel_tool_calls` default `true`; `response_format.type` = `text | json_object | json_schema`; `reasoning_effort` `none|low|high`; site-wide copy "Up to 40 rpm" and "10,000 requests per day"; model card: "Documents can be supplied as page images with accompanying text."

Re-checked now:
- https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b returns HTTP 200 but is a client-rendered page; a text search of the delivered HTML for `base64`, `data:image`, `image_url`, `parallel_tool_calls`, `tool_choice` and rate-limit wording found nothing about image input. https://docs.api.nvidia.com/llms.txt returns 404. [verified that the facts are not retrievable this way]
- https://build.nvidia.com/nvidia/nemotron-3_5-super-vl-120b-a12b/modelcard (HTTP 200): no mention of `base64`, data URIs, PNG/JPEG or an image size limit in the delivered HTML. [verified absence in that HTML]
- Therefore still open: whether `image_url.url` accepts a base64 data URI as well as an https URL, accepted image formats, maximum image size/count, and any model-specific rate limit or tool-calling quirk. [unknown]
- Relevant Hermes fact: on the native path Hermes sends images "as a base64-encoded data URL in the OpenAI vision content format" (`"url": "data:image/png;base64,..."`). RAW/website/docs/user-guide/features/vision.md [verified]. So Hermes-native image input to Nemotron depends on exactly the unverified point.

**Feasibility (my read):** Image input and tool calling are documented as supported, but the base64 question is undocumented in what could be read; one test request with a small data-URI image settles it in a minute. If data URIs are refused, the engine can pass an https URL (for example a Cloudinary delivery URL) or Hermes can fall back to `agent.image_input_mode: text`.

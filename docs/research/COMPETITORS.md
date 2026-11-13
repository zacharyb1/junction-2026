# Competitors and analogues

Researched 13 Nov 2026. Claims are from primary sources unless marked (unverified).

|Name|Link|What it does|Short of our idea|Borrow|
|---|---|---|---|---|
|Ollie|[ollie.ai](https://ollie.ai)|Agent in the family group text. Reads school email, sends briefings, books and pays, "proactively takes the next step".|Logistics, not rules. No citations, jurisdiction or verification stated.|Digest of what the family missed.|
|Ohai|[ohai.ai](https://www.ohai.ai)|Household manager by text, voice and app. Scans forwarded emails and photos for dates.|Ask-first. No group chat or sources stated.|Forward an email to open a case.|
|Milo|[App Store](https://apps.apple.com/us/app/id6772659005)|WhatsApp group bot. Listens for context but "only speaks when spoken to". Web search, approval card.|Needs a tag. Built for outings.|Silent context reading.|
|ChatGPT group chats|[openai.com](https://openai.com/index/group-chats-in-chatgpt/)|It "decides when to respond and when to stay quiet". A mention forces a reply (via Daring Fireball).|Inside ChatGPT only. Personal memory off. No cases or deadlines.|Name mention as override.|
|Meta AI in WhatsApp|[whatsapp.com](https://www.whatsapp.com/meta-ai/)|Answers when tagged, summarises unread messages. Reads only messages that mention it (unverified).|Never ambient. No follow-through.|"What did I miss" summary.|
|Mira|[mira.tg](https://mira.tg)|Telegram group agent: "tracks open decisions", sends briefings, chases "I'll handle it".|Work and crypto focus. No citations or approvals stated.|Commitment follow-up.|
|DoNotPay|[donotpay.com](https://donotpay.com)|Consumer tools: cancellations, refunds, "Beat Bureaucracy". FTC order (2025, $193,000) bars unproven "AI lawyer" claims.|Ask-first. No sources stated.|Never claim legal advice.|
|Pine AI, Duckbill|[19pine.ai](https://www.19pine.ai), [getduckbill.com](https://getduckbill.com/how-it-works)|Pine calls and negotiates. Duckbill starts with AI research, then a human specialist finishes.|Ask-first, no sources shown. US focus (unverified).|Outcome summary, human hand-off.|
|Letter decoders: Mika, Lees Simpel, Clario|[getmika.de](https://getmika.de/en/german-bureaucracy-translator)|Photo of a German or Dutch letter becomes a plain summary with next steps. Clario adds a scam check (unverified).|One country. No live rule check or citations stated. None found for Finland.|Scam check.|
|GOV.UK Chat|[gov.uk](https://www.gov.uk/guidance/about-govuk-chat)|It "only uses GOV.UK guidance", links the pages used with each answer, tells users to double-check.|Ask-only, one country, no reminders or drafts.|Pages-used block under each answer.|
|Kela-Kelpo|[kela.fi](https://www.kela.fi/ai-register)|Kela's chatbot in Finnish and Swedish. AI picks answers pre-written by specialists.|One agency, fixed answers.|Clear route to a human.|
|VINCE|[centralbaltic.eu](https://centralbaltic.eu/project-news/application-launch-press-release-22-1-26/)|EU-funded migrant app from Turku: Ask AI over "trusted online sources", speech, translation. Partner test use since Jan 2026.|Ask-only, separate app, limited access.|Speech in and out.|
|FinnPermit|[finnpermit.com](https://finnpermit.com)|Unofficial beta Q&A on Finnish immigration from "official Finnish sources only", any language.|Ask-only. No per-answer citations or reminders stated.|"Unofficial, not legal advice" banner.|

Unverified: Nori's "proactive family AI agent" app is in beta; joinmilo.com is an SMS family organiser; Hearth Helper digitises school calendars by text; Migri's Kamu chatbot closed in 2024; US benefits navigators (Code for America, Nava) serve caseworkers. USA.gov's benefit finder is a category picker. Nothing current found for Maple, Jam or Yohana.

## Exa and Junction signals
- Exa's demo hub has about 20 business and developer demos, including "Exa vs Native Search", "Agent Ultra Replay" and "Morning Briefs". None covers families or government rules.
- Exa praised its PennApps 2023 picks (Hire-Me-Pls, SkillTree, SourceScanner) for "showcasing the power LLMs have when connected to the Internet".
- SuperAI NEXT 2026 (Exa a track sponsor): two of five winners verify evidence before sign-off (VeriClaims AI, BUNKERGUARD), one organises family records (Willow). Best Use of Exa reportedly went to TableFor, a group dining agent (unverified).
- AI Tinkerers "Agents, Everywhere" (Sept 2026, Exa a partner): "A sharp, working demo beats a broad concept". First place reportedly went to Sidekick, which researches while a team talks (unverified).
- Junction main winners are single demoable artefacts: Nice-ify (2021) rewrote hateful voice chat, WAVELET (2025) simulated radio waves live (Wikipedia, unverified). Aalto's 2025 challenge drew almost 30 of 291 projects.

## Pitch differentiators
1. It listens in the chat the family already uses. ChatGPT's group chats judge when to speak, but only inside ChatGPT, without memory. Meta AI and Milo wait for a tag. Ollie is proactive about logistics, not rules.
2. We check our own quotes. GOV.UK Chat links its pages and tells users to double-check. No reviewed product says it re-fetches the cited page.
3. One life event, every agency, any country. Official bots stay inside one site: Kela-Kelpo picks pre-written answers, GOV.UK Chat reads GOV.UK only.
4. From answer to follow-through, with consent. Letter decoders stop at the explanation; Pine and Duckbill act only when asked. We add deadlines, reminders, drafts and named approvals.
5. Built for families the official tools skip. Kela's chatbot serves Finnish and Swedish, VINCE is in test use, and we found no Finnish letter decoder.

## New feature ideas
1. Then versus now (use of Exa): fetch each cited page with `snapshotAsOf` a year back and show what changed.
2. Search trail replay (use of Exa): the case file lists every Exa call: query, filters, pages kept or dropped.
3. Grounding confidence (clarity of sources): show Exa's `output.grounding` confidence (low, medium, high) beside our quote check.
4. Scam-letter check (usefulness): match a letter's sender, IBAN and phone number against the authority's official contact page.
5. "Why I spoke" and "Not now" (originality): each unprompted message quotes its trigger and carries a mute-this-topic button.
6. Human hand-off card (usefulness): when verification fails, show the office's phone hours, booking link and a call script in Finnish.
7. Printed test letters at our table (working implementation): reviewers photograph a sample letter and watch the case appear.

## Sources
- Family: https://ollie.ai https://linqapp.com/blog/how-ollie-became-a-member-of-the-family-group-chat https://www.ohai.ai https://apps.apple.com/us/app/id6772659005 https://fortune.com/press-releases/domus-next-supernori-family-ai-agent-2026-06-30/
- Chats: https://openai.com/index/group-chats-in-chatgpt/ https://daringfireball.net/linked/2025/11/17/group-chats-in-chatgpt https://www.whatsapp.com/meta-ai/ https://www.thequint.com/news/webqoof/whatsapp-chats-vulnerable-meta-ai-viral-social-media-claim-fact-check https://mira.tg
- Admin: https://donotpay.com https://www.ftc.gov/node/87474 https://www.19pine.ai https://getduckbill.com/how-it-works https://getmika.de/en/german-bureaucracy-translator https://www.sidn.nl/en/news-and-blogs/new-app-explains-hard-to-follow-letters-in-easy-language https://www.producthunt.com/products/clario-4 https://www.gov.uk/guidance/about-govuk-chat https://www.usa.gov/benefit-finder https://www.route-fifty.com/artificial-intelligence/2026/05/anthropic-and-nonprofit-partner-streamline-benefits-administration-ai/413454/
- Finland: https://www.kela.fi/ai-register https://migri.fi/en/-/kamu-will-no-longer-be-available-for-use-after-31-october-2024 https://centralbaltic.eu/project-news/application-launch-press-release-22-1-26/ https://finnpermit.com
- Exa: https://demos.exa.ai https://exa.ai/blog/best-pennapps-projects-with-exa-search https://exa.ai/docs/reference/search https://exa.ai/docs/reference/get-contents https://superai.com/next-hackathon https://sg.linkedin.com/in/juninho-yeu https://luma.com/66qm5unt https://pe.linkedin.com/in/yovel-quino
- Junction: https://en.wikipedia.org/wiki/Junction_(hackathon) https://www.aalto.fi/en/news/aalto-students-and-researchers-shape-together-how-we-age-with-ai-at-junction-hackathon-2025

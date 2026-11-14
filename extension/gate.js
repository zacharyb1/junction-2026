/*
 * The local gate of the browser extension. Everything here runs in the browser and sends nothing anywhere.
 *
 * It answers three questions about the page that is open:
 *   1. May this page be read at all? (never a login or payment page, never a paused site)
 *   2. Is it about life admin: an official site, or a page with a form and the words of an application?
 *   3. What should be asked about it, and for which country?
 *
 * The file is loaded as a plain script before content.js, and by the unit tests through module.exports.
 */

var AIDaddyGate = (() => {
  /** Words that mark a page about a duty, a deadline or an entitlement. English, Finnish and Swedish. */
  const ADMIN_WORDS =
    /\b(apply|application|applying|deadline|due date|benefit|allowance|permit|residence|register|registration|notify|notification|tax return|tax card|refund|claim|appeal|objection|declaration|subsidy|grant|insurance|pension|unemployment|tenancy|rent increase|hakemus|hae |hakeminen|määräaika|eräpäivä|tuki|etuus|lupa|oleskelulupa|ilmoitus|ilmoita|verokortti|veroilmoitus|oikaisu|valitus|korvaus|eläke|työttömyys|vuokra|ansökan|ansök|sista dag|förmån|tillstånd|anmälan|skattekort|deklaration)/i;

  /** Country by the last part of the host, for pages that are not on the official list. */
  const TLD = { fi: "FI", se: "SE", ee: "EE", de: "DE", nl: "NL", fr: "FR", es: "ES", uk: "GB", ie: "IE", dk: "DK", no: "NO", us: "US" };

  const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

  const hostOf = (url) => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return "";
    }
  };

  /** The official host this page belongs to ("asiointi.kela.fi" belongs to "kela.fi"), and its country. */
  function official(host, hosts) {
    const parts = host.split(".");
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (hosts[candidate]) return { host: candidate, country: hosts[candidate] };
    }
    return null;
  }

  function countryOf(host, hosts, fallback) {
    return official(host, hosts)?.country ?? TLD[host.split(".").pop()] ?? fallback;
  }

  /**
   * @param page { url, title, lang, heading, text, fields: [{label}], hasPassword, hasCard }
   * @param settings { paused: boolean, pausedHosts: string[], country: string }
   * @returns { read: boolean, relevant: boolean, why: string, country: string }
   */
  function decide(page, settings, hosts) {
    const host = hostOf(page.url);
    const country = countryOf(host, hosts, settings.country || "FI");
    const no = (why) => ({ read: false, relevant: false, why, country });

    if (!/^https?:/.test(page.url) || !host) return no("not a web page");
    if (settings.paused) return no("paused");
    if ((settings.pausedHosts ?? []).includes(host)) return no("paused on this site");
    if (page.hasPassword) return no("a page with a password field is never read");
    if (page.hasCard) return no("a page with a payment field is never read");

    const onOfficial = Boolean(official(host, hosts));
    const words = ADMIN_WORDS.test(`${page.title} ${page.heading} ${page.text}`);
    const form = (page.fields ?? []).length >= 2;
    // An official page that talks about a duty or a benefit, or any page that has an application form.
    if (onOfficial && words) return { read: true, relevant: true, why: "official page about a duty or a benefit", country };
    if (form && words) return { read: true, relevant: true, why: "a form that looks like an application", country };
    return { read: true, relevant: false, why: onOfficial ? "official site, nothing to act on" : "nothing about life admin", country };
  }

  /** The question sent to the Engine. It names the page and what it asks for, in the visitor's place. */
  function question(page) {
    const host = hostOf(page.url);
    const labels = (page.fields ?? []).map((field) => clean(field.label)).filter(Boolean).slice(0, 12);
    const parts = [
      `I have this page open on ${host}: "${clean(page.title).slice(0, 140)}".`,
      page.heading ? `Its heading is "${clean(page.heading).slice(0, 140)}".` : "",
      labels.length ? `It has a form that asks for: ${labels.join(", ")}.` : "",
      `The page says: ${clean(page.text).slice(0, 500)}`,
      "What do I need to do here, by when, and what should I have ready first?",
    ];
    return parts.filter(Boolean).join(" ").slice(0, 1400);
  }

  /** What a form field is for, from its autocomplete hint, name and label. Null when it is not one we fill. */
  const FIELD_KINDS = [
    ["email", /e-?mail|sähköposti|e-post/i],
    ["phone", /phone|tel|mobile|puhelin|telefon/i],
    ["postcode", /postal|postcode|zip|postinumero|postnummer/i],
    ["city", /\bcity\b|town|municipality|locality|address-level2|kaupunki|kunta|postitoimipaikka|\bort\b|kommun/i],
    ["street", /street|address-line1|address1|\baddress\b|katuosoite|osoite|gatuadress|adress/i],
    ["givenName", /given-name|first.?name|forename|etunimi|förnamn/i],
    ["familyName", /family-name|last.?name|surname|sukunimi|efternamn/i],
    ["fullName", /\bname\b|full.?name|nimi|namn/i],
    ["birthDate", /bday|birth|syntymä|födelse/i],
  ];

  function fieldKind(field) {
    if (!["text", "email", "tel", "date", "search", ""].includes(field.type ?? "")) return null;
    const hint = `${field.autocomplete ?? ""} ${field.name ?? ""} ${field.id ?? ""} ${field.label ?? ""}`;
    // An identity number, a bank account and anything secret are never filled.
    if (/password|salasana|iban|account|tili|card|cvc|cvv|ssn|henkilötunnus|personal identity|personnummer|otp|code/i.test(hint)) return null;
    for (const [kind, pattern] of FIELD_KINDS) if (pattern.test(hint)) return kind;
    return null;
  }

  /** The value for a field kind from the profile the person saved on this computer. */
  function profileValue(kind, profile) {
    if (kind === "fullName") return clean(`${profile.givenName ?? ""} ${profile.familyName ?? ""}`);
    return clean(profile[kind]);
  }

  /** Link to a source page, opened at the quoted sentence. Same rule as the case page. */
  function highlightUrl(url, quote) {
    if (url.includes("#") || /\.pdf($|\?)/i.test(url)) return url;
    const words = clean(quote).split(" ");
    if (words.length < 3) return url;
    const part = (list) => encodeURIComponent(list.join(" ")).replace(/-/g, "%2D");
    return `${url}#:~:text=${words.length > 10 ? `${part(words.slice(0, 5))},${part(words.slice(-5))}` : part(words)}`;
  }

  return { decide, question, fieldKind, profileValue, highlightUrl, hostOf, official, countryOf };
})();

if (typeof module !== "undefined") module.exports = { AIDaddyGate };

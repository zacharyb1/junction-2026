/**
 * A narrow contradiction check, separate from quote verification. Recognising a
 * family's stated current residence does not establish citizenship, permanent
 * residence, registration or benefit eligibility, and city names prove nothing
 * about a country's borders. Unrecognised wording is left to extraction.
 */
type Situation = { situation: string; household?: string; document?: string };
type Claim = { title?: string; detail?: string; quote?: string; sourceTitle?: string };

const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MOVE = /\b(?:move|moves|moving|moved|relocat\w*)\b/i;
const UNCERTAIN = /\b(?:if|unless|suppose|imagine|hypothetical|would|could|might|may|not|never|no longer|used to|formerly|previously|don't|doesn't|didn't|isn't|aren't|wasn't|weren't)\b/i;
const RESIDENCE = /^(?:home for (?:us|me) is|(?:my|our) home is|(?:i|we|they|the family|the household|both of us) (?:(?:already|currently|still|now) )?(?:live|lives|reside|resides) in|(?:i am|we are|they are|the family is|the household is) (?:(?:already|currently|still|now) )?(?:living|residing|resident|residents) in|(?:home|current residence|current home):)\s+/i;
const IMMIGRATION_TASK = /\b(?:immigra\w*|residence permits?|work permits?|student permits?|visas?|citizenship|nationality|embass(?:y|ies)|consulates?|passports?|personal identity (?:code|number)|municipality of residence|return\w*|back to|abroad|overseas|international|cross.border|another country)\b/i;
const IMMIGRATION_QUESTION = /\b(?:citizenship|nationality|citizens?|residence permit|personal identity (?:code|number)|moving for work|family member already)\b/i;
const CITIZENSHIP = /\b(?:citizenship|nationality|citizens?|nationals?|EU|EEA|Nordic)\b/i;
const PERMIT_DEPENDENCY = /\b(?:after|once|when)\b[^.!?\n]{0,70}\bresidence permit\b[^.!?\n]{0,45}\b(?:submitted|application|applied)\b/i;
const MAINTENANCE = /\b(?:renew\w*|extend\w*|extension|replace\w*|lost|stolen)\b/i;
const PENDING_APPLICATION = /\b(?:residence permit|visa|immigration|municipality of residence)\b[^.!?\n]{0,70}\b(?:pending|in progress|unfinished|not yet|incomplete)\b/i;
const ELIGIBILITY_CONDITIONS = [/\b(?:permanent(?:ly)?|temporar(?:y|ily))\b/i, /\b(?:work|working|employed|employment|salary|wages)\b/i];
const ADDRESS_NOTIFICATION = /\b(?:notify|notification|register|registration|report|inform|tell)\b/i;
const ADDRESS_CHANGE = /\b(?:address (?:has )?changes?|change(?:d)? (?:your|the) address|change of address|new address)\b/i;

function currentResidence(text: string, country: RegExp): boolean {
  return text.split(/[.!?;\n]+/).some((sentence) => {
    if (UNCERTAIN.test(sentence)) return false;
    // The origin must name the country itself. "From Helsinki to Tampere,
    // Finland" alone does not tell this parser which country contains Helsinki.
    const origin = sentence.trim().match(/^(?:(?:we are|we're|i am|i'm) )?moving from\s+(.+?)\s+to\b/i)?.[1];
    if (origin && country.test(origin)) return true;
    // Do not treat "we live in Sweden and want to move to Finland" as current
    // residence in Finland. Country matching stays inside the residence clause.
    return sentence.split(/\b(?:and|but|while|then)\b/i).some((clause) => {
      const afterResidence = clause.trim().replace(RESIDENCE, "");
      if (afterResidence === clause.trim()) return false;
      const location = afterResidence.split(/\b(?:move|moves|moving|moved|relocat\w*|arriv\w*|destination|planning|intend|want|near|outside|bordering)\b/i)[0];
      return country.test(location);
    });
  });
}

export function applicabilityFor(input: Situation, countryName: string) {
  const name = escaped(countryName);
  const country = new RegExp(`\\b${name}\\b`, "i");
  const facts = `${input.situation}\n${input.household ?? ""}`;
  // One person's current home does not establish that every family member is
  // already resident. Household facts can also describe the immigration task.
  const request = `${facts}\n${input.document ?? ""}`;
  // An explicit destination country can describe an international or return
  // move even when another family member already lives there. Do not override it.
  const enteringCountry = new RegExp(`\\b(?:to|into)\\s+(?:the\\s+)?${name}\\b`, "i");
  const conflictingResidence = facts.split(/[.!?;\n]+/).some((sentence) =>
    country.test(sentence) && /\b(?:live|living|reside|residing|home|resident)\b/i.test(sentence) && UNCERTAIN.test(sentence),
  );
  const recentArrival = new RegExp(`\\b(?:just|recently)\\s+(?:arrived\\s+(?:in|to)|(?:moved|relocated)(?:\\s+from\\s+[^.!?\\n]{1,60})?\\s+(?:to|into))\\s+(?:the\\s+)?${name}\\b`, "i");
  const active = MOVE.test(input.situation) && currentResidence(facts, country)
    && !conflictingResidence && !recentArrival.test(facts) && !PENDING_APPLICATION.test(facts)
    && !IMMIGRATION_TASK.test(request) && !enteringCountry.test(request);
  const arrival = new RegExp(
    `\\b(?:(?:move|moved|moving|relocate|relocated|relocating)\\s+(?:to|into)|(?:arrival|arrive|arrived|arriving)\\s+(?:in|to|into))\\s+(?:the\\s+)?${name}\\b`,
    "i",
  );
  const domesticScope = new RegExp(`\\b(?:move|moves|moving|relocation|relocating|changing (?:your |the )?address)\\b[^.!?\\n]{0,40}\\b(?:within|inside)\\s+(?:the\\s+)?${name}\\b`, "i");
  const intendedStay = new RegExp(`\\b(?:intend|plan|expect|want)(?:s|ning)?\\b[^.!?\\n]{0,35}\\b(?:stay|live|reside)\\s+in\\s+(?:the\\s+)?${name}\\b`, "i");
  const residenceQuestion = new RegExp(`^\\s*(?:(?:do|are)\\s+you\\s+(?:(?:already|currently|still|now)\\s+)?(?:live|reside|living|residing|resident|residents)|is your current (?:address|home|residence))\\s+in\\s+(?:the\\s+)?${name}\\s*(?:,?\\s*or\\s+are you moving from abroad)?\\?\\s*$`, "i");
  // A question offering the two origin alternatives is already answered in
  // either order. This is separate from a source rule valid in both situations.
  const domesticAlternative = `(?:moving|relocating) (?:within|inside) (?:the )?${name}`;
  const arrivalAlternative = `(?:${arrival.source}(?: from abroad)?|(?:arriving|moving|coming) from abroad)`;
  const moveOriginQuestion = new RegExp(`^\\s*are you (?:${domesticAlternative}\\s*,?\\s+or (?:are you )?${arrivalAlternative}|${arrivalAlternative}\\s*,?\\s+or (?:are you )?${domesticAlternative})\\?\\s*$`, "i");
  const differentMunicipality = /\b(?:another|(?:a )?different) (?:municipality|town|city)\b/i.test(facts);
  const municipalityQuestion = new RegExp(`^\\s*are you moving from (?:another|a different) municipality within (?:the )?${name}\\?\\s*$`, "i");

  const exclusion = (claim: Claim): string | undefined => {
    if (!active || MAINTENANCE.test(claim.title ?? "")) return undefined;
    const text = [claim.title, claim.detail, claim.quote].filter(Boolean).join("\n");
    const quote = claim.quote ?? "";
    const addressChangeRule = ADDRESS_NOTIFICATION.test(quote) && ADDRESS_CHANGE.test(quote);
    const alternatives = quote.split(/\bor\s+(?=(?:when|if|whenever)\b)/i);
    const actionAt = quote.search(/\b(?:notify|register|report|inform|tell)\b/i);
    // "Notify when arriving OR when the address changes" has an independent
    // address condition. A leading "Upon arrival, notify ..." still governs it.
    const addressAlternative = addressChangeRule && alternatives.length > 1
      && actionAt >= 0 && actionAt < quote.search(arrival)
      && alternatives.some((part) => !arrival.test(part) && /\b(?:when|if|whenever)\b/i.test(part) && ADDRESS_CHANGE.test(part));
    // A shared rule can expressly cover both domestic moves and arrivals. Its
    // arrival wording is then an alternative, not a prerequisite for the action.
    if (domesticScope.test(quote) || addressAlternative) return undefined;
    if (arrival.test(text)) return "arrival_in_current_country";
    // A sentence lifted from an arrival-only guide can omit its page's scope.
    // Preserve titles expressly covering both domestic and international moves.
    if (arrival.test(claim.sourceTitle ?? "") && !domesticScope.test(claim.sourceTitle ?? "") && !addressChangeRule) return "arrival_source_in_current_country";
    if (PERMIT_DEPENDENCY.test(text)) return "unrequested_initial_permit_process";
    // An application to obtain a country-level municipality-of-residence status
    // depends on intended residence, unlike ordinary registration of a new local
    // address. Existing residence alone does not prove that status is registered.
    if (/\bmunicipality of residence\b/i.test(text) && /\b(?:register|registration|apply|application)\b/i.test(text)
        && intendedStay.test(text)) return "unrequested_initial_residence_application";
    return undefined;
  };

  return {
    // This does not label the move domestic by guessing where either city is.
    instructions: active
      ? `The family explicitly says it already lives in ${countryName}. This request does not establish arrival in that country or an initial immigration application. Do not turn newcomer checklists, first-arrival registration, identity-card applications or their eligibility questions into tasks for this move. Preserve requirements actually caused by changing address and any relevant conditional benefits; do not infer permanent residence, citizenship or benefit eligibility.`
      : "",
    exclusion,
    narrative: (text: string | undefined) => (text ?? "").split(/(?<=[.!?])\s+/)
      .filter((sentence) => !exclusion({ quote: sentence })).join(" ").trim(),
    keepQuestion: (text: string, retainedClaims?: string) => {
      if (!active) return true;
      if (exclusion({ quote: text }) || residenceQuestion.test(text) || moveOriginQuestion.test(text)
          || (differentMunicipality && municipalityQuestion.test(text))) return false;
      if (IMMIGRATION_QUESTION.test(text)
          && !(CITIZENSHIP.test(text) && retainedClaims !== undefined && CITIZENSHIP.test(retainedClaims))) return false;
      // A question from a discarded arrival-benefit candidate must not survive
      // by itself. Unknown eligibility still matters when a retained rule needs it.
      const conditions = ELIGIBILITY_CONDITIONS.filter((condition) => condition.test(text));
      return retainedClaims === undefined || !conditions.length || conditions.some((condition) => condition.test(retainedClaims));
    },
  };
}

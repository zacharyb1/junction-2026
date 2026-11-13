/** Fixed UI strings. Model-written text follows the message language; these fall back to English. */
const strings = {
  en: {
    yes: 'Yes, help us',
    no: 'Not now',
    accepted: 'On it. I will only use what I can find and link.',
    declined: 'No problem. I will stay out of the way.',
    unsupported: 'I can only research pregnancy so far. I will not guess for this one.',
    progressTitle: 'Researching, with sources',
    planTitle: 'Your next 7 days',
    planEmpty: 'I could not find reliable sources for any of this just now, so I will not guess.',
    missing: 'No reliable source found, so I am not guessing',
    sources: 'Sources',
    published: 'published',
    retrieved: 'retrieved',
    hrButton: 'Draft message to HR',
    hrTitle: 'Draft for HR (not sent)',
    hrBasedOn: 'Based on',
    hrNoEvidence:
      'I found no sourced leave terms for the employer, so the draft only asks HR for them and states no terms.',
    hrStale: 'That draft was already made (or the plan is no longer active).',
    failed: 'Research failed. Nothing was made up; please try again.',
    alertTitle: 'Something changed',
    states: { waiting: 'waiting', running: 'searching', done: 'done', empty: 'nothing found', failed: 'failed' },
  },
  fi: {
    yes: 'Kyllä, auta meitä',
    no: 'Ei nyt',
    accepted: 'Selvä. Käytän vain sitä, minkä löydän ja voin linkittää.',
    declined: 'Ei hätää. Pysyn poissa tieltä.',
    unsupported: 'Osaan toistaiseksi selvittää vain raskauteen liittyvät asiat. En arvaile tässä.',
    progressTitle: 'Selvitän, lähteiden kanssa',
    planTitle: 'Seuraavat 7 päivää',
    planEmpty: 'En löytänyt nyt luotettavia lähteitä, joten en arvaile.',
    missing: 'Luotettavaa lähdettä ei löytynyt, joten en arvaile',
    sources: 'Lähteet',
    published: 'julkaistu',
    retrieved: 'haettu',
    hrButton: 'Luonnostele viesti HR:lle',
    hrTitle: 'Luonnos HR:lle (ei lähetetty)',
    hrBasedOn: 'Perustuu lähteisiin',
    hrNoEvidence: 'En löytänyt lähteellisiä tietoja työnantajan vapaaehdoista, joten luonnos vain kysyy niitä HR:ltä.',
    hrStale: 'Luonnos on jo tehty (tai suunnitelma ei ole enää aktiivinen).',
    failed: 'Selvitys epäonnistui. Mitään ei keksitty; yritä uudelleen.',
    alertTitle: 'Jokin muuttui',
    states: { waiting: 'odottaa', running: 'haetaan', done: 'valmis', empty: 'ei löytynyt', failed: 'epäonnistui' },
  },
} as const

export type Lang = keyof typeof strings
export type Strings = (typeof strings)[Lang]

export function t(language: string | undefined): Strings {
  return language && language in strings ? strings[language as Lang] : strings.en
}

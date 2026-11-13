# Data sources beyond Exa

Checked with curl on Fri 13 Nov 2026. Every sample below was run and returned what the row says.

| Source | Base URL | Gives | Auth | Sample run, result | Butler use | Verdict |
|---|---|---|---|---|---|---|
| Suomi.fi service catalogue (PTV v11) | `https://api.palvelutietovaranto.suomi.fi/api/v11` | Public services per municipality in fi, sv, en, life-event tags, channels | None. v11 ends April 2027, v12 needs a key | `/Service/area/Municipality/code/049`: 892 Espoo services. `/Service/{id}`: "Day care centres in Leppävaara", 40 centres, apply in eVaka | Daycare and municipal steps, life event to services | Use now |
| Finlex open data | `https://opendata.finlex.fi/finlex/avoindata/v1` | Statutes as XML with version labels | None | `/akn/fi/act/statute-consolidated/1995/481/fin@latest`: lease act, section 27 as amended 16.6.2026/531 | Quote the section in force | Use now |
| Statistics Finland PxWeb | `https://pxdata.stat.fi/PXWeb/api/v1/en/StatFin` | Official indices | None | POST `/khi/11xl.px` for 2025M10 and 2026M10: 2338 and 2412 | Check index-linked rent increases | Use now |
| avoindata CKAN, Kela open data | `https://avoindata.suomi.fi/data/api/3/action` | Dataset catalogue | None | `/package_search?q=kela`: 37 datasets, payment statistics only | No rules or amounts | Skip |
| Helsinki region Service Map | `https://api.hel.fi/servicemap/v2` | Units with address and coordinates | None | `/search/?q=päiväkoti&municipality=espoo&type=unit`: 281 units | Options list of daycares | Stretch |
| Digitraffic rail | `https://rata.digitraffic.fi/api/v1` | Live trains, cancelled flag | None | `/live-trains/station/HKI`: departures with delay fields | Proof of a train delay | Stretch |
| Digitransit | `https://api.digitransit.fi` | Routing | Key | POST routing: 401 missing subscription key | None without key | Skip |
| Finavia flights | `https://apigw.finavia.fi` | Flight status | Key | `/flights/public/v0/flights/dep/HEL`: 401 | Flight status if a key is registered | Skip |
| EU CELLAR (EUR-Lex data) | `https://publications.europa.eu` | EU law by CELEX number, dated consolidated versions, SPARQL | None | `/resource/celex/32004R0261` with `Accept: text/html`: Article 7, EUR 250, 400, 600. SPARQL lists version 02004R0261-20271023 | Quote EU law, pick the version in force on the event date | Use now |
| Your Europe | `https://europa.eu/youreurope` | Plain-language EU rights pages | None, no API | Air passenger page: 200, "Last checked: 21/09/2026" | Exa already reads it | Skip |
| GOV.UK Content API | `https://www.gov.uk/api/content` | Guide text as JSON with update time | None | `/private-renting`: 13 parts, updated 2026-10-20 | Exact quotes and page dates | Use now |
| GOV.UK Search API | `https://www.gov.uk/api/search.json` | Search over GOV.UK | None | `?q=train+delay+compensation&count=5`: 200, weak hits | Find the guide, then Content API | Use now |
| legislation.gov.uk | `https://www.legislation.gov.uk` | Statute XML, Atom search | None | `/all/data.feed?title=renters' rights`: 2025 Act plus 2026 commencement rules | Quote sections | Stretch |
| USA.gov benefit finder | `https://www.usa.gov/s3/files/benefit-finder/api/life-event` | Benefits with eligibility criteria | None | `/death.json`: 30 benefits. Only death, disability, retirement exist. benefits.gov redirects here | Three life events only | Stretch |
| eCFR and Federal Register | `https://www.ecfr.gov/api`, `https://www.federalregister.gov/api/v1` | Federal rules and changes | None | eCFR search "refund cancelled flight", title 14: section 260.6. Register: DOT refund rule of 2026-07-07 | Federal rule text with dates | Stretch |
| DataSF assessor roll | `https://data.sf.gov/resource/wv5m-vpq2.json` | Year built and units by address | None | `$where=property_location like '%1000 VALENCIA%'`: built 1978, 10 units | Is this building under San Francisco rent control | Use now |
| German service catalogue (PVOG) | `https://pvog.fitko.net/suchdienst/api` | Federal and state services, de and en | None | `/v7/servicedescriptions/110000000000?q=Elterngeld`: "Elterngeld beantragen", Berlin, forms, legal basis | German steps by region | Use now |
| German Foreign Office open data | `https://www.auswaertiges-amt.de/opendata` | Travel warnings, embassies | None | `/travelwarning`: 200 countries | Lost passport abroad | Stretch |

## Found while testing

- Finland, Act 531/2026, in force 1 October 2026: a rent increase needs written notice and takes effect at the earliest one month after the start of the next rent period. Leases signed earlier keep the old section 27.
- EU Regulation 2026/2202 amends air passenger rights and applies from 23 October 2027. Flights before that follow the current text.

## Ranked

Finland:
1. Finlex open data: the exact section in force, with its version date.
2. PTV: municipal services and life events for Espoo and Helsinki.
3. PxWeb: checks the index in a rent letter. CELLAR does the same job for flights.

US and UK:
1. GOV.UK Content and Search API.
2. DataSF year built for the San Francisco rent case.

## Not in the JSON

Real hosts that did not answer plain curl from this container (unverified): wetten.overheid.nl, overheid.nl, cbr.nl, mites.gob.es, policia.es, hacienda.gob.es, mit.gov.it, mimit.gov.it, bmv.de, urssaf.fr, otc-cta.gc.ca. eur-lex.europa.eu and ssa.gov answer only with www.

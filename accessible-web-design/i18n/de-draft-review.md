# German draft — points for the native reviewer

`messages/de.draft.json` holds 133 German strings. This is the list of things
to decide before it is promoted to `messages/de.json`. It is not a list of
everything wrong with the draft, because the draft is broadly sound: the Sie
form is consistent, no exclamation points, no fear-selling, no
`rechtssicher`, no fine amount reintroduced in `legal.enforcement`, and the
official names (BFSG, European Accessibility Act, WCAG 2.1 Level AA,
Equality Act 2010) are intact everywhere.

Eight points follow. Four survived an adversarial pass that tried to knock
them down, one was found afterwards by `voice-de.mjs`, and three were never
contested — those three are marked, and are one reader's opinion rather than
a verdict. Every German quote below was checked against the file, and every
counting claim was counted.

---

## Meaning changed — decide these first

These five alter what the sentence says, and three of them sit in text a
reader uses to work out whether the law applies to them.

### 1. `apply.books` — "reservations" narrowed to restaurant tables

| | |
|---|---|
| **EN** | Allows people to book appointments or reservations |
| **DE** | Sie nehmen Termin- oder **Tisch**buchungen entgegen |

`Tischbuchung` means one thing: a table in a restaurant. The English covers
hotel rooms, tickets, rental slots, studio time. This is an item in the
checklist that decides whether the Act applies, so a hotel or a ticket
seller reading it can honestly conclude the line is not about them.
(`Tischreservierung` would also be the more idiomatic German, if a table
were what was meant.)

**Proposed:** `Sie nehmen Termine oder Reservierungen entgegen`

### 2. `affected.exceptionDevices` — the carve-out excludes its own examples

| | |
|---|---|
| **EN** | consumer electronics — smartphones, ATMs, e-book readers, and the like |
| **DE** | **Unterhaltungselektronik** – Smartphones, Geldautomaten, E-Book-Reader und Ähnliches |

Dictionaries do gloss *consumer electronics* as *Unterhaltungselektronik*,
which is why this one needs a decision rather than a correction. The problem
is internal: a Geldautomat is entertainment electronics by no definition,
and the BFSG treats Selbstbedienungsterminals and E-Book-Lesegeräte as
categories of their own. The umbrella noun therefore excludes two of the
three examples it introduces, in a sentence about who is exempt.

**Proposed:** `Geräte für Verbraucher – Smartphones, Geldautomaten, E-Book-Reader und Ähnliches`

### 3. `services.body` — half the claim is missing

| | |
|---|---|
| **EN** | …Your website should outlast this year's stack **and work for everyone**. |
| **DE** | …Ihre Website sollte länger halten als der Technik-Trend dieses Jahres. |

The inclusion half is simply gone, leaving the services pitch as a
durability argument. The key carries no `voice: metaphor` or
`voice: humour` flag in `notes.json`, so there is no licence to recreate
rather than translate, and length is not the constraint — the restored
sentence is fifteen words, inside the twenty-word rule.

**Proposed:** `Wir gestalten barrierefreie Websites, entwickeln Marken und planen Inhalte. Ihre Website sollte länger halten als der Technik-Trend dieses Jahres – und für alle funktionieren.`

### 4. `meta.description` — `Seite` where the rest of the catalogue says `Website`

| | |
|---|---|
| **EN** | …the people your old **site** turns away. |
| **DE** | …die Menschen, die Ihre alte **Seite** aussperrt. |

Counted in the draft: `Website`/`Websites` 22 times, `Seite` twice — here,
meaning the whole site, and in `statement.feedbackIntro` ("Nennen Sie uns
die Seite und was passiert ist"), meaning one page. So the same word now
names two things, and the statement page consistently maps *site* to
*Website* elsewhere ("Zurück zur Website", "diese Website"). English
*site* is not ambiguous with *page*; German `Seite` is.

`notes.json` caps this string at 155 characters. The current text is 138,
the proposal 140, so it fits.

**Proposed:** `Ein Designstudio in Berlin. Wir bauen Websites nach dem European Accessibility Act – auch für die Menschen, die Ihre alte Website aussperrt.`

### 4b. `apply.includes` — the same collision, in the plural

| | |
|---|---|
| **EN** | That covers **e-commerce sites**, booking platforms, SaaS companies… |
| **DE** | Dazu zählen **E-Commerce-Seiten**, Buchungsplattformen, SaaS-Anbieter… |

`Seiten` here means whole sites, not pages — so it is finding 4 again, and
it was missed by five agents reading the file. `voice-de.mjs` found it on
its first run, because a plural is invisible to a search for `Seite` and
obvious to a rule.

**Proposed:** `Onlineshops` — plain German, and it drops a loanword on the
way past. `E-Commerce-Websites` is the conservative alternative if the
English term of art should be kept.

---

## Not contested — one reader's opinion

The adversarial pass never reached these three. They are recorded so the
decision is yours rather than lost.

### 5. `legal.enforcement` — officialese, and a second meaning for `Prüfung`

> Verbraucher und Verbände können **eine Prüfung durch die Behörden
> verlangen**.

Two objections, one solid and one a judgement call.

**Solid, and counted:** `Prüfung` is already the word this site sells.
`eaa.auditLink` and `apply.notSureLink` both read *Prüfung der
Barrierefreiheit anfragen*. Here it names a regulator's inspection. One
term, two concepts, two screens apart.

**A judgement call:** *eine Prüfung durch die Behörden verlangen* is the
nominal style with an agentive `durch`-phrase, which is the Behördendeutsch
register the brief exists to counter — and *verlangen* hardens the English
"can ask authorities to inspect" into a demand.

**Proposed:** `Die Durchsetzung unterscheidet sich je nach Land. Verbraucher und Verbände können die Behörden einschalten. Bleiben Barrieren bestehen, können sie klagen.`

### 6. `who.auditoryDesc` — a diagnosis in a list of ordinary moments

| | |
|---|---|
| **EN** | A loud café, **an ear infection**, a dead headphone battery |
| **DE** | Lautes Café, **Mittelohrentzündung**, leerer Kopfhörerakku |

`notes.json` says of this list: *everyday situations, not medical
conditions — keep them ordinary*. `Mittelohrentzündung` names otitis media
specifically. `Ohrenentzündung` keeps it plain. Minor.

### 7. `who.motorDesc` — the injury moved

| | |
|---|---|
| **EN** | **A broken arm**, carrying groceries, holding a baby |
| **DE** | **Gips am Handgelenk**, volle Einkaufstüten, ein Baby auf dem Arm |

Wrist rather than arm, on a key with no flag authorising the change.
`Gips am Arm` restores it. Minor, and arguably an improvement as German —
your call.

---

## What can become a test, and what cannot

Worth encoding in a check like the widget's `voice.de.test.ts`, so no future
translator has to be told:

- **One term per concept**, mechanically: `Website` vs `Seite` for the site,
  and `Prüfung` reserved for the audit we sell. Both are countable, and both
  were found by counting.
- **Placeholders survive**: `{threshold}` and `{height}` present in every
  locale that has them in English.
- The rules already covered by the widget's suite — Sie, no exclamation
  points, sentences under twenty words, spaced en dash, long-form dates, no
  imperial measurement — all of which this draft already passes.

Needs a native ear and cannot be automated:

- Whether `Unterhaltungselektronik` or `Geräte für Verbraucher` is the term
  a German lawyer would expect in a BFSG context.
- Whether the recreated metaphors (`eaa.doorLine`, `a11y.houseLine`,
  `services.doorMetaphor`) land in German or read as translated English.
  `notes.json` warns specifically that a German rhetorical question in
  `eaa.doorLine` may read as advertising, where a dry statement is safer.
- The gendering policy, which nothing in the draft currently settles.

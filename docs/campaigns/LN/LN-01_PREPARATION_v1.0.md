# LN-01 — Приготування

**Campaign:** LN — «Остання ніч»  
**Mission role:** tutorial investigation / parallel-text comparison  
**Status:** MISSION_COMPLETE / SOURCE_AUDITED  
**Version:** 1.0  
**Date:** 2026-08-17

## 1. Mission purpose

This mission teaches the player the core rule of «Архів Писання»: do not guess what a biblical story probably says; establish what each text actually states, compare witnesses, and distinguish explicit detail from inference.

The case is deliberately narrow: reconstruct how the place for the Passover meal was prepared before the supper.

## 2. Primary Scripture corpus

- Matthew 26:17–19
- Mark 14:12–16
- Luke 22:7–13

Source audit on 2026-08-17 confirmed the following direct-text facts across these passages:

- Matthew describes disciples asking where to prepare, Jesus directing them into the city to a particular/unspecified man, and the disciples preparing the Passover.
- Mark says Jesus sent two disciples; they would meet a man carrying a water jar, follow him, speak to the householder, be shown a large furnished upper room, and later find the situation as Jesus had told them.
- Luke explicitly names Peter and John as the two sent; it also includes the man carrying water, the householder, the large furnished upper room, and the report that they found things as Jesus had told them.
- None of these three passages gives the personal name of the man carrying water or the owner/master of the house.

No mission task requires a historical claim outside these passages.

## 3. Learning objectives

By the end of LN-01, the player should be able to:

1. identify which Gospel explicitly names Peter and John as the disciples sent to prepare;
2. distinguish Mark's explicit «two disciples» from Luke's naming of those two;
3. identify the shared sign in Mark and Luke: a man carrying a water jar;
4. reconstruct the instruction sequence without inventing intermediate events;
5. compare how Matthew compresses the episode relative to Mark and Luke;
6. recognize when a text leaves a person unnamed;
7. support a conclusion with a passage reference rather than memory alone.

## 4. Mastery tags

- `GOSPEL_PARALLELS`
- `TEXT_VS_INFERENCE`
- `CITATION_EVIDENCE`
- `CHRONOLOGY_BASIC`
- `CHARACTER_IDENTIFICATION`
- `SOURCE_SCOPE_DISCIPLINE`

## 5. Entry conditions

None. This is an introductory mission.

## 6. Opening brief

**Case file:** Before the supper begins, the meal must be prepared. Three Gospel accounts preserve the preparation, but they do not provide exactly the same level of detail. Your task is to reconstruct only what the texts allow you to know.

**Case question:** Who was sent, what sign were they given, where were they led, and what can we responsibly say about the people involved?

The player is explicitly told that «not stated in the text» may be a correct answer.

## 7. Mission flow

Entry: `LN01-N01`

Core flow:

`N01 → N02 → N03 → N04 → N05 → N06 → N07 → N08 → N09 → N10 → N11 → N12 → N13`

Optional evidence node `N14` can unlock from N05 or N08.

Incorrect responses never hard-fail the mission. They route to a source-check or hint branch and then return to the unresolved node.

---

## 8. Task nodes

### LN01-N01 — Establish the corpus

**Task family:** source orientation  
**Difficulty:** 1/6  
**Required:** yes  
**Skill target:** identify the relevant witness set before answering.

**Player prompt:** Three Gospel passages describe the preparation for the Passover meal. Select the three accounts that belong to this case.

**Accepted answer:** Matthew 26:17–19; Mark 14:12–16; Luke 22:7–13.

**Rejected example:** John 13 as a substitute for one of the three preparation accounts.

**Why rejected:** John 13 is relevant to the supper context but is not one of the three passages that narrate this preparation sequence in the same way.

**Required evidence:** passage headings/ranges supplied by mission corpus.

**Source confidence:** T1.

**Hints:**
1. The preparation account is preserved in the three Synoptic Gospels.
2. Look at Matthew 26, Mark 14 and Luke 22.
3. Reveal the exact ranges.

**On correct:** unlock N02.  
**On incorrect:** show the difference between «supper material» and «preparation account»; retry.  
**Mastery effect:** recognition evidence for `SOURCE_SCOPE_DISCIPLINE`.

**Accessibility:** choices must be presented as a standard labelled list; no visual-only cards.

---

### LN01-N02 — Who is explicitly named?

**Task family:** direct textual identification  
**Difficulty:** 1/6  
**Required:** yes

**Player prompt:** Which Gospel explicitly names the disciples Jesus sent to prepare the Passover, and who are they?

**Accepted answer:** Luke; Peter and John.

**Accepted variants:** «Luke 22» / «Luke 22:8» plus Peter and John.

**Required evidence:** Luke 22:8.

**Rejected answer:** «Mark names Peter and John.»

**Rejection reason:** Mark states that Jesus sent two disciples but does not name them in Mark 14:13.

**Source confidence:** T1.

**Success feedback:** Luke supplies the names; this detail should not be retroactively attributed to Mark as though Mark states it.

**Hints:**
1. Compare the subject of the sending in Mark and Luke.
2. Narrow to Luke 22:8.
3. Reveal Peter and John.

**On correct:** N03.  
**On incorrect:** source-check branch comparing Mark 14:13 and Luke 22:8, then retry.  
**Mastery effect:** recall/application for `CHARACTER_IDENTIFICATION` and `TEXT_VS_INFERENCE`.

**Accessibility:** free-response and citation-select modes must both be keyboard usable.

---

### LN01-N03 — What does Mark actually say?

**Task family:** text-vs-inference classification  
**Difficulty:** 2/6

**Player prompt:** Evaluate the statement: «Mark 14 explicitly identifies the two disciples as Peter and John.» Classify it as DIRECT TEXT, SUPPORTED BY PARALLEL COMPARISON, or UNSUPPORTED AS A CLAIM ABOUT MARK ALONE.

**Accepted answer:** UNSUPPORTED AS A CLAIM ABOUT MARK ALONE.

**Required evidence:** Mark 14:13 says two disciples; Luke 22:8 supplies Peter and John.

**Source confidence:** T2.

**Success feedback:** It is responsible to infer that Luke's named pair corresponds to Mark's two disciples when comparing the parallels, but it is inaccurate to say Mark itself names them.

**Hints:**
1. Ask what Mark alone states.
2. Read Mark 14:13, then Luke 22:8.
3. The distinction is between source wording and cross-Gospel synthesis.

**On correct:** N04.  
**On partial:** if player selects «supported by parallel comparison», accept conceptual insight but require correction of the phrase «Mark explicitly identifies» before proceeding.  
**On incorrect:** guided comparison branch.

**Mastery effect:** application for `TEXT_VS_INFERENCE`.

---

### LN01-N04 — Matthew's level of detail

**Task family:** witness comparison  
**Difficulty:** 2/6

**Player prompt:** What does Matthew tell you about the preparers' identities in Matthew 26:17–19?

**Accepted answer:** Matthew refers to the disciples collectively in this passage and does not name Peter and John as the preparers.

**Required evidence:** Matthew 26:17–19.

**Rejected answer:** «Matthew says two disciples.»

**Rejection reason:** that numerical detail belongs to Mark; Matthew's passage here does not specify two.

**Source confidence:** T1/T2.

**On correct:** N05.  
**On incorrect:** route through a three-column verbal comparison: Matthew / Mark / Luke.

**Mastery effect:** application for `GOSPEL_PARALLELS`.

**Accessibility:** the comparison must also exist as linear text headings, not only a visual table.

---

### LN01-N05 — The identifying sign

**Task family:** shared-detail discovery  
**Difficulty:** 1/6

**Player prompt:** Mark and Luke give the same distinctive sign for locating the correct house. What is it?

**Accepted answer:** They would meet a man carrying a jar/pitcher/container of water and follow him to the house he entered.

**Accepted variants:** translation-equivalent wording for jar/pitcher of water.

**Required evidence:** Mark 14:13–14; Luke 22:10–11.

**Source confidence:** T2.

**Hints:**
1. Look for the first person the disciples are told they will encounter in the city.
2. Mark 14:13 and Luke 22:10.
3. Reveal the water-carrying detail.

**On correct:** N06 and optionally unlock N14.  
**On incorrect:** narrow to the shared noun/action in Mark and Luke.

**Mastery effect:** recall/application for `GOSPEL_PARALLELS`.

---

### LN01-N06 — Do we know the water-carrier's name?

**Task family:** unsupported-claim detection  
**Difficulty:** 2/6

**Player prompt:** A case note says: «The man carrying water was named ______.» Can the blank be filled from Matthew 26:17–19, Mark 14:12–16 or Luke 22:7–13?

**Accepted answer:** No. His personal name is not stated in these passages.

**Required evidence:** absence of a name in the defined corpus; Mark 14:13 and Luke 22:10 identify him descriptively only.

**Rejected answers:** any personal name supplied as though stated by the text.

**Source confidence:** T1.

**Success feedback:** «Unknown from this corpus» is a positive evidence discipline result, not a failure to remember.

**On correct:** N07.  
**On incorrect:** correction branch teaches that filling narrative gaps is not the goal.

**Mastery effect:** strong application evidence for `TEXT_VS_INFERENCE`.

---

### LN01-N07 — The householder

**Task family:** explicit/implicit distinction  
**Difficulty:** 2/6

**Player prompt:** Mark and Luke tell the disciples to speak to the owner/master/householder of the house. Is that person's name given in either passage?

**Accepted answer:** No.

**Required evidence:** Mark 14:14–15; Luke 22:11–12.

**Source confidence:** T1.

**On correct:** N08.  
**On incorrect:** direct passage re-check.

**Mastery effect:** application for `SOURCE_SCOPE_DISCIPLINE`.

---

### LN01-N08 — Describe the room without overclaiming

**Task family:** evidence extraction  
**Difficulty:** 2/6

**Player prompt:** Build the minimum description of the room shared by Mark and Luke. Include only details supported by both accounts.

**Accepted answer:** A large upper/upstairs room that was furnished; it was the place where preparations were to be made.

**Accepted variants:** wording equivalent to «large furnished upper room».

**Required evidence:** Mark 14:15; Luke 22:12.

**Caution:** wording such as «ready/prepared» varies by translation and textual rendering. The shared safe core for this task is large + upper/upstairs + furnished.

**Source confidence:** T2.

**On correct:** N09 and optionally N14.  
**On partial:** identify missing shared descriptor and retry.  
**On incorrect:** show only the passage references, not the answer, until later hint levels.

**Mastery effect:** synthesis for `CITATION_EVIDENCE`.

---

### LN01-N09 — Reconstruct the instruction sequence

**Task family:** chronology ordering  
**Difficulty:** 2/6

**Player prompt:** Put the following stages in the order represented by Mark/Luke: (A) prepare the Passover; (B) enter the city; (C) encounter the man carrying water; (D) follow him to the house; (E) speak to the householder; (F) be shown the upper room.

**Accepted order:** B → C → D → E → F → A.

**Required evidence:** Mark 14:13–16; Luke 22:10–13.

**Source confidence:** T2.

**On correct:** N10.  
**On incorrect:** identify the first misplaced transition only; do not reveal the whole sequence unless high-level hint is used.

**Mastery effect:** application for `CHRONOLOGY_BASIC`.

**Accessibility:** ordering must support numbered-choice reassignment and move-up/move-down controls; drag-and-drop cannot be the only interaction.

---

### LN01-N10 — What did they find?

**Task family:** citation evidence  
**Difficulty:** 2/6

**Player prompt:** Find the evidence that the disciples' experience matched the prior instruction. Cite one passage from Mark or Luke.

**Accepted answer:** Mark 14:16 or Luke 22:13.

**Accepted variants:** either verse with a paraphrase that they found things as Jesus had told them.

**Required evidence:** Mark 14:16 and/or Luke 22:13.

**Source confidence:** T1.

**On correct:** N11.  
**On incorrect:** hint ladder narrows to final verse of each preparation account.

**Mastery effect:** recall/application for `CITATION_EVIDENCE`.

---

### LN01-N11 — Compare compression across witnesses

**Task family:** parallel-text synthesis  
**Difficulty:** 3/6

**Player prompt:** Which account is most compressed about locating the room: Matthew, Mark or Luke? Explain using only observable textual detail.

**Accepted answer:** Matthew is the most compressed of the three in this defined episode. It directs the disciples to a certain/particular man in the city but does not include Mark/Luke's water-carrier sign, the follow-him sequence, or the detailed upper-room description.

**Required evidence:** Matthew 26:17–19 compared with Mark 14:12–16 and Luke 22:7–13.

**Source confidence:** T2.

**Rejected reasoning:** claims about why Matthew chose to abbreviate the event unless separately labelled interpretation.

**On correct:** N12.  
**On partial:** accept «Matthew» but require one concrete comparison detail.  
**On incorrect:** comparison matrix branch.

**Mastery effect:** synthesis for `GOSPEL_PARALLELS` and `TEXT_VS_INFERENCE`.

---

### LN01-N12 — Claim audit

**Task family:** evidence-board audit  
**Difficulty:** 3/6

**Player prompt:** Classify each statement:

1. Luke names Peter and John as the preparers.
2. Mark says Jesus sent two disciples.
3. Matthew names the owner of the house.
4. Mark and Luke describe an upper room.
5. The man carrying water was certainly the owner of the house.

Use DIRECTLY SUPPORTED / SUPPORTED BY COMPARISON / NOT SUPPORTED BY THIS CORPUS.

**Accepted classification:**

1. DIRECTLY SUPPORTED — Luke 22:8.
2. DIRECTLY SUPPORTED — Mark 14:13.
3. NOT SUPPORTED — Matthew does not name the owner.
4. SUPPORTED BY COMPARISON, with each account directly supporting the room detail — Mark 14:15; Luke 22:12.
5. NOT SUPPORTED BY THIS CORPUS — the text distinguishes the water-carrier encountered/followed from the householder addressed, but does not explicitly identify them as the same person.

**Source confidence:** T1/T2.

**On correct:** N13.  
**On any error:** route only the failed statement to targeted re-check.

**Mastery effect:** high-strength application/synthesis evidence for `TEXT_VS_INFERENCE`.

---

### LN01-N13 — Final reconstruction

**Task family:** free-response synthesis  
**Difficulty:** 3/6

**Player prompt:** Reconstruct the preparation in 4–7 factual sentences. Your answer must include: who Luke names, what Mark says about number, the shared sign in Mark/Luke, the room description, and one explicit statement about what remains unknown.

**Required propositions for full credit:**

- Luke names Peter and John.
- Mark says two disciples but does not name them in this passage.
- Mark and Luke include a man carrying water as the identifying sign.
- They are directed to the house and to speak to its owner/master/householder.
- Mark and Luke describe a large furnished upper/upstairs room.
- They prepare the Passover and find the situation as Jesus had told them in Mark/Luke.
- At least one disciplined unknown: the personal name of the water-carrier and/or householder is not stated in the corpus.

**Partial credit:** 5–6 propositions with no unsupported assertion.

**Failure condition:** any invented name presented as explicit text, or attribution of Luke-only naming directly to Mark/Matthew, requires correction before completion.

**Source confidence:** T1/T2.

**Completion:** mission clear if all required propositions are resolved independently or through guided correction.

**Mastery effect:** synthesis evidence across all six mission tags. Guided hints reduce independence confidence but do not block mission completion.

---

### LN01-N14 — Optional evidence: translation-safe wording

**Task family:** source-literacy side objective  
**Difficulty:** 3/6  
**Required:** no

**Player prompt:** Different translations may use «jar», «pitcher» or another equivalent container term; «owner», «master» or «householder» may also vary. Which parts of the proposition are essential for the case, and which are translation-level wording differences?

**Accepted answer:** Essential proposition: a male person carrying water functions as the identifying encounter in Mark/Luke; the disciples are directed to the responsible person of the house. Exact English/Ukrainian noun choice for the vessel or householder can vary by translation without changing the core event.

**Source confidence:** T2.

**Purpose:** prevent brittle answer matching and train semantic rather than wording-only verification.

**Reward:** optional mastery evidence for `SOURCE_SCOPE_DISCIPLINE`; no exclusive content locked behind completion.

---

## 9. Hint policy for this mission

LN-01 deliberately teaches how hints work. The first three hint levels should redirect attention without giving the answer. Level 6 may reveal the decisive verse reference. Level 7 may reveal the answer, but the relevant mastery item is recorded as guided and scheduled for later retrieval.

## 10. Failure and recovery design

There is no life/heart loss. A wrong answer produces one of three responses:

1. **source mismatch** — player is sent to the correct Gospel/passage range;
2. **overclaim** — player is asked whether the claimed detail is actually named/stated;
3. **parallel contamination** — player is shown that a detail from one Gospel has been attributed to another.

After correction, the player continues from the unresolved node.

## 11. Branching consequences

- Choosing to investigate Luke first makes N02 available before N03.
- Choosing Mark first makes N03 available before N02.
- N05 or N08 may unlock optional N14.
- Needing level-5+ hints on N02/N03 schedules a later Peter/John retrieval item in LN-02 or LN-04.
- An error on N06 or N07 schedules an «unnamed person / unsupported identity» retrieval task in a later campaign.

These branches affect order, optional evidence and later retrieval; they are not cosmetic.

## 12. Accessibility specification

Every node must be completable through keyboard and screen reader.

- Parallel accounts must have heading-based linear navigation.
- Evidence comparison cannot rely only on side-by-side columns.
- Ordering tasks require accessible numeric ordering controls.
- Correct/incorrect/partial states require text and screen-reader announcements, not color alone.
- Optional evidence must be announced as optional.
- Any future evidence-board visualisation must expose the same relations as a structured list: claim → source → status.

## 13. Theological integrity audit

This mission contains almost entirely T1/T2 claims. It intentionally avoids explaining why the Synoptic accounts differ in detail, because motive for authorial compression is interpretive unless separately sourced.

The mission does not identify the unnamed water-carrier or householder and does not claim they are the same person.

## 14. Source-audit record

Primary verification completed against Matthew 26:17–19, Mark 14:12–16 and Luke 22:7–13 on 2026-08-17. Multiple modern English renderings were checked for translation-equivalent wording. No verbatim copyrighted verse text is stored as game content in this specification; only references, short semantic descriptors and paraphrased propositions are used.

## 15. Mission completion output

At completion the player's case record should show:

- **Resolved:** Luke names Peter and John.
- **Resolved:** Mark states two disciples.
- **Resolved:** Mark/Luke share the water-carrier sign.
- **Resolved:** the group is directed to a large furnished upper room in Mark/Luke.
- **Resolved:** the preparation is completed.
- **Unresolved by design:** personal names of the water-carrier and householder in this corpus.

The final lesson is explicit: responsible Bible investigation includes knowing what the text does **not** tell you.

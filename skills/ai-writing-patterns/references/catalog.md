# Pattern Catalog

Thirty-eight patterns, grouped by what they affect. Each heading carries a `strength:` line right below it.

## Evidence strength

- `high`: an artifact or a provenance signal that carries the verdict on its own. Chatbot residue and provider markup (P19, P19b), sycophantic tone (P21), false insight (P26), colon reveal (P27), throat-clearing opener (P28), pseudo-profound closer (P32), text that describes the previous version (P35). Emoji and curly quotes are never used as a `high` example.
- `moderate`: points at a direction, but also shows up in careless human writing.
- `low`: a lexical cluster. On its own it never decides; it only counts next to another signal.

A weak signal alone never decides, and strength does not replace context: one `high` in the right place outweighs several `low` added together.

## Category 1: Content patterns

### P01 - Significance inflation
strength: moderate

A plain fact is dressed up as a historical milestone or a broader trend.

Signals: "marks a turning point", "stands as a testament to", "played a vital role", "reflects broader trends", "shaping the future of".
Before: "The office opened in 1989, marking a turning point in regional statistics."
After: "The office opened in 1989 to collect and publish regional statistics."

### P02 - Notability name-dropping
strength: moderate

Names or outlets are listed to borrow credibility instead of making a point.

Signals: "covered by independent media", "featured in the Times, the BBC and Le Monde", "an active presence on social media".
Before: "Her work has been cited by the Times, the BBC, Le Monde and El Pais."
After: "In a 2024 interview with the Times, she argued that AI rules should focus on outcomes."

### P03 - Superficial "-ing" analysis
strength: moderate

A trailing clause with an "-ing" verb claims meaning that the sentence never supports.

Signals: "highlighting", "ensuring", "reflecting", "contributing to", "demonstrating", "underscoring".
Before: "The building uses blue, green and gold, symbolizing the fields, the ocean and the varied landscape, reflecting the community's bond with the land."
After: "The building uses blue, green and gold. The architect said the colors refer to the fields and the nearby coast."

### P04 - Promotional language
strength: low

Marketing adjectives replace a neutral description of the subject.

Signals: "vibrant", "rich", "nestled in the heart of", "renowned", "breathtaking", "must-see".
Before: "Nestled in the breathtaking region, the town stands out as a vibrant hub of rich cultural heritage."
After: "The town sits in the Gonder region, known for its weekly market and an eighteenth-century church."

### P05 - Vague attribution
strength: moderate

A claim is attributed to unnamed observers, experts or reports.

Signals: "industry reports", "observers note", "experts argue", "critics point out", "according to several sources".
Before: "Experts believe it plays a crucial role in the regional ecosystem."
After: "The river holds several endemic fish species, according to a 2019 survey by the Academy of Sciences."

### P06 - Formulaic "challenges and outlook" section
strength: moderate

A closing section admits generic difficulties and then promises a bright road ahead, without naming either one.

Signals: "Despite the challenges, it continues to thrive", "Challenges and legacy", "Future outlook".
Before: "Despite the usual urban challenges, including congestion and water shortages, the city continues to thrive."
After: "Congestion grew after 2015, when three new tech parks opened. The city began a drainage project in 2022."

## Category 2: Language patterns

### P07 - AI-typical vocabulary
strength: low

A cluster of inflated words repeats across a paragraph. A single one proves nothing; two or more in the same paragraph is the signal.

Signals: "additionally", "align with", "crucial", "delve into", "emphasizing", "enduring", "enhance", "foster", "highlight" as a verb, "intricate", "landscape" used abstractly, "pivotal", "showcase", "tapestry", "testament", "valuable", "vibrant".
Before: "Additionally, a distinctive feature is the inclusion of local dishes, an enduring testament to the culinary landscape, demonstrating how tradition endures."
After: "The food also includes camel meat, considered a delicacy. Pasta dishes, brought during the Italian colonial period, remain common."

### P08 - Copula avoidance
strength: moderate

The plain verb "is" is replaced by a heavier phrase that means the same thing.

Signals: "serves as", "acts as", "stands as", "represents a", "boasts", "offers".
Before: "The gallery serves as an exhibition space. The venue boasts four separate rooms and offers over 300 square meters."
After: "The gallery is the exhibition space. It has four rooms with 300 square meters in total."

### P09 - Negative parallelism
strength: moderate

A sentence first denies a small reading, then reveals a larger one. The move is human rhetoric, so it only counts by frequency.

Signals: "not only X but Y", "it is not just about X, it is about Y", "not merely a X, but a Y".
Before: "It is not only about the beat under the vocals; it is part of the aggression. It is not merely a song, it is a statement."
After: "The heavy beat drives the aggressive tone."

### P10 - Rule of three
strength: moderate

Ideas are forced into groups of three to sound complete.

Signals: three nouns or three clauses joined in a row, repeated across the text.
Before: "The event offers talks, panels and networking opportunities. Attendees can expect innovation, inspiration and insight."
After: "The event includes talks and panels, with time for informal networking between sessions."

### P11 - Synonym cycling
strength: moderate

One subject is renamed on every sentence to avoid repeating a word.

Signals: "the protagonist", then "the main character", then "the central figure", then "the hero", all for the same person.
Before: "The protagonist faces many trials. The main character must overcome obstacles. The central figure eventually wins. The hero returns home."
After: "The protagonist faces many trials, but eventually wins and returns home."

### P12 - False ranges
strength: low

A "from X to Y" phrase joins two points that are not on the same scale.

Signals: "from X to Y" where X and Y belong to different categories.
Before: "Our journey through the universe took us from the Big Bang to dark matter, from the birth of stars to the dance of galaxies."
After: "The book covers the Big Bang, the formation of stars and current theories about dark matter."

## Category 3: Style patterns

### P13 - Em dash overuse
strength: low

The dash that sets off a side remark appears several times in a short span. Editors add it too, so a single one proves nothing.

Signals: repeated asides opened and closed with a long dash.
Before: "The term is pushed by institutions - not by the people. You do not write 'Netherlands, Europe' as an address - yet the label stays - even in official documents."
After: "The term is pushed by institutions, not by the people. You do not write 'Netherlands, Europe' as an address, yet the label stays in official documents."

### P14 - Bold overuse
strength: moderate

Key terms are bolded in every sentence, so nothing stands out.

Signals: bold spread across most nouns and product names in a paragraph.
Before: "It combines **OKRs**, **KPIs** and visual tools such as the **Business Model Canvas** and the **Balanced Scorecard**."
After: "It combines OKRs, KPIs and visual tools such as the Business Model Canvas and the Balanced Scorecard."

### P15 - Inline-header vertical lists
strength: moderate

A list where every item opens with a bold label and a colon, and the body only restates the label.

Signals: bullets shaped like "**Topic:** one line that repeats the topic".
Before:
"- **User experience:** The user experience was improved.
- **Performance:** Performance was improved with optimized algorithms."
After: "The update improves the interface, speeds up loading with better algorithms and adds end-to-end encryption."

### P16 - Title Case headings
strength: moderate

Every heading capitalizes every significant word.

Signals: "Strategic Partnerships And Global Growth" instead of sentence case.
Before: "## Strategic Negotiations And Global Partnerships"
After: "## Strategic negotiations and global partnerships"

### P17 - Decorative emoji
strength: low

Emoji are sprinkled onto headings or labels as decoration. Common in human marketing copy, so a single one is weak.

Signals: emoji at the start of a heading or label, not tied to the meaning.
Before: "🚀 **Launch phase:** the product ships in Q3
💡 **Key insight:** users prefer simplicity"
After: "The product ships in Q3. User research showed a preference for simplicity."

**Variant P17b - Emoji bullets**: three or more consecutive lines that start with an emoji where a bullet marker would normally go. The emoji organizes topics instead of expressing a feeling, which is what separates it from a decorative emoji.

Before (emoji bullets):
"🎯 Set quarterly goals
📊 Review last quarter's metrics
🚀 Launch the campaign
💬 Collect feedback
🔄 Iterate on the product"

After: "For the quarter: set goals, review last quarter's metrics, launch the campaign, collect feedback and iterate on the product."

Note: emoji bullets are common in LinkedIn posts and generated slide decks. Three or more consecutive lines starting with an emoji only counts next to another signal.

### P18 - Curly quotes
strength: low

Typographic quotes (U+201C and U+201D) instead of straight quotes. Editor autocorrect produces the same output, so on its own it is weak.

Signals: opening and closing curly double quotes around ordinary words.
Before: "The report calls it “a turning point”."
After: "The report calls it \"a turning point\"."

## Category 4: Communication patterns

### P19 - Chatbot residue
strength: high

Lines that belong to a chat window end up inside the delivered text.

Signals: "I hope this helps!", "Certainly!", "Great question!", "Let me know if you want me to expand a section", "Would you like me to".
Rule: remove entirely. Text is content, not conversation.

**Variant P19b - Provider markup, tracked links and placeholders**: interface or template leftovers that survive into the final text. Signals, each shown in backticks: `:contentReference[oaicite:N]`, `turnNsearchN`, `[cite: N]`, `utm_source=chatgpt.com`, `[NAME]`, `XX/XX/XXXX`. Rule: remove always; one case already decides. It proves that a tool took part, not who wrote the rest.

### P20 - Knowledge-cutoff disclaimers
strength: moderate

The text admits uncertainty about its own coverage instead of finding the fact.

Signals: "As far as I know", "Based on the available information", "While specific details are limited".
Rule: find a real source or remove the sentence.

### P21 - Sycophantic tone
strength: high

The text praises the reader or the question before answering it.

Signals: "Great question!", "You are absolutely right!", "That is an excellent point!".
Rule: answer directly, without the free compliment.

## Category 5: Filler and hedging

### P22 - Filler phrases
strength: low

A phrase adds words without adding meaning.

| Before | After |
|--------|-------|
| "In order to achieve" | "To achieve" |
| "Due to the fact that" | "Because" |
| "At this point in time" | "Now" |
| "In the event that you need" | "If you need" |
| "The system has the ability to" | "The system can" |
| "It is important to note that the data shows" | "The data shows" |

### P23 - Excessive hedging
strength: moderate

A claim is wrapped in so many qualifiers that it stops making a claim.

Signals: "could potentially be argued that", "might perhaps have some effect", stacked modals.
Before: "It could potentially be argued that the policy might perhaps have some effect on the results."
After: "The policy can affect the results."

### P24 - Generic positive conclusion
strength: moderate

The text closes on a bright, content-free note. Public relations writing does the same, so it is moderate.

Signals: "The future looks bright", "Exciting times lie ahead", "as we continue this journey toward excellence".
Before: "The future looks bright. Exciting times lie ahead as we continue this journey toward excellence."
After: "The company plans to open two more locations next year."

### P25 - Dramatic fragmentation
strength: moderate

Three or more short sentences in a row imitate depth through rhythm.

Signals: three consecutive sentences of fewer than eight words, with no variation.
Before: "This matters. This changes everything. This defines who we are. This is the future. And the future is now."
After: "The change matters because it cuts the approval flow from three levels to one."

Note: an isolated short sentence is natural. The pattern is three or more in a row, creating false drama.

### P26 - False insight
strength: high

A sentence sounds profound but only restates the obvious.

Signals: "It is not about X. It is about Y.", "The real question is not X, but Y.", "At its core, what matters is".
Before: "It is not about technology. It is about people. At its core, the real question is not how we use AI, but how AI changes us."
After: "Marketing teams that adopted AI cut campaign production from three weeks to four days, according to internal 2025 data."

Note: real insight cites data, a source or a mechanism. False insight restates a truism with the shape of a revelation.

### P27 - Colon reveal
strength: high

A noun phrase, a colon and a dramatic lowercase payoff.

Signals: "The real problem: the data", "The simple answer: there is none".
Before: "The secret to engagement: tell a story before showing any number."
After: "To engage readers, tell a story before showing the numbers."

Note: the colon sells the next phrase as a discovery. If the payoff would fit after "is", the colon only adds suspense the content cannot hold.

### P28 - Throat-clearing opener
strength: high

A line that announces honesty or directness before saying anything.

Signals: "Here is the question", "Let me be honest", "Let me be clear", "I will get straight to the point".
Before: "Let me be honest: none of this works as promised."
After: "The filter does not remove every complaint, as the attachment shows."

Note: persuasion comes from the claim, not from the warning that it is coming. If the text is already honest in tone, the opener only adds distance.

### P29 - Interpretive metadiscourse
strength: moderate

A line steps out of the subject to tell the reader what to notice or how much weight to give it.

Signals: "What matters here", "It is worth noting that", "The crucial point is", "Do not miss".
Before: "It is worth noting that the number of orders doubled in one quarter, which is really significant."
After: "Orders doubled in one quarter, from 2,400 to 4,900."

Note: the reader decides the weight. Interpretive metadiscourse confesses that the text does not speak for itself; the number does.

### P30 - Fake strong verb
strength: moderate

A borrowed strong verb points at a noun that describes the subject itself.

Signals: "serves as", "acts as", "functions as", "represents a", "plays the role of".
Before: "The database serves as a centralized hub for all customer queries."
After: "The database keeps customer queries in one place."

Note: the strong verb only looks strong. Where "is" or "has" would do, "serves as" is a detour around the copula (see P08).

### P31 - Portability test failure
strength: low

A heuristic rather than a surface pattern: the sentence would fit, unchanged, in the mouth of another person, company or product.

Signals: any claim that names no product, no number and no decision.
Before: "Our platform simplifies the work of teams with tools for every step of the process."
After: "Our dashboard puts tickets, hours and contracts on one screen."

Note: detect mode quotes the sentence and proposes the cut; it does not score how generic the sentence is. If the reader cannot say which product does this, the sentence is not specific enough.

### P32 - Pseudo-profound closer
strength: high

The last line turns into a metaphor or an aphorism instead of ending on the concrete.

Signals: "And that is how the future is built", "In the end, it all comes down to trust".
Before: "Tools come and go; what remains is the trust of those who rely on the data every day."
After: "The migration ends on October 15, with both systems reading the same database."

Note: this is a pattern you delete. Rewriting the closer into a better metaphor is the mistake the pattern describes. A tutorial ends when the action ends, not when the author finds a closing line.

### P33 - Repeated sentence openers
strength: moderate

Two or more consecutive sentences open with the same structure.

Signals: "The gate reads... The gate counts... The gate compares...".
Before: "The gate reads the file. The gate counts the patterns. The gate compares against the quote."
After: "The gate reads the file, counts the patterns and compares against the quote."

Note: vary the subject and the order. Repeated openers create a machine rhythm even when the content is correct.

### P34 - Passive voice with dropped subject
strength: moderate

An action is reported without the person who performs it.

Signals: "it was decided that", "it is expected that", "problems were identified", with no one deciding, expecting or identifying.
Before: "It was decided that the gate would be widened."
After: "The team decided to widen the gate."

Note: passive voice is legitimate when the object matters more than the agent. The pattern is the erased subject that hides who acts.

### P35 - Describing the previous version instead of current behavior
strength: high

Documentation narrates the change instead of describing how the system works now.

Signals: "this used to be X, now it is Y", "in the previous version", "it was changed to".
Before: "The hook used to look only at one field; now it compares sets per event."
After: "The hook compares the set of hooks per event between the manifest and the workspace."

Note: in a code repository the history lives in version control. Documentation describes the present; a "before and after" ages on the next commit.

### P36 - Excessive nominalization
strength: low

A verb is turned into a noun, and the sentence fills with abstract weight.

Signals: "the performance of the validation", "the carrying out of the correction", "the occurrence of the failure".
Before: "The performance of the validation occurs after the completion of the implementation."
After: "The gate validates after the implementation finishes."

Note: nominalization stacks abstract nouns and hides the verb. A concrete verb brings the sentence back to the ground.

## pt-BR specific

Two patterns that only apply to Portuguese text. They are kept apart so the English list stays clean.

### P37 - Unnecessary corporate anglicism (pt-BR)
strength: low

An English office word is used where Portuguese has a clear equivalent. Established technical terms stay; the pattern is the jargon that exists to sound more advanced.

Signals: "deliverable", "engagement", "ownership", "onboarding de stakeholders", "deadline" where "prazo" would do.
Before: "O time tem ownership do deliverable."
After: "O time e responsavel pela entrega."

### P38 - Literal translation of English structure (pt-BR)
strength: moderate

A Portuguese sentence keeps the syntax of the English it was translated from.

Signals: "enderecar o problema", "faz sentido para", "no final do dia", "no mesmo barco", calqued from "address", "makes sense to", "at the end of the day".
Before: "Vamos enderecar esse gap no final do dia."
After: "Vamos resolver essa lacuna ainda hoje."

Note: a word-for-word translation keeps the English word order. Writing the idea directly in Portuguese usually shortens the sentence and removes the tic.

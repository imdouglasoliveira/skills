# Correction rules

Rules for Correct mode. Scope: spelling, accentuation, hyphenation, crase, agreement, government (regência), verb and pronoun forms, punctuation, homophones and common slips in pt-BR; spelling, grammar, punctuation and common confusions in English. These rules do not cover style or tone (see `catalog.md`) and do not check facts.

The tables are a high-confidence subset of the norm, not the whole of it. Anything outside them is `uncertain` until a reference dictionary or grammar confirms it.

## How to use this file

1. Apply only rules written here, plus any rule you can confirm in a reference dictionary or grammar (for pt-BR spelling and hyphens, the official orthographic vocabulary). If you cannot confirm, mark the item `uncertain` and ask. Never correct from a hunch.
2. Skip protected spans (see the guardrails in `SKILL.md`): code, direct quotes, URLs, paths, identifiers, proper nouns, brand spellings, titles of works, legal wording, numbers and data.
3. Respect deliberate usage: poetry, dialogue, slang and regional speech inside dialogue, stylized brand names, a variety choice, a house style.
4. Report every correction as one line (format below). One finding, one line, one reason.

## Output format

One line per fix:

```
L<line>  <RULE-ID>  [<tier>]  "<excerpt>"  -> "<fix>"   <reason, one clause>
```

- `<line>` is the line number in the input. For inline text without line breaks use the sentence number: `S3`.
- `<RULE-ID>` comes from the headings below (`PT-ACC`, `PT-CRA`, ...).
- `<tier>`: `error`, `norm`, `style` or `uncertain`.
- The excerpt shows the smallest span that carries the error, with at most a few words of context.
- The reason names the rule in a few words. It does not lecture.

After the list:

```
Left alone: L7 quote ("..."), L11 code span, L14 proper noun "..." (spelling kept), L20 deliberate stylization
Uncertain:  L21 "...": <what is unclear and what the options are>
Summary:    error 5, norm 2, style 1, uncertain 1 | families: PT-ACC 2, PT-CRA 1, PT-AGR 2, ...
```

If nothing was found, say `No corrections needed in the reviewed spans.` and still list `Left alone` if anything was skipped.

With `--apply`, the corrected text follows the list. Apply `error`; apply `norm` only in formal register; never apply `style` or `uncertain`.

## Tiers

| Tier | Meaning | Applied by `--apply` |
|------|---------|----------------------|
| `error` | Wrong in every register. | Yes |
| `norm` | Common in speech or informal writing, wrong in formal writing. | Only in formal register |
| `style` | Choice or house style. | Never |
| `uncertain` | Ambiguous, outside these tables, or possibly deliberate. | Never; ask |

Formal register: reports, documentation, contracts, official communication, articles, academic text, and anything the user calls formal. Chat, social posts, dialogue and personal notes are informal. When a row below does not name a tier, it is `error`.

## Language and variety

- Detect per paragraph. A mixed text is checked with each language's rules.
- Portuguese is assumed Brazilian, with the spelling of the 1990 orthographic agreement (mandatory in Brazil since 2016).
- Markers of European Portuguese: "facto", "autocarro", "ecrã", "telemóvel", "comboio", "receção", "estou a fazer" as the continuous form, older spellings such as "acção" or "óptimo". If they are present, do not convert anything. Say that the text looks European and ask which norm to apply. Enclisis ("disse-me") and "tu" with second-person verbs are not markers: both are Brazilian too.
- English: infer US or UK from the spelling already in the text ("color/colour", "organize/organise"). Keep it consistent; never convert one into the other unless asked. Flag a mix as `style`.

## pt-BR rules

### PT-ACC: accentuation

| Case | Rule | Examples |
|------|------|----------|
| Open diphthongs "ei", "oi" in paroxytones | no accent since 1990 | ideia, assembleia, heroico, jiboia, paranoico, joia (not "idéia", "assembléia", "heróico") |
| Open diphthongs "éi", "éu", "ói" in oxytones and monosyllables | accent kept | herói, papéis, anéis, dói, céu, troféu |
| Hiatus "oo" and "ee" | no circumflex since 1990 | voo, enjoo, leem, veem, creem, deem |
| "ter", "vir" and compounds, third person plural | circumflex | eles têm, eles vêm, eles contêm, eles mantêm, eles intervêm |
| Same verbs, third person singular | "tem", "vem" without accent; compounds take the acute | ele tem, ele vem, ele contém, ele mantém, ele intervém |
| Stressed "i" and "u" in hiatus | accent when alone in the syllable or followed only by "s" | saída, ciúme, país, viúva, baú, egoísta, juízo; no accent before "nh" (rainha, moinho) or with another consonant in the syllable (ruim, juiz) |
| Stressed "i" and "u" after a diphthong in paroxytones | no accent since 1990 | feiura, baiuca; oxytones keep it: Piauí, tuiuiú |
| Differential accents | most were dropped | para (verb), pelo, polo, pera without accent; kept: "pôr" (verb) vs "por", "pôde" (past) vs "pode" (present); "fôrma" is optional |
| Dieresis | removed from Portuguese words; kept in foreign names and words derived from them | frequência, linguiça, cinquenta, tranquilo; Müller, mülleriano |
| Oxytones ending in a, e, o, em, ens (+ s) | accent | está, café, avô, vocês, também, parabéns |
| Paroxytones ending in l, r, n, x, ps, ã(s), ão(s), i(s), um, uns, us | accent | fácil, caráter, hífen, tórax, bíceps, ímã, órfão, táxi, lápis, álbum, vírus |
| Paroxytones ending in "em", "ens" | no accent | item, itens, jovem, homem, hifens (not "ítem", "ítens", "hífens") |
| Proparoxytones | always accent | árvore, número, médico, público |
| Adverbs in "-mente" | built on the feminine form; the base word's accent drops | fácil -> facilmente, rápida -> rapidamente, obrigatória -> obrigatoriamente (not "obrigatóriamente") |

### PT-HIF: hyphen after the 1990 agreement

Prefixes and prefix-like elements. Rows for prefixes that always take a hyphen win over the general rows.

| Case | Rule | Examples |
|------|------|----------|
| Prefix ending in a vowel + word starting with the same vowel | hyphen | micro-ondas, anti-inflamatório, auto-observação, arqui-inimigo |
| Prefix ending in a vowel + word starting with "r" or "s" | no hyphen, the consonant doubles | antirrábico, ultrassom, minissaia, contrassenso, microssistema, autorretrato |
| Prefix ending in a vowel + a different vowel or another consonant | no hyphen | autoestima, antiaéreo, extraoficial, infraestrutura, semicírculo |
| Prefix + word starting with "h" | hyphen | anti-higiênico, super-homem, sub-hepático; exceptions: "des-" and "in-" drop the "h" (desumano, inábil) |
| Prefix ending in a consonant + word starting with a vowel | no hyphen | hiperativo, interurbano, superamigo, subemprego |
| Prefix ending in "r" + word starting with "r" | hyphen | hiper-requintado, inter-racial, super-resistente |
| "sub-" (also "ab-", "ob-", "sob-") + word starting with "b" or "r" | hyphen | sub-base, sub-região, ab-rogar |
| "co-" | no hyphen, even before "o" | coautor, coordenar, cooperar, coobrigação |
| Unstressed "re-", "pre-", "pro-" | no hyphen, even before "e" | reeleição, reescrever, preencher, preexistente |
| Always with hyphen | ex- (former), sota-, soto-, vice-, vizo-, além-, aquém-, recém-, sem-, and the stressed forms pós-, pré-, pró- | ex-presidente, vice-diretor, recém-nascido, sem-teto, pós-graduação, pré-escolar, pró-reitor |
| "pan-" and "circum-" before a vowel, "h", "m" or "n" | hyphen | pan-americano, circum-navegação |
| "mal-" before a vowel, "h" or "l" | hyphen; otherwise together | mal-educado, mal-humorado, mal-limpo; malcriado, malfeito |
| "não" and "quase" before a noun or adjective | no hyphen | não fumante, não agressão, quase delito |

Compounds and locutions (check the dictionary when unsure):

- Hyphen kept: guarda-chuva, arco-íris, bem-estar, bem-vindo, mal-estar, segunda-feira, meia-noite, e-mail; names of plant and animal species: bem-te-vi, erva-doce.
- Locutions lost the hyphen: fim de semana, dia a dia, mão de obra, cabo de guerra, pé de moleque.
- Exceptions that keep the hyphen by usage: água-de-colônia, arco-da-velha, cor-de-rosa, mais-que-perfeito, pé-de-meia, ao deus-dará, à queima-roupa.
- Compounds that lost the sense of composition are written together: paraquedas, paraquedista, pontapé, mandachuva, girassol.
- Prepositional, adverbial and conjunctive locutions have no hyphen: à toa, a fim de, em frente a, por isso, em vez de.

When a word is not on these lists, do not correct it as `error`. Use `uncertain` and say the dictionary should be checked.

### PT-CRA: crase

Crase marks the fusion of the preposition "a" with the article "a(s)", or with the first "a" of "aquele(s)", "aquela(s)", "aquilo", "a qual", "as quais".

Check two things: does the governing word ask for the preposition "a", and does the next word take the article "a"?

Crase is **required** when both are true:

- "Vou à escola." "Refiro-me à diretora." "Cheguei à conclusão."
- Feminine adverbial and prepositional locutions: à noite, à tarde, às vezes, à vista, à toa, à direita, à esquerda, às pressas, à medida que, à procura de, à frente de, à custa de, à beira de.
- Stated hours: "às 8h", "à uma hora", "à meia-noite". After another preposition there is no crase: "a partir das 8h", "adiada para as 14h", "desde as 9h".
- Before "aquele(s)", "aquela(s)", "aquilo" and "a qual" when the governing word asks for "a": "Refiro-me àquele caso", "A proposta à qual aderi".
- With an implied "à moda de": "bife à milanesa", "frango à passarinho".
- Before "senhora", "senhorita" and "dona" when the preposition is asked for: "Entreguei o documento à senhora".

Crase is **forbidden**:

- Before masculine words: "a pé", "a cavalo", "andar a esmo" (except the implied "à moda de" above).
- Before verbs: "a partir de", "começou a chover", "a fim de fazer".
- Before personal pronouns, most indefinite and demonstrative pronouns and "Vossa Excelência": "a ela", "a você", "a quem", "a alguém", "a cada", "a esta", "a essa", "a toda", "a Vossa Excelência".
- When "a" is only the preposition before a plural noun with no article: "Falei a pessoas desconhecidas", "Dei flores a crianças" (with the article: "às crianças").
- Between repeated words: "cara a cara", "gota a gota", "frente a frente".
- Before place names that do not take the article. Test with "venho de": "venho da Bahia" -> "Vou à Bahia"; "venho de Roma" -> "Vou a Roma". A modifier brings the article back: "Vou à Roma dos césares".
- Before "casa" (one's own home) and "terra" (dry land, as opposed to the sea) with no modifier: "Voltei a casa cedo", "Os marinheiros foram a terra". With a modifier crase returns: "Voltei à casa dos meus pais".

Optional (never flag): before a feminine singular possessive ("a minha mãe" or "à minha mãe"), before a woman's first name ("a Maria" or "à Maria"), and after "até" ("até a praia" or "até à praia").

Quick test: swap the feminine noun for a masculine one. If "ao" appears, the feminine takes crase ("vou ao mercado" -> "vou à feira").

### PT-AGR: agreement and impersonal verbs

| Case | Rule | Wrong -> right | Tier |
|------|------|----------------|------|
| "Haver" meaning exist or happen | impersonal, third person singular | "Haviam muitos problemas" -> "Havia muitos problemas"; "Houveram reuniões" -> "Houve reuniões" | error |
| "Haver" and "fazer" for elapsed time or weather | impersonal | "Fazem dois anos" -> "Faz dois anos" | error |
| Auxiliary with impersonal "haver" | the auxiliary stays singular | "Devem haver soluções" -> "Deve haver soluções"; "Vão haver reuniões" -> "Vai haver reuniões" | error |
| "Existir" | agrees with its subject | "Existe problemas" -> "Existem problemas" | error |
| Subject after the verb | the verb agrees with it | "Chegou as encomendas" -> "Chegaram as encomendas" | error |
| Compound subject before the verb | plural | "O pai e a mãe chegaram"; after the verb, agreement with the nearest noun is also accepted | error |
| "Mais de um" | singular | "Mais de um aluno faltou" | error |
| Synthetic passive with "se" | the verb agrees with the noun | "Vende-se casas" -> "Vendem-se casas"; "Aluga-se salas" -> "Alugam-se salas" | norm |
| Indeterminate subject with "se" (verb + preposition) | singular | "Precisa-se de funcionários"; "Trata-se de erros" (not "Tratam-se") | error |
| "A gente" | third person singular | "A gente vamos" -> "A gente vai" | error |
| Collective or partitive subject | singular, or plural with the partitive | "A maioria dos alunos chegou" and "chegaram": do not flag | n/a |
| "Meio" and "menos" | "meio" as adverb is invariable; "menos" is invariable | "ela está meia cansada" -> "meio cansada"; "menas" -> "menos"; numeral "meio" agrees: "meia hora", "meio-dia e meia" | error |
| "Anexo", "incluso", "obrigado", "mesmo", "próprio", "quite" | agree like adjectives | "Seguem anexas as planilhas"; "obrigada" said by a woman; "elas mesmas"; "em anexo" is invariable | error |
| "Bastante" | invariable as adverb, inflects as adjective | "elas estudam bastante"; "bastantes problemas" | error |
| Plural of nouns in "-ão" | follow the dictionary | cidadãos (not "cidadões"), alemães, capitães, órgãos; when the dictionary lists more than one plural (vulcões, vulcãos), do not flag | error |

### PT-REG: government (regência)

| Item | Rule | Example | Tier |
|------|------|---------|------|
| assistir (watch, attend) | indirect, with "a" | "Assisti o filme" -> "Assisti ao filme"; "assistir" meaning help is direct: "O médico assistiu o paciente" | norm |
| obedecer, desobedecer | indirect, with "a" | "Obedeço as regras" -> "Obedeço às regras" | norm |
| preferir | "preferir X a Y", no "mais" | "Prefiro café do que chá" -> "Prefiro café a chá"; "prefiro mais" -> "prefiro" | norm |
| aspirar (long for) | indirect, with "a" | "aspira um cargo" -> "aspira a um cargo"; "aspirar" meaning breathe in is direct | norm |
| implicar (entail) | direct | "implica em custos" -> "implica custos" | norm |
| precisar, gostar (relative clause) | the preposition goes before the relative | "O livro que preciso" -> "O livro de que preciso"; "precisar" + infinitive takes no preposition: "preciso sair" | norm |
| chegar, ir | "a" for destination | "Cheguei no escritório" -> "Cheguei ao escritório"; "Cheguei em casa" -> "Cheguei a casa" (no crase: own home) | norm |
| lembrar, esquecer | "lembrar algo" or "lembrar-se de algo" | "Lembrei de você" -> "Lembrei-me de você"; "Esqueci do nome" -> "Esqueci o nome" | norm |
| cujo | no article after it, and it agrees with what follows | "cujo o filho" -> "cujo filho" | error |
| onde / aonde | "aonde" with verbs of movement, "onde" for a fixed place | "Onde você vai?" -> "Aonde você vai?" (norm); "Aonde você está?" -> "Onde você está?" (error) | see example |
| visar (aim at) | with a noun, formal tradition prefers "a" ("visa ao lucro"); modern references accept the direct form; with an infinitive both are accepted | do not flag "visa melhorar"; "visa o lucro" is at most `style` | style |

### PT-VRB: verb and pronoun forms

| Wrong | Right | Note | Tier |
|-------|-------|------|------|
| "Se eu ver", "Quando ele ver" | "Se eu vir", "Quando ele vir" | future subjunctive of "ver" | error |
| "Se você manter" | "Se você mantiver" | future subjunctive of "manter" | error |
| "Se eu fazer" | "Se eu fizer" | | error |
| "Se ele dizer" | "Se ele disser" | | error |
| "Se eu propor" | "Se eu propuser" | | error |
| "Se ele ter" | "Se ele tiver" | | error |
| "Se ele intervir", "ele interviu" | "Se ele intervier", "ele interveio" | conjugated like "vir" | error |
| "Ele reaveu" | "Ele reouve" | conjugated like "haver" | error |
| "Seje", "esteje" | "Seja", "esteja" | | error |
| "Entre eu e você" | "Entre mim e você" | oblique pronoun after a preposition | error |
| "Para mim fazer" | "Para eu fazer" | "eu" is the subject of the infinitive | error |
| "Eu lhe vi" | "Eu o vi" | "lhe" is an indirect object only | norm |
| "Haja visto" | "Haja vista" | fixed expression | error |

### PT-HOM: homophones and near-words

| Pair | Rule |
|------|------|
| mau / mal | "mau" is the adjective, opposite of "bom"; "mal" is the adverb, opposite of "bem", and also the noun and the conjunction ("mal chegou, saiu") |
| mas / mais / más | "mas" contrast; "mais" quantity; "más" feminine plural of "mau" |
| a / há | "há" for elapsed time and for "exist" ("há dois anos", "há problemas"); "a" for future and distance ("daqui a dois anos", "a dois metros") |
| por que / porque / por quê / porquê | "por que" in direct and indirect questions and as "pelo qual"; "porque" for cause and explanation; "por quê" at the end of a sentence; "porquê" as a noun ("o porquê") |
| onde / aonde | fixed place / movement (see PT-REG) |
| acerca de / a cerca de / há cerca de | about / at a distance of about / about (elapsed time) |
| a fim de / afim | in order to / related, akin |
| de encontro a / ao encontro de | against, clashing with / toward, in agreement with |
| em vez de / ao invés de | "em vez de" = instead of; "ao invés de" = the opposite of; using "ao invés de" for a non-opposite is `norm` |
| tampouco / tão pouco | nor, neither / so little |
| demais / de mais | too much, the others / opposite of "de menos" |
| senão / se não | otherwise, except / if not |
| sob / sobre | under / over, about |
| eminente / iminente | distinguished / about to happen |
| concerto / conserto | musical performance or agreement / repair |
| descrição / discrição | description / discretion |
| ratificar / retificar | confirm / correct |
| comprimento / cumprimento | length / greeting, fulfilment |
| cessão / sessão / seção | transfer / meeting or showing / section ("secção" is also accepted) |
| tráfego / tráfico | flow of vehicles / trade, especially illegal |

### PT-ORT: common misspellings

`error`: excessão -> exceção; paralizar, paralização -> paralisar, paralisação; analizar -> analisar; beneficiente -> beneficente; previlégio -> privilégio; ítem -> item; concerteza -> com certeza; derrepente -> de repente; impecilho -> empecilho; reinvindicar -> reivindicar; advinhar -> adivinhar; asterístico -> asterisco; auto-estima -> autoestima; "a toa" -> "à toa".

`norm`: "a nível de" -> "em nível de" or "no nível de"; "de acordo a" -> "de acordo com".

`style`: "através de" for means -> "por meio de".

Not errors: regional words ("mexerica", "bergamota", "tangerina"), accepted variants listed in the dictionary ("loiro" and "louro", "cota" and "quota").

### PT-VRG: comma

Report a missing comma only where it is required, and a comma only where it is forbidden. Optional commas are never reported.

Required:

- Between items of a list, with no comma before the final "e": "ovos, leite e farinha". A comma before "e" is accepted when the subjects differ or when "e" is repeated for emphasis.
- Vocative: "Maria, venha cá." Apposition: "Ana, minha irmã, chegou."
- Explanatory relative clause, between commas: "Os alunos, que estudaram, passaram." (all of them passed) vs "Os alunos que estudaram passaram." (only those who studied). Adding or removing these commas changes meaning: report as `uncertain` unless the context settles it.
- Around a conjunction moved inside its clause: "A equipe, porém, aprovou."; around "isto é", "ou seja", "por exemplo" when inserted.
- Before "mas" opening a contrasting clause: "Choveu, mas saímos."
- Place before a date: "São Paulo, 12 de novembro de 2026."
- An omitted verb: "Eu estudo medicina; ele, direito."

Usual (a missing comma is at most `style`): after a long adverbial phrase or clause that opens the sentence ("Quando a reunião acabou, saímos.").

Forbidden:

- Between subject and verb: "Os alunos, chegaram" (unless an aside is set off by a pair of commas).
- Between a verb and its complement: "Comprei, um livro".
- Between a noun and its complement or restrictive modifier: "O diretor, da escola chegou".

Never add the English serial comma to a Portuguese list.

### PT-TIP: typography and numbers

- Decimal comma and thousands point: R$ 1.234,56; 3,5 km.
- Dates: 12/11/2026 or 12 de novembro de 2026. Months and weekdays are lowercase: "novembro", "segunda-feira".
- Time: "10h30", "10h", "às 8h". Not "10hs" and not "10:30hs".
- Unit symbols take no plural and no period: km, kg, m, h. "10%" and "10 %" both occur; follow the text's own choice.
- Ordinal indicators: 1º, 1ª (not the degree sign 1°). In dates, only the first day is ordinal: "1º de maio".
- Nationalities, languages and adjectives from proper nouns are lowercase: "brasileiro", "português".
- "e-mail", "internet", "site", "online" are the usual forms. Do not enforce one of several accepted variants; list an inconsistency inside the text as `style`.

## English rules

### EN-SPL: spelling

Common slips (wrong -> right): alot -> a lot; definately -> definitely; seperate -> separate; occured -> occurred; recieve -> receive; untill -> until; accomodate -> accommodate; occurence -> occurrence; embarass -> embarrass; wich -> which; adress -> address; begining -> beginning; goverment -> government; enviroment -> environment.

Variety: do not convert US and UK spellings. A mix inside one text is `style`.

### EN-WRD: confusions

| Pair | Rule |
|------|------|
| its / it's | "its" possessive; "it's" = it is or it has |
| your / you're | possessive / you are |
| their / there / they're | possessive / place or existence / they are |
| then / than | time or sequence / comparison |
| affect / effect | usually the verb / usually the noun |
| loose / lose | adjective / verb |
| who's / whose | who is / possessive |
| to / too / two | preposition / also or excessive / number |
| principle / principal | rule / main, head |
| complement / compliment | complete / praise |
| advice / advise | noun / verb |
| could of, should of | could have, should have |
| less / fewer | "fewer" with countable nouns; "less" with countable nouns is `norm` |

### EN-GRM: grammar

- Subject-verb agreement ("The results are", "Each of the items is"). Collective nouns: "The team is" (US) and "The team are" (UK) are both accepted; do not flag. "Data is" and "data are" are both accepted.
- Pronoun case: "between you and I" -> "between you and me" (`error`); "me and him went" -> "he and I went" (`norm`). "Who/whom" is `style` outside formal text.
- Articles: "a" before a consonant sound, "an" before a vowel sound ("an hour", "a university").
- Comma splices: "It was late, we left." -> "It was late, so we left." or "It was late; we left." (`norm`; deliberate in fiction and dialogue). Fragments are `style`.
- Dangling modifiers: "Walking to the shop, the rain started." Report as `uncertain` with the options, since the repair needs a subject the text may not name.
- Tense shifts inside a paragraph: `style` unless clearly wrong.

### EN-PUN: punctuation and capitalization

- Apostrophe for possession and contraction, never for plurals ("apple's" -> "apples"; "the 1990s", not "1990's").
- A comma before a coordinating conjunction joining two long independent clauses is usual; its absence in short clauses is not reported.
- The serial (Oxford) comma is house style. Never add or remove it; report an inconsistency as `style`.
- Compound modifiers before a noun take a hyphen: "a well-known author", "a ten-minute walk". Not after an "-ly" adverb ("a highly paid role").
- Capitalization: days, months, languages and nationalities are capitalized in English (unlike pt-BR). Capitalize "I".

## Guardrails specific to correction

1. Proper nouns, brand spellings and product names keep their form, even when they look wrong ("iPhone", "eBay", "Müller", "de Souza").
2. Quotations keep their original text. If a quoted error matters to the reader, say so in the list and leave it; the user decides whether to add a marker such as "[sic]".
3. Code, identifiers, commands, URLs, paths, e-mail addresses, numbers and data are never touched.
4. Titles of books, films and works keep their spelling and capitalization.
5. Colloquial forms ("pra", "né", "tá", "cê") are `style` in informal text and `norm` in formal text; never `error`.
6. A fix that changes meaning is `uncertain`, not `error`.
7. Do not rewrite for style. A correct but heavy sentence is left for Rewrite mode.
8. Idiomatic or archaic usage that a reference dictionary accepts stays.
9. After applying fixes, re-read the corrected text once. A fix that introduced a new error goes back to the list.

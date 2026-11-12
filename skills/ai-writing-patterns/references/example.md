# Example

The same short passage before and after a rewrite pass, then a pt-BR rewrite and two corrections. The facts do not change; only the patterns and the errors leave.

## Rewrite (English)

### Before

Great question! Here is the summary.

The data migration, started in 2023, marks a turning point in how the company handles records. It is not just about moving rows; it is about trust. The platform serves as a central hub for three departments, ensuring that every table stays aligned, reflecting the broader trend toward consolidation. I hope this helps! :contentReference[oaicite:0]{index=0}

### After

The data migration started in 2023. The platform now holds the records of three departments and keeps their tables aligned.

### Patterns addressed

P21 and P19 (opening praise, closing line), P19b (provider markup), P01 ("turning point"), P09 and P26 (the "not just ... it is about trust" contrast), P08 and P30 ("serves as a central hub"), P03 (trailing "ensuring ... reflecting").

### Facts preserved

The 2023 start (sentence 1 of the original), the three departments and the aligned tables (sentence 3). "Trust" and "consolidation" were claims with no fact behind them; they were cut, not replaced.

## Rewrite (pt-BR)

### Before

Ótima pergunta! Vamos mergulhar no assunto.

A migração de dados, iniciada em 2023, não é apenas uma mudança técnica, mas também uma jornada rumo à excelência. Ademais, a plataforma atua como um ponto central para três áreas, destacando a importância da integração e reforçando o compromisso com a qualidade. Espero ter ajudado!

### After

A migração de dados começou em 2023. A plataforma atende três áreas.

### Patterns addressed

P21 ("Ótima pergunta!"), P39 ("Vamos mergulhar no assunto"), P19 ("Espero ter ajudado!"), P09 ("não é apenas ... mas também"), P24 ("jornada rumo à excelência"), P07 ("ademais"), P08 ("atua como um ponto central"), P03 (the gerund chain "destacando ... e reforçando").

### Facts preserved

The 2023 start (sentence 2 of the original) and the three areas served by the platform (sentence 3). "Integração" and "qualidade" were claims with no fact behind them and were cut. The result is short because the original was thin.

## Correction (pt-BR)

### Input

Register: formal (meeting minutes).

```
1  A reunião foi adiada para às 14h por que o diretor não chegou.
2  Haviam muitos pontos a resolver, mas a equipe, aprovou a idéia.
3  O pessoal prefere dados do que opiniões. Fomos a escola.
4  Ele disse: "Houveram erros no sistema."
```

### Output

```
L1  PT-CRA  [error]  "para às 14h"          -> "para as 14h"          no crase after another preposition
L1  PT-HOM  [error]  "por que o diretor"    -> "porque o diretor"     cause, one word
L2  PT-AGR  [error]  "Haviam muitos pontos" -> "Havia muitos pontos"  "haver" meaning "exist" is impersonal
L2  PT-VRG  [error]  "a equipe, aprovou"    -> "a equipe aprovou"     no comma between subject and verb
L2  PT-ACC  [error]  "idéia"                -> "ideia"                no accent on the open diphthong "ei" in a paroxytone
L3  PT-REG  [norm]   "prefere dados do que" -> "prefere dados a"      "preferir X a Y"
L3  PT-CRA  [error]  "Fomos a escola"       -> "Fomos à escola"       "ir a" + feminine noun with article

Left alone: L4 quotation ("Houveram erros no sistema." has an agreement error, but it is a direct quote and stays as written)
Uncertain:  none
Summary:    error 6, norm 1, style 0, uncertain 0 | families: PT-CRA 2, PT-HOM 1, PT-AGR 1, PT-VRG 1, PT-ACC 1, PT-REG 1
```

With `--apply` (formal register, so the `norm` fix is applied too):

```
1  A reunião foi adiada para as 14h porque o diretor não chegou.
2  Havia muitos pontos a resolver, mas a equipe aprovou a ideia.
3  O pessoal prefere dados a opiniões. Fomos à escola.
4  Ele disse: "Houveram erros no sistema."
```

## Correction (English)

### Input

```
1  Its important to recieve the report before friday.
2  The team are ready, and they're plan is simple.
```

### Output

```
L1  EN-WRD  [error]  "Its important"  -> "It's important"   contraction of "it is"
L1  EN-SPL  [error]  "recieve"        -> "receive"          spelling
L1  EN-PUN  [error]  "friday"         -> "Friday"           days are capitalized in English
L2  EN-WRD  [error]  "they're plan"   -> "their plan"       possessive

Left alone: L2 "The team are" (collective agreement accepted in UK usage)
Uncertain:  none
Summary:    error 4, norm 0, style 0, uncertain 0 | families: EN-WRD 2, EN-SPL 1, EN-PUN 1
```

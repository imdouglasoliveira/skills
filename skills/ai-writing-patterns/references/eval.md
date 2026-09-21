# Eval

Run these checks before delivering a rewrite. They are grouped by axis. A failed check sends the text back to the rewrite step; it is not a note for later.

## Axis 1: Facts

1. Every number, study name or source in the final text was already in the original or is cited in the text itself.
2. No new entity, date, place or quantity was introduced during the rewrite.
3. Where the original was vague, the rewrite is shorter rather than more specific.
4. Names of people and organizations keep the spelling of the original.

## Axis 2: Patterns

5. No `high` pattern from `catalog.md` remains. If one was found in detect mode, it is gone.
6. Provider markup, tracked links and placeholders are removed, not rephrased.
7. Chatbot lines are gone. The text opens on the subject, not on the conversation.
8. Decorative bold, emoji and curly quotes are used only where they carry meaning.

## Axis 3: Tone

9. The text does not praise the reader or the question.
10. The closing line states a fact or a decision. It does not turn into a metaphor.
11. No sentence announces that the writer is about to be honest or direct.
12. The text does not claim to know how the reader will feel.

## Axis 4: Format

13. Headings use sentence case.
14. Lists have a reason to be lists; a single sentence is not split into bullets.
15. The final line is the last action or number, not a summary of the summary.

## Reporting

For a rewrite, report the patterns that were addressed and, for each preserved fact, where it came from. For detect mode, report only the pattern, the line and the excerpt.

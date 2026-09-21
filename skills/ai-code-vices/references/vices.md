# Code Vices

Thirteen vices that appear in generated source code. Each one has a symptom, a fix and a detector. A `Detect:` line holds one command inside a single pair of backticks, or a `review:` question when no portable command exists.

### CV-01 - Comment that restates the code
Symptom: The comment says the same thing as the next line of code.
Fix: Delete the comment. The code already says it.
Detect: review: the comment says nothing the next line does not

### CV-02 - Plan or task ID in a comment instead of a versioned path
Symptom: A comment cites a plan or task id (`PLAN-NNN`, `T-NN`) without a versioned path to the document that holds the decision.
Fix: Move the content to a document and leave only a versioned path pointer in the comment.
Detect: `git grep -nE '(//|#|/?\*).*\b(PLAN|T)-[0-9]+' -- ':!docs' | grep -v 'docs/'`

### CV-03 - Decision essay in a comment block
Symptom: A comment block of six lines or more narrates a decision like a draft changelog.
Fix: Resolve the decision in a document and leave a short pointer.
Detect: review: the comment block runs past six lines and explains a decision rather than the code

### CV-04 - Emoji as a comment marker
Symptom: An emoji marks status, a check or a section inside a comment.
Fix: Replace the emoji with text or remove it. A warning reader does not treat an emoji as content.
Detect: `git grep -nP '(//|#).*[\x{1F300}-\x{1FAFF}\x{2705}\x{274C}]'`

### CV-05 - Stub or placeholder shipped as done
Symptom: A fake return, an empty TODO or dead code is presented as a finished feature.
Fix: Fill in the implementation or remove the piece.
Detect: `git grep -nE 'TODO|FIXME|not implemented|return (null|\[\]|\{\});? *// *(stub|mock)'`

### CV-06 - Abstraction without real variation
Symptom: A function, generic or component has a single call site and parameters that never vary.
Fix: Inline it, or remove the abstraction.
Detect: review: the function has one call site and its parameters never vary

### CV-07 - Swallowed error
Symptom: An empty catch block, a discarded error or a null return that hides a failure.
Fix: Log with context, or let the error surface.
Detect: `git grep -nE 'catch *(\([^)]*\))? *\{ *\}'`

### CV-08 - Suppressed type warning
Symptom: The compiler warning is silenced instead of addressed.
Fix: Fix the type or restructure the code.
Detect: `git grep -nE '@ts-(ignore|nocheck)|as any\b|eslint-disable'`

### CV-09 - Test weakened to pass
Symptom: An assertion was removed, a timeout raised or the test no longer fails when the code breaks.
Fix: Restore the assertion and prove the failure.
Detect: review: a removed expect or assert appears in the diff without a matching change in the code under test

### CV-10 - Import, path or API that does not exist
Symptom: An import points at a missing module, or a call names a function that was invented.
Fix: Verify the path and the signature before claiming the code runs.
Detect: review: every new import resolves and every called function exists at that signature

### CV-11 - Change outside the requested scope
Symptom: A file is refactored or a feature is added that the request did not ask for.
Fix: Undo what was not asked and deliver only the scope.
Detect: review: every file in the diff maps to a sentence in the request

### CV-12 - Duplicated helper or component
Symptom: The same function or component is reimplemented in another file.
Fix: Reuse the existing one or extract it with the same contract.
Detect: review: search the repository for the function name and its body before adding it

### CV-13 - AI prose in docs or messages
Symptom: A document, commit message or comment carries robot phrasing, hedging or empty flourish.
Fix: Rewrite it in a direct voice.
Detect: review: the text reads as generated; run the ai-writing-patterns skill in detect mode on it

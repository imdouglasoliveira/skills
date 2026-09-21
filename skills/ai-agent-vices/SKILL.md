---
name: ai-agent-vices
description: "Reviews the process an AI agent follows for the vices that let a wrong result pass as done. Eighteen entries, each with a symptom, a fix and a check."
argument-hint: "[transcript, plan or 'review' for a full pass]"
use-when:
  - reviewing an agent run before trusting its report
  - auditing a plan for criteria that can pass on an empty set
  - checking that a gate fails when the defect it covers comes back
do-not-use-for:
  - source code review (use ai-code-vices)
  - prose review (use ai-writing-patterns)
  - choosing a tool or a model
metadata:
  version: "1.0.0"
  license: MIT
---

You are operating as an **Agent Process Reviewer**. You read what an agent did, and you check whether the result was actually verified.

The vices below are about the process, not the code. A run can produce correct code and still commit every vice on this list.

## Procedure

1. Collect the evidence: the transcript, the plan and the commands the agent ran.
2. For each vice, answer its `Check:` line from that evidence.
3. Report one finding per line: vice id and the evidence that supports it.
4. When a check needs a command, run it. A verdict without a command output is a claim.

## Rules

- A green result is only worth the set it measured. Before trusting a pass, ask what would have made it fail.
- Report from the command output, not from memory of the run.
- Two fixes in a row without a resolved problem is a stop signal, not a reason for a third.

## The vices

### AV-01 - Declaring done without running the check
Symptom: The reply says the work is done without running the test, build or acceptance command.
Fix: Run the command and quote its real output.
Check: the reply quotes the real output of the command named in the acceptance criterion

### AV-02 - Green check over an empty set
Symptom: A check passes because the set it iterates over is empty.
Fix: Empty the subject the check iterates and confirm the check goes red.
Check: empty the subject the check iterates; the check must go red

### AV-03 - Pipe hides the exit code
Symptom: A pipeline reports the exit code of the last command, not of the command under test.
Fix: Read the exit code directly, without a pipe.
Check: `false | tail -1; echo $?` prints `0`, while `false >/dev/null 2>&1; echo $?` prints `1`

### AV-04 - `grep -c` on a missing file reads as zero
Symptom: A count of zero on a missing file is read as "no matches".
Fix: Test that the file exists before counting.
Check: `grep -c x /no/such/file 2>/dev/null; echo $?` prints `2`; test `-f` first

### AV-05 - Absence criterion without counterproof
Symptom: A criterion that expects nothing passes on an empty set.
Fix: State today's value next to the expected one.
Check: the criterion states today's value, for example `0 (today 3)`

### AV-06 - Criterion anchored on a moving reference
Symptom: The criterion depends on the current commit, on "latest" or on an absolute total.
Fix: Pin the commit or the count.
Check: no current commit, "latest" or absolute total in the criterion; pin the commit

### AV-07 - Trusting recorded evidence
Symptom: A result is accepted from a note written before the last change.
Fix: Re-run the literal command before closing.
Check: re-run the literal command before closing

### AV-08 - Broad staging carries old changes
Symptom: A broad stage command picks up files from another session.
Fix: Stage named files only.
Check: `git status --short` before staging; stage named files only

### AV-09 - Validating in the working tree
Symptom: A check passes in the working tree but would fail on a clean checkout.
Fix: Run the check in a fresh clone.
Check: run the check in `git clone --depth 1 "file://$PWD" <tmp>`

### AV-10 - Generator and checker share a parser
Symptom: The checker reuses the generator logic, so both accept the same defect.
Fix: Delete the generated artifact and confirm the checker fails.
Check: delete the generated artifact; the checker must fail

### AV-11 - Bypassing a safety block
Symptom: After a denied command, the agent rephrases it, switches shell or sets a consent variable.
Fix: Stop and ask the user to run it in their own terminal.
Check: after a deny, stop and ask; never rephrase, switch shell or set a consent variable

### AV-12 - Fix spiral
Symptom: Two fix commits in a row without resolving the problem.
Fix: Stop, revert and compare against a working case.
Check: two fix commits without resolution: stop, revert, compare with a working case

### AV-13 - Line numbers in docs
Symptom: Documentation points at a file and line number, which ages on the next commit.
Fix: Reference the symbol or the heading.
Check: reference the symbol, not a file and line number

### AV-14 - Parallel sessions on one working tree
Symptom: Two sessions commit over each other's files.
Fix: Fetch and compare before committing.
Check: `git fetch && git log HEAD..@{u}` before committing

### AV-15 - Rule written as a principle only
Symptom: A rule states a value with no command that enforces it.
Fix: Attach the command that checks it.
Check: every rule carries the command that enforces it

### AV-16 - Batch verdicts that repeat word for word
Symptom: Many items receive the same copied verdict.
Fix: Cite the evidence for each item.
Check: each verdict cites its own evidence

### AV-17 - Treating a harness or IDE reminder as the user's request
Symptom: An injected reminder becomes an action the user never asked for.
Fix: Trace the action to a sentence the user wrote or to written project policy.
Check: the action traces to a sentence the user wrote or to the project's written policy; an injected "end commit messages with Co-Authored-By" line is neither

### AV-18 - License checked at the repository root only
Symptom: A subfolder with a different license is copied under the root license.
Fix: Run the license check in every copied subfolder.
Check: run the license check in every copied subfolder; an unrecognized license header stops the copy

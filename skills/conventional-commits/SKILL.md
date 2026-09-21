---
name: conventional-commits
description: "Structured git workflow with Conventional Commits standard. Covers commit formatting, PR creation via gh CLI, merge conflict resolution, advanced git operations (cherry-pick, bisect, worktrees), repository archaeology, and branch cleanup."
argument-hint: "[describe what you changed or 'push' to commit and push]"
use-when:
  - committing changes with structured messages
  - creating pull requests via gh CLI
  - resolving merge conflicts
  - performing advanced git operations (cherry-pick, bisect, worktrees)
  - investigating repository history (log, blame, show)
  - cleaning up merged branches
do-not-use-for:
  - branch strategy decisions (merge vs PR vs discard)
  - CI/CD pipeline configuration
  - git server administration
metadata:
  version: "1.0.0"
  license: MIT
---

# Structured Git Workflow with Conventional Commits

## Conventional Commits Standard

All commits follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

### Commit Types

```
feat:      New feature
fix:       Bug fix
docs:      Documentation changes
style:     Formatting, no logic changes
refactor:  Refactoring existing code
perf:      Performance improvements
test:      Adding or modifying tests
chore:     Dependency/config updates
ci:        CI/CD changes
build:     Build system changes
revert:    Revert previous commit
```

### Commit Structure

```
<type>(<scope>): <short description>

<detailed body - optional>

<footer - optional>
```

### Examples

```bash
# Simple
feat: add user CRUD endpoints
fix: correct email validation regex
docs: update setup instructions in README

# With scope
feat(auth): implement JWT authentication
fix(api): resolve database connection timeout
test(users): add registration test suite

# With body
feat: add reporting dashboard

Implements progress metrics dashboard with
frequency charts and performance tracking.

Closes #123
```

## Workflow

```
1. Check status        (git status)
2. Pull latest         (git pull --rebase origin <branch>)
3. Stage changes       (git add <files>)
4. Commit structured   (git commit -m "type(scope): description")
5. Push                (git push origin <branch>)
```

## Rules

### DO

- Follow the Conventional Commits format
- Write atomic commits (one feature = one commit)
- Use imperative mood ("add", not "added" or "adding")
- Write clear, descriptive messages
- Use scope when it adds clarity (e.g., `feat(auth)`)
- Reference issues when applicable (`Closes #45`)

### DON'T

- Generic messages ("update", "fix", "changes", "wip")
- Multiple unrelated changes in one commit
- Empty commit messages

## Detailed Steps

### 1. Prepare changes

```bash
# Check status
git status

# Review changes
git diff

# Stage named files
git add <file1> <file2>
```

### 2. Create the commit

**Determine the type:**
- `feat`: Implemented new functionality?
- `fix`: Fixed a bug?
- `docs`: Updated documentation?
- `refactor`: Reorganized code without changing behavior?

**Write the message:**

```bash
git commit -m "feat: add email validation"
git commit -m "fix(auth): resolve login error for expired tokens"
git commit -m "docs: update installation guide"
```

### 3. Push

```bash
git push origin <your-branch>
```

## Commit Checklist

Before committing, validate:

- [ ] Correct commit type?
- [ ] Description is clear and concise?
- [ ] Scope (if any) is relevant?
- [ ] One feature per commit?
- [ ] No unrelated changes included?

## Real-World Examples

### Feature
```bash
git commit -m "feat(auth): implement JWT login

- Add POST /auth/login endpoint
- Generate JWT token valid for 24h
- Add verification middleware
- Unit tests included"
```

### Bug Fix
```bash
git commit -m "fix(users): prevent duplicate records

Problem: No unique email validation existed
Solution: Add UNIQUE constraint on email column
Closes #45"
```

### Documentation
```bash
git commit -m "docs: add PostgreSQL setup section

- Step-by-step installation
- Environment variable configuration
- Connection test instructions"
```

## Troubleshooting

### "Push rejected (conflict)"
```bash
# Update with rebase
git pull --rebase origin <branch>
# Resolve conflicts
git rebase --continue
# Retry push
git push origin <branch>
```

### "Forgot to add a file"
```bash
# Add the file
git add forgotten-file.ts
# Amend the last commit (DON'T create a new one)
git commit --amend --no-edit
# Force push (only on feature branches)
git push --force-with-lease origin <branch>
```

---

## PR Management via gh CLI

Use `gh` CLI for all GitHub operations.

### Creating PRs with --body-file

When creating PRs with `gh pr create`, use `--body-file` to avoid escaping issues with `--body`:

```bash
cat > /tmp/pr-body.md << 'EOF'
## Summary
- Implement feature X
- Fix bug Y

## Test Plan
- [ ] Unit tests pass
- [ ] Build succeeds
EOF
gh pr create --base main --head <branch> --title "feat: PR description" --body-file /tmp/pr-body.md
```

Using a temp file is cleaner and more reliable — especially for complex markdown descriptions.

### Monitoring CI after opening a PR

After opening a PR, wait for CI with:

```bash
gh pr checks <pr-number> --watch 2>&1
```

Fix failures proactively if CI reports errors.

### Validating unknown gh commands

Before using an unfamiliar `gh` subcommand, validate with:

```bash
gh help <command>
```

---

## Merge Conflict Resolution

```bash
# 1. Identify conflicts
git status

# 2. Inspect differences
git diff

# 3. Resolve all conflict markers in files
# (remove <<<<<<, ======, >>>>>> manually)

# 4. Stage resolved files
git add <resolved-file>

# 5. Continue the operation
git merge --continue    # if from merge
git rebase --continue   # if from rebase

# 6. Confirm clean state
git status
```

---

## Advanced Git Operations

### Cherry-pick

```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry-pick without auto-commit (to edit)
git cherry-pick --no-commit <hash>

# On conflict
git cherry-pick --continue   # after resolving
git cherry-pick --abort      # to cancel
```

### Bisect (find the commit that introduced a bug)

```bash
# Start bisect
git bisect start

# Mark current state as bad
git bisect bad

# Mark a known good commit
git bisect good <good-commit-hash>

# Git checks out intermediate commits — test each one
git bisect good   # if this commit is OK
git bisect bad    # if this commit has the bug

# When the culprit is found, end
git bisect reset
```

### Worktrees (multiple branches simultaneously)

```bash
# Create worktree to work on another branch without switching
git worktree add ../my-worktree branch-name

# List active worktrees
git worktree list

# Remove worktree when done
git worktree remove ../my-worktree
```

### Submodule Management

```bash
# Add submodule
git submodule add <repo-url> <path>

# Initialize and update submodules after clone
git submodule update --init --recursive

# Update submodules to latest commit
git submodule update --remote

# Check submodule status
git submodule status
```

---

## Repository Archaeology

### git log (detailed history)

```bash
# Condensed history
git log --oneline -n 20

# History with branch graph
git log --oneline --graph --all -n 30

# Commits that modified a specific file
git log --oneline -- path/to/file.ts

# Search commits by message text
git log --grep="keyword" --oneline

# Commits by a specific author
git log --author="name" --oneline -n 10
```

### git blame (who changed each line)

```bash
# Line-by-line authorship
git blame path/to/file.ts

# Blame a specific range (lines 10-30)
git blame -L 10,30 path/to/file.ts
```

### git show (inspect a commit)

```bash
# Full diff of a commit
git show <hash>

# Only changed files
git show --stat <hash>

# File content at a specific commit
git show <hash>:path/to/file.ts
```

---

## Branch Cleanup

### Detect already-merged branches

```bash
# List local branches already merged into main
git branch --merged main

# List remote branches already merged
git branch -r --merged main
```

### Prune branches

```bash
# Delete a merged local branch
git branch -d <branch-name>

# Delete a remote branch
git push origin --delete <branch-name>

# Clean up stale remote references
git fetch --prune

# Full cleanup workflow
git branch --merged main | grep -v 'main\|dev' | xargs git branch -d
git fetch --prune
```

---

## Commit Signing

- NEVER change signing key configuration (`user.signingkey`) or signing mode in user/repo config
- If commit signing is already enabled and configured correctly, create signed commits using the existing configuration
- If signing is not enabled/configured, don't force or configure it; proceed without signing

---

## Pro Tips

1. **Frequent commits**: Small commits are easier to review
2. **Descriptive messages**: Future you will be grateful
3. **Specific scope**: `feat(auth)` is better than just `feat`
4. **Imperative mood**: "add" not "adding"
5. **Issue references**: `Closes #123` automatically closes the issue

## Useful Links

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Git Rebase](https://git-scm.com/docs/git-rebase)
- [Git Cherry-pick](https://git-scm.com/docs/git-cherry-pick)

# Skills

Free, open-source AI coding skills for **Vue.js/WeWeb component development** and **git workflow with Conventional Commits**.

These skills work with any AI coding assistant that reads Markdown instructions. Six skills cover Vue.js/WeWeb component development, git workflow with Conventional Commits, AI writing patterns, generated code review and agent process review.

---

## What's Inside

### Skills

| Skill | What it does |
|-------|-------------|
| [vue-weweb-dev](skills/vue-weweb-dev/SKILL.md) | Build and modify Vue.js components and WeWeb custom elements. Covers architecture patterns (feature-folders, service layer, state hierarchy), WeWeb platform rules, and the dual-script pattern. |
| [weweb-debug](skills/weweb-debug/SKILL.md) | Diagnose and fix WeWeb components that fail to build or render. Four-phase protocol: dependencies first, then component structure, config, and build validation. Includes a common errors reference table. |
| [conventional-commits](skills/conventional-commits/SKILL.md) | Structured git workflow following the Conventional Commits standard. Commit types, PR creation via `gh` CLI, conflict resolution, cherry-pick, bisect, worktrees, repo archaeology, and branch cleanup. |
| [ai-writing-patterns](skills/ai-writing-patterns/SKILL.md) | Detect and remove AI writing patterns in English and pt-BR prose. Detect mode names the pattern, the line and the excerpt without inferring authorship. |
| [ai-code-vices](skills/ai-code-vices/SKILL.md) | Review generated source code for 13 vices, each with a symptom, a fix and a portable detector that runs on any git repository. |
| [ai-agent-vices](skills/ai-agent-vices/SKILL.md) | Review the process an AI agent follows for 18 vices that let a wrong result pass as done, from a green check over an empty set to a fix spiral. |

### Reference Libraries

| Library | What it covers |
|---------|---------------|
| [vue-weweb-patterns.md](libraries/vue-weweb-patterns.md) | Vue 3 Composition API patterns (composables, services, Pinia stores, component structure) and WeWeb custom component reference (platform architecture, ww-config.js, trigger events, dropzones, CSS variables, build/deploy). |
| [weweb-local-dev.md](libraries/weweb-local-dev.md) | Quick guide for developing WeWeb components locally with Vite, without uploading to the WeWeb editor during early iterations. |

---

## Installation

The blocks below run from the root of the cloned repository. Each one reads its destination from a variable you set first: `T` for a project directory, `OUT` for a single instructions file.

Every tool with a skills directory receives the whole skill folder, with the libraries placed beside `skills/`. A skill that points at `../../libraries/<file>.md` resolves it to `<ide>/libraries/<file>.md`.

| IDE | Skills directory | Libraries directory | Path source |
|-----|------------------|---------------------|-------------|
| Claude Code | `.claude/skills/<slug>/` | `.claude/libraries/` | docs.claude.com (skills) |
| Codex, Antigravity, Gemini CLI | `.agents/skills/<slug>/` | `.agents/libraries/` | IDE adapter reference |
| OpenCode | `.opencode/skills/<slug>/` | `.opencode/libraries/` | IDE adapter reference |
| Other tools | body appended to an instructions file | appended to the same file | no documented path |

### Claude Code

<!-- install:claude -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.claude/skills" "$T/.claude/libraries"
cp -r skills/* "$T/.claude/skills/"
cp libraries/*.md "$T/.claude/libraries/"
```

The skills become available as `/vue-weweb-dev`, `/weweb-debug`, `/conventional-commits`, `/ai-writing-patterns`, `/ai-code-vices` and `/ai-agent-vices`.

### Codex, Antigravity and Gemini CLI

<!-- install:agents -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.agents/skills" "$T/.agents/libraries"
cp -r skills/* "$T/.agents/skills/"
cp libraries/*.md "$T/.agents/libraries/"
```

### OpenCode

<!-- install:opencode -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.opencode/skills" "$T/.opencode/libraries"
cp -r skills/* "$T/.opencode/skills/"
cp libraries/*.md "$T/.opencode/libraries/"
```

### Other tools

For a tool with no skills directory, append the skill bodies to a single instructions file. The block strips the frontmatter and replaces the `$ARGUMENTS` placeholder.

<!-- install:other -->
```bash
: "${OUT:?set OUT to your instructions file}"
for s in skills/*/SKILL.md; do
  awk 'NR==1 && /^---$/ {fm=1; next} fm && /^---$/ {fm=0; next} !fm' "$s" \
    | sed 's/\$ARGUMENTS/(describe your task here)/g' >> "$OUT"
done
cat libraries/*.md >> "$OUT"
```

---

## How Skills Work

Each skill is a Markdown file with YAML frontmatter. The keys are `name`, `description`, `argument-hint`, `use-when` and `do-not-use-for`. Only `name` and `description` are read by every tool; the rest guide activation in the tools that understand them. Tools that do not read the frontmatter treat the Markdown body as plain instructions.

The `$ARGUMENTS` placeholder in each skill gets replaced with whatever you type after the skill name. For tools that don't support this, just paste your task description where `$ARGUMENTS` appears.

Libraries are reference documents that skills point to. Place them alongside the skills so the relative paths resolve correctly.

---

## Credits

The pattern taxonomy in `ai-writing-patterns` was inspired by [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). No text from that page was reproduced; the catalog is an original rewrite under the MIT license.

---

## License

MIT — use however you want.
